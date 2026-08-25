/**
 * Tracking client-side do funil `/diagnostico` — dispara para
 * `/api/experiments/track-diagnostic`, mesmo padrão `sendBeacon` + fallback
 * `fetch` de `src/lib/landing-experiment-tracking.ts`. Ao contrário desse
 * ficheiro, aqui o `diagnosticId` tem de vir sempre explícito: não há
 * nenhuma cookie de sessão atribuída pelo servidor para este funil (não é
 * sorteado, não passa por nenhum middleware) — ver
 * `src/lib/diagnostic/session.ts`.
 */
export type DiagnosticEventName =
  | "diagnostic_hero_view"
  | "diagnostic_hero_cta_clicked"
  | "diagnostic_started"
  | "diagnostic_question_answered"
  | "diagnostic_completed"
  | "diagnostic_result_viewed"
  | "preview_started"
  | "preview_completed"
  | "recommendation_viewed"
  | "recommended_plan_clicked"
  | "checkout_started"
  | "payment_clicked";

export function trackDiagnosticEvent(
  event: DiagnosticEventName,
  diagnosticId: string,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!diagnosticId) return;

  const url = "/api/experiments/track-diagnostic";
  const payload = JSON.stringify({ event, diagnosticId, metadata });

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
