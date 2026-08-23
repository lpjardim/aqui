"use client";

import Script from "next/script";
import { useMarketingConsentGranted } from "@/lib/meta/use-marketing-consent";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
    _fbq?: unknown;
  }
}

/**
 * Carrega o Pixel da Meta (`fbevents.js`) só depois de consentimento de
 * marketing — nunca antes. Não importa `track-client.ts`/
 * `use-fire-meta-event.ts` de propósito (evitaria uma dependência circular,
 * já que esses módulos importam `fireMetaPixelEvent` daqui) — quem dispara o
 * `PageView` é o componente irmão `MetaPageView` (ver mais abaixo), montado
 * junto deste no layout.
 */
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const granted = useMarketingConsentGranted();

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
  eventName: "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase" | "Subscribe",
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
