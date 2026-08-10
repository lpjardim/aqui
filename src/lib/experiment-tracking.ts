/**
 * Tracking client-side do A/B test de preços — dispara para
 * `/api/experiments/track`, que lê a variante/visitante/debug sempre das
 * próprias cookies do pedido (nunca do que é enviado aqui). Isto evita que
 * este ficheiro alguma vez precise de saber ou de poder falsificar a
 * variante/visitante de outra pessoa.
 *
 * Usa `navigator.sendBeacon` (fiável mesmo em navegação imediata a seguir,
 * como o clique em "Escolher") com fallback para `fetch` com `keepalive`.
 * Nunca lança — uma falha de tracking não pode partir a navegação do
 * utilizador.
 */
export type ExperimentEventName =
  | "pricing_exposed"
  | "pricing_cta_clicked"
  | "pricing_toggle_changed"
  | "checkout_started";

export function trackExperimentEvent(
  event: ExperimentEventName,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  const url = "/api/experiments/track";
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
