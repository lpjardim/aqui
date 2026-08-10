import { fireMetaPixelEvent } from "@/lib/meta/pixel";

/**
 * Dispara `ViewContent`/`InitiateCheckout` em simultâneo no Pixel (browser)
 * e na Conversions API (via `/api/meta/track`), com o MESMO `event_id` nos
 * dois lados — é assim que a Meta deduplica o mesmo evento chegado por duas
 * vias. Nunca lança; uma falha de tracking não pode afetar a navegação do
 * utilizador. Se não houver consentimento de marketing, o Pixel nem está
 * carregado (`fireMetaPixelEvent` não faz nada) e o endpoint devolve 204
 * sem enviar nada à Meta.
 */
export function trackMetaEvent(event: "ViewContent" | "InitiateCheckout"): void {
  if (typeof window === "undefined") return;

  const eventId = crypto.randomUUID();
  const eventSourceUrl = window.location.href;

  fireMetaPixelEvent(event, undefined, eventId);

  const payload = JSON.stringify({ event, eventId, eventSourceUrl });

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
