/**
 * Motor de preços da Aqui. — fonte única da verdade para qualquer cálculo de
 * preço, seja no checkout, na landing page ou no servidor.
 *
 * Interpolação linear por dois escalões (2.000→20.000 e 20.000→200.000),
 * usando os 3 packs como pontos âncora exatos. O preço final é SEMPRE
 * recalculado no servidor (nunca confiar num valor vindo do browser).
 */

export type BillingFrequency = "ONE_TIME" | "MONTHLY";

export const MIN_VIEWS = 2_000;
export const MID_VIEWS = 20_000;
export const MAX_VIEWS = 200_000;
export const VIEWS_STEP = 1_000;

/** Arredonda ao incremento de 1.000 e limita sempre a [2.000, 200.000]. */
export function clampViews(views: number): number {
  if (!Number.isFinite(views)) return MIN_VIEWS;
  const rounded = Math.round(views / VIEWS_STEP) * VIEWS_STEP;
  return Math.min(MAX_VIEWS, Math.max(MIN_VIEWS, rounded));
}

function interpolateEuros(views: number, low: number, mid: number, high: number): number {
  if (views <= MID_VIEWS) {
    return low + ((views - MIN_VIEWS) / (MID_VIEWS - MIN_VIEWS)) * (mid - low);
  }
  return mid + ((views - MID_VIEWS) / (MAX_VIEWS - MID_VIEWS)) * (high - mid);
}

/**
 * Devolve o preço em cêntimos, arredondado ao euro inteiro. Os 3 pontos
 * âncora devolvem sempre o valor exato pedido:
 * - 2.000  → 49€ (uma vez) / 39€ (mensal)
 * - 20.000 → 390€ (uma vez) / 290€ (mensal)
 * - 200.000 → 2.990€ (uma vez) / 2.490€ (mensal)
 */
export function calculatePrice(views: number, frequency: BillingFrequency): number {
  const clamped = clampViews(views);
  const euros =
    frequency === "ONE_TIME"
      ? interpolateEuros(clamped, 49, 390, 2990)
      : interpolateEuros(clamped, 39, 290, 2490);
  return Math.round(euros) * 100;
}
