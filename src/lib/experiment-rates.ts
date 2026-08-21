/**
 * Matemática pura de agregação do A/B test — sem BD, sem cookies — para ser
 * testável isoladamente. `getPricingExperimentReport` (`src/lib/experiments.ts`)
 * usa esta função depois de ler as contagens em bruto do Prisma.
 */
export type VariantRawCounts = {
  visitors: number;
  ctaClicks: number;
  checkoutsStarted: number;
  /** Cliques em "Continuar para pagamento" (passo 6), antes do POST a `/api/pedido`. */
  paymentClicks: number;
  /** Stripe Checkout Sessions criadas com sucesso (`session.id`/`session.url` presentes). */
  stripeSessionsCreated: number;
  ordersCreated: number;
  paymentsCompleted: number;
  oneTimePurchases: number;
  monthlyPurchases: number;
  /** Soma de `Order.price` das encomendas pagas — cêntimos. */
  revenueCents: number;
};

export type VariantRates = VariantRawCounts & {
  /** 0..1, ou `null` sem dados suficientes (nunca dividir por zero). */
  monthlyAdoptionRate: number | null;
  /** Visitante exposto → checkout iniciado. */
  checkoutConversionRate: number | null;
  /** Checkout iniciado → clique em pagar. */
  checkoutToPaymentClickRate: number | null;
  /** Clique em pagar → Stripe session criada. */
  paymentClickToSessionRate: number | null;
  /** Stripe session criada → pagamento concluído. */
  sessionToPaymentRate: number | null;
  /** Visitante exposto → pagamento concluído. */
  purchaseConversionRate: number | null;
  /** Métrica principal do teste — cêntimos por visitante exposto. */
  revenuePerVisitorCents: number | null;
};

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeVariantRates(counts: VariantRawCounts): VariantRates {
  return {
    ...counts,
    monthlyAdoptionRate: safeDivide(
      counts.monthlyPurchases,
      counts.oneTimePurchases + counts.monthlyPurchases,
    ),
    checkoutConversionRate: safeDivide(counts.checkoutsStarted, counts.visitors),
    checkoutToPaymentClickRate: safeDivide(counts.paymentClicks, counts.checkoutsStarted),
    paymentClickToSessionRate: safeDivide(counts.stripeSessionsCreated, counts.paymentClicks),
    sessionToPaymentRate: safeDivide(counts.paymentsCompleted, counts.stripeSessionsCreated),
    purchaseConversionRate: safeDivide(counts.paymentsCompleted, counts.visitors),
    revenuePerVisitorCents: safeDivide(counts.revenueCents, counts.visitors),
  };
}
