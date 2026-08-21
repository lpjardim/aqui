/**
 * Matemática pura de agregação do A/B test da headline do Hero — sem BD, sem
 * cookies — para ser testável isoladamente, tal como `experiment-rates.ts`
 * (o mesmo padrão, mas para o teste do Hero). `getHeroExperimentReport`
 * (`src/lib/hero-experiment.ts`) usa esta função depois de ler as contagens
 * em bruto do Prisma.
 */
export type HeroVariantRawCounts = {
  visitors: number;
  ctaClicks: number;
  /** Chegadas a `/pedido` (mesma definição que `checkoutsStarted` do teste de preços). */
  checkoutsStarted: number;
  /** Cliques em "Continuar para pagamento" (passo 6). */
  paymentClicks: number;
  /** Stripe Checkout Sessions criadas com sucesso. */
  stripeSessionsCreated: number;
  ordersCreated: number;
  paymentsCompleted: number;
};

export type HeroVariantRates = HeroVariantRawCounts & {
  /** Visitante exposto ao Hero → clique no CTA principal. */
  ctaClickRate: number | null;
  /** Visitante exposto → entrada em `/pedido`. */
  checkoutConversionRate: number | null;
  /** Entrada em `/pedido` → clique em pagar. */
  checkoutToPaymentClickRate: number | null;
  /** Clique em pagar → Stripe session criada. */
  paymentClickToSessionRate: number | null;
  /** Stripe session criada → pagamento concluído. */
  sessionToPaymentRate: number | null;
  /** Métrica principal do teste — visitante exposto → pagamento concluído. */
  purchaseConversionRate: number | null;
};

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeHeroVariantRates(counts: HeroVariantRawCounts): HeroVariantRates {
  return {
    ...counts,
    ctaClickRate: safeDivide(counts.ctaClicks, counts.visitors),
    checkoutConversionRate: safeDivide(counts.checkoutsStarted, counts.visitors),
    checkoutToPaymentClickRate: safeDivide(counts.paymentClicks, counts.checkoutsStarted),
    paymentClickToSessionRate: safeDivide(counts.stripeSessionsCreated, counts.paymentClicks),
    sessionToPaymentRate: safeDivide(counts.paymentsCompleted, counts.stripeSessionsCreated),
    purchaseConversionRate: safeDivide(counts.paymentsCompleted, counts.visitors),
  };
}
