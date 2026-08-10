"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  CONSENT_COOKIE,
  CONSENT_DENIED,
  CONSENT_GRANTED,
  CONSENT_MAX_AGE_SECONDS,
} from "@/lib/consent-constants";

/** Disparado sempre que a escolha muda — o Pixel (`src/lib/meta/pixel.tsx`) ouve isto para ligar/desligar sem recarregar a página. */
export const CONSENT_CHANGED_EVENT = "aqui:consent-changed";

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
 * Lê a cookie de consentimento como "external store" (`useSyncExternalStore`)
 * em vez de a copiar para `useState` dentro de um `useEffect` — evita o
 * flash de hidratação (server nunca vê cookies) e o padrão desaconselhado de
 * `setState` síncrono dentro de um efeito.
 */
function useConsentCookie(): string | null {
  return useSyncExternalStore(subscribeToConsentChanges, readConsentCookie, getServerConsentSnapshot);
}

export function writeConsentCookie(value: typeof CONSENT_GRANTED | typeof CONSENT_DENIED): void {
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
}

export function clearConsentCookie(): void {
  document.cookie = `${CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: null }));
}

export function CookieBanner() {
  const consent = useConsentCookie();
  const visible = consent === null;

  const decide = useCallback((value: typeof CONSENT_GRANTED | typeof CONSENT_DENIED) => {
    writeConsentCookie(value);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Preferências de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/98 p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur"
    >
      <div className="container-page flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[13px] leading-relaxed text-muted">
          Usamos cookies essenciais para o site funcionar. Com a sua autorização, usamos também
          cookies de marketing (Meta) para medir e melhorar os nossos anúncios. Pode mudar de
          ideias a qualquer momento em{" "}
          <a href="/cookies" className="underline underline-offset-2">
            Cookies
          </a>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <Button variant="outline" size="md" onClick={() => decide(CONSENT_DENIED)}>
            Rejeitar
          </Button>
          <Button variant="primary" size="md" onClick={() => decide(CONSENT_GRANTED)}>
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
