/**
 * Tracking client-side do A/B test da headline do Hero — dispara para
 * `/api/experiments/track-hero`, que lê a variante/visitante/debug sempre
 * das próprias cookies do pedido (nunca do que é enviado aqui). Espelha
 * `src/lib/experiment-tracking.ts` (teste de preços), mas para uma
 * experiência e uma tabela de eventos completamente independentes.
 *
 * Usa `navigator.sendBeacon` com fallback para `fetch` com `keepalive`.
 * Nunca lança — uma falha de tracking não pode partir a navegação do
 * utilizador.
 */
export type HeroExperimentEventName =
  | "hero_exposed"
  | "hero_cta_clicked"
  | "hero_checkout_started"
  | "hero_payment_clicked";

export function trackHeroExperimentEvent(
  event: HeroExperimentEventName,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  const url = "/api/experiments/track-hero";
  const payload = JSON.stringify({ event, metadata });

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    // Segue para o fallback abaixo.
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
