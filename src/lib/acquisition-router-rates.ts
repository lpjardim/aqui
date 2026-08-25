/**
 * Matemática pura de agregação do nível 1 do router (`acquisition_router_v1`)
 * — sem BD, sem cookies, 100% testável, mesmo padrão de
 * `landing-experiment-rates.ts`/`diagnostic-hero-rates.ts`.
 * `getAcquisitionRouterFamilyReport` (`src/lib/acquisition-router.ts`) usa
 * esta função depois de agregar as contagens em bruto — `visitors` vem do
 * evento dedicado `AcquisitionRouterEvent` (ASSIGNMENT), o resto vem da SOMA
 * dos relatórios já existentes de cada família (`getLandingExperimentReport`/
 * `getDiagnosticHeroExperimentReport`), nunca de uma segunda pipeline de
 * eventos financeiros.
 */
export type FunnelFamilyRawCounts = {
  /** Visitantes únicos (`aqui_vid`) atribuídos a esta família em `/go`
   * (`AcquisitionRouterEvent`, `eventType: ASSIGNMENT`, `isDebug: false`). */
  visitors: number;
  /** Soma dos "checkouts iniciados" das 3 variantes desta família. */
  checkoutsStarted: number;
  ordersCreated: number;
  paymentsCompleted: number;
  /** Cêntimos, IVA incluído — soma da receita das 3 variantes desta família. */
  revenueCents: number;
};

export type FunnelFamilyRates = FunnelFamilyRawCounts & {
  /** Visitante atribuído à família → entrada em `/pedido`. */
  checkoutConversionRate: number | null;
  /** Métrica principal — visitante atribuído → pagamento concluído (ver
   * `revenuePerVisitorCents` para não escolher vencedor só por conversão). */
  purchaseConversionRate: number | null;
  /** Receita / visitante único — métrica principal, junto com
   * `purchaseConversionRate`, para comparar famílias com preços médios
   * diferentes (ex.: o diagnóstico pode recomendar planos maiores). */
  revenuePerVisitorCents: number | null;
};

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeFunnelFamilyRates(counts: FunnelFamilyRawCounts): FunnelFamilyRates {
  return {
    ...counts,
    checkoutConversionRate: safeDivide(counts.checkoutsStarted, counts.visitors),
    purchaseConversionRate: safeDivide(counts.paymentsCompleted, counts.visitors),
    revenuePerVisitorCents: safeDivide(counts.revenueCents, counts.visitors),
  };
}
