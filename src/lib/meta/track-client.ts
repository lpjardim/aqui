import { fireMetaPixelEvent } from "@/lib/meta/pixel";
import { CONSENT_COOKIE, CONSENT_GRANTED } from "@/lib/consent-constants";
import type { MetaCustomData } from "@/lib/meta/capi";

export type ClientMetaEvent = "PageView" | "ViewContent" | "InitiateCheckout";

function currentConsentState(): "granted" | "denied" | "unknown" {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  if (!match) return "unknown";
  return decodeURIComponent(match[1]) === CONSENT_GRANTED ? "granted" : "denied";
}

/** `console.debug` só em desenvolvimento — nunca em produção. Sem tokens/PII, só para confirmar o fluxo enquanto se testa localmente. */
function debugLog(event: ClientMetaEvent, eventId: string, eventSourceUrl: string): void {
  if (process.env.NODE_ENV !== "development") return;
  console.debug("[meta-pixel]", {
    event,
    eventId,
    eventSourceUrl,
    at: new Date().toISOString(),
    client: true,
    consent: currentConsentState(),
  });
}

/**
 * Dispara `PageView`/`ViewContent`/`InitiateCheckout` em simultâneo no Pixel
 * (browser) e na Conversions API (via `/api/meta/track`), com o MESMO
 * `event_id` nos dois lados — é assim que a Meta deduplica o mesmo evento
 * chegado por duas vias. Nunca lança; uma falha de tracking não pode afetar
 * a navegação do utilizador. Se não houver consentimento de marketing, o
 * Pixel nem está carregado (`fireMetaPixelEvent` não faz nada) e o endpoint
 * devolve 204 sem enviar nada à Meta.
 */
export function trackMetaEvent(event: ClientMetaEvent, customData?: MetaCustomData): void {
  if (typeof window === "undefined") return;

  const eventId = crypto.randomUUID();
  const eventSourceUrl = window.location.href;

  fireMetaPixelEvent(event, customData, eventId);
  debugLog(event, eventId, eventSourceUrl);

  const payload = JSON.stringify({ event, eventId, eventSourceUrl, customData });

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon("/api/meta/track", blob)) return;
    }
  } catch {
    // Segue para o fallback abaixo.
  }

  fetch("/api/meta/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
