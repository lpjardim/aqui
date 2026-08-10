"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { CONSENT_CHANGED_EVENT } from "@/components/consent/cookie-banner";
import { CONSENT_COOKIE, CONSENT_GRANTED } from "@/lib/consent-constants";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    _fbq?: unknown;
  }
}

function readConsentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function subscribeToConsentChanges(callback: () => void): () => void {
  window.addEventListener(CONSENT_CHANGED_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, callback);
}

function getServerConsentSnapshot(): string | null {
  return null;
}

/**
 * Carrega o Pixel da Meta (`fbevents.js`) só depois de consentimento de
 * marketing — nunca antes. Não chama `fbq('track', 'PageView')` automático:
 * só disparamos os 4 eventos pedidos (ViewContent, InitiateCheckout,
 * Purchase, Subscribe), nunca PageView, que não tem utilidade para o funil
 * da Aqui. e não foi pedido.
 */
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const consent = useSyncExternalStore(subscribeToConsentChanges, readConsentCookie, getServerConsentSnapshot);
  const granted = consent === CONSENT_GRANTED;

  if (!pixelId || !granted) return null;

  return (
    <Script id="meta-pixel-base" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
      `}
    </Script>
  );
}

/**
 * Dispara um evento standard no Pixel já carregado, com o `eventID`
 * partilhado com a chamada equivalente da Conversions API (deduplicação).
 * Não faz nada se o Pixel ainda não estiver pronto (sem consentimento, ou
 * script ainda a carregar) — nunca lança.
 */
export function fireMetaPixelEvent(
  eventName: "ViewContent" | "InitiateCheckout" | "Purchase" | "Subscribe",
  params: Record<string, unknown> | undefined,
  eventId: string,
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", eventName, params ?? {}, { eventID: eventId });
  } catch {
    // Nunca deixar uma falha de tracking partir a UI.
  }
}
