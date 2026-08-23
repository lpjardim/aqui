"use client";

import { useSyncExternalStore } from "react";
import { CONSENT_CHANGED_EVENT, CONSENT_COOKIE, CONSENT_GRANTED } from "@/lib/consent-constants";

/**
 * Único sítio que lê a cookie `aqui_consent` no browser — antes havia esta
 * mesma lógica duplicada em `pixel.tsx` e `cookie-banner.tsx`. Consolidado
 * aqui para nunca haver risco de as duas cópias divergirem silenciosamente.
 */
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

/** `true` assim que houver consentimento de marketing — reage a mudanças em tempo real (banner/gerir preferências), sem recarregar a página. */
export function useMarketingConsentGranted(): boolean {
  const consent = useSyncExternalStore(
    subscribeToConsentChanges,
    readConsentCookie,
    getServerConsentSnapshot,
  );
  return consent === CONSENT_GRANTED;
}
