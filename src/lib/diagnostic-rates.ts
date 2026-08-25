/**
 * Matemática pura de agregação do funil `/diagnostico` — sem BD, sem
 * cookies, 100% testável, mesmo padrão de `landing-experiment-rates.ts`.
 * `getDiagnosticFunnelReport`/`getDiagnosticSegmentationReport`
 * (`src/lib/diagnostic-report.ts`) usam estas funções depois de ler as
 * contagens em bruto do Prisma.
 */
export type DiagnosticFunnelRawCounts = {
  /** Visitantes únicos (`aqui_vid`) que começaram o diagnóstico — pode ser
   * menor que `starts` se o mesmo visitante recomeçar mais do que uma vez. */
  visitors: number;
  /** Corridas do diagnóstico iniciadas (`diagnosticId` distintos). */
  starts: number;
  completed: number;
  resultViewed: number;
  previewStarted: number;
  previewCompleted: number;
  recommendationViewed: number;
  recommendedPlanClicked: number;
  /** Chegadas a `/pedido` vindas do diagnóstico. */
  checkoutStarted: number;
  /** Cliques em "Continuar para pagamento". */
  paymentClicks: number;
  stripeSessionsCreated: number;
  ordersCreated: number;
  paymentsCompleted: number;
  /** Cêntimos, IVA incluído — soma de `Order.price` das encomendas pagas
   * com `funnelSource: "diagnostic"`. */
  revenueCents: number;
};

export type DiagnosticFunnelRates = DiagnosticFunnelRawCounts & {
  startToCompletedRate: number | null;
  completedToResultRate: number | null;
  resultToPreviewRate: number | null;
  previewToRecommendationRate: number | null;
  recommendationToPlanClickRate: number | null;
  planClickToCheckoutRate: number | null;
  checkoutToPaymentClickRate: number | null;
  paymentClickToSessionRate: number | null;
  sessionToPaymentRate: number | null;
  /** Métrica principal — quem começou o diagnóstico → pagou. */
  purchaseConversionRate: number | null;
  revenuePerStartCents: number | null;
  revenuePerCompletedCents: number | null;
};

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeDiagnosticFunnelRates(
  counts: DiagnosticFunnelRawCounts,
): DiagnosticFunnelRates {
  return {
    ...counts,
    startToCompletedRate: safeDivide(counts.completed, counts.starts),
    completedToResultRate: safeDivide(counts.resultViewed, counts.completed),
    resultToPreviewRate: safeDivide(counts.previewStarted, counts.resultViewed),
    previewToRecommendationRate: safeDivide(counts.recommendationViewed, counts.previewCompleted),
    recommendationToPlanClickRate: safeDivide(counts.recommendedPlanClicked, counts.recommendationViewed),
    planClickToCheckoutRate: safeDivide(counts.checkoutStarted, counts.recommendedPlanClicked),
    checkoutToPaymentClickRate: safeDivide(counts.paymentClicks, counts.checkoutStarted),
    paymentClickToSessionRate: safeDivide(counts.stripeSessionsCreated, counts.paymentClicks),
    sessionToPaymentRate: safeDivide(counts.paymentsCompleted, counts.stripeSessionsCreated),
    purchaseConversionRate: safeDivide(counts.paymentsCompleted, counts.starts),
    revenuePerStartCents: safeDivide(counts.revenueCents, counts.starts),
    revenuePerCompletedCents: safeDivide(counts.revenueCents, counts.completed),
  };
}

export type DiagnosticSegmentCount = {
  value: string;
  label: string;
  purchases: number;
  revenueCents: number;
};

/**
 * Agrega compras (já filtradas para pagas) por um valor de segmentação
 * qualquer (canal, urgência, objetivo, previsibilidade, pack recomendado —
 * secção 31 do pedido). `extractValue` devolve `null` para excluir a
 * encomenda desta agregação (ex.: respostas antigas/incompletas).
 */
export function aggregateDiagnosticSegment<TOrder extends { price: number }>(
  paidOrders: TOrder[],
  extractValue: (order: TOrder) => string | null,
  labelFor: (value: string) => string,
): DiagnosticSegmentCount[] {
  const totals = new Map<string, { purchases: number; revenueCents: number }>();

  for (const order of paidOrders) {
    const value = extractValue(order);
    if (!value) continue;

    const current = totals.get(value) ?? { purchases: 0, revenueCents: 0 };
    current.purchases += 1;
    current.revenueCents += order.price;
    totals.set(value, current);
  }

  return Array.from(totals.entries())
    .map(([value, counts]) => ({ value, label: labelFor(value), ...counts }))
    .sort((a, b) => b.purchases - a.purchases);
}
