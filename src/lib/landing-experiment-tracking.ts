/**
 * Tracking client-side do experimento A/B/C das landing pages — dispara para
 * `/api/experiments/track-landing`, que lê sempre a variante/visitante/sessão
 * das próprias cookies do pedido (nunca do que é enviado aqui). Mesmo padrão
 * de `src/lib/experiment-tracking.ts`/`src/lib/hero-experiment-tracking.ts`.
 *
 * Chamar estas funções incondicionalmente é seguro mesmo quando não há
 * sessão de landing ativa (visita direta/orgânica, fora de `/go`) — o
 * endpoint simplesmente não grava nada nesse caso (ver `getLandingContext`).
 */
export type LandingExperimentEventName =
  | "experiment_exposure"
  | "pricing_view"
  | "cta_clicked"
  | "plan_selected"
  | "checkout_started"
  | "payment_clicked";

export function trackLandingExperimentEvent(
  event: LandingExperimentEventName,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  const url = "/api/experiments/track-landing";
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
