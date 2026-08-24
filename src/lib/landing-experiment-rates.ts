/**
 * Matemática pura de agregação do experimento A/B/C das landing pages — sem
 * BD, sem cookies — para ser testável isoladamente, mesmo padrão de
 * `experiment-rates.ts`/`hero-experiment-rates.ts`. `getLandingExperimentReport`
 * (`src/lib/landing-experiment.ts`) usa esta função depois de ler as
 * contagens em bruto do Prisma. Cobre a leitura "direct/session" (conversão
 * dentro da mesma sessão de entrada) — ver `src/lib/landing-attribution.ts`
 * para first/last/any-touch entre sessões.
 */
export type LandingVariantRawCounts = {
  /** Visitantes únicos (`aqui_vid`) expostos a esta variante. */
  visitors: number;
  /** Sessões/visitas distintas (`experiment_visit_id`) — pode ser > visitors
   * quando o mesmo visitante entra várias vezes na mesma variante. */
  sessions: number;
  ctaClicks: number;
  /** Chegadas a `/pedido`. */
  checkoutsStarted: number;
  /** Cliques em "Continuar para pagamento" (passo 6). */
  paymentClicks: number;
  /** Stripe Checkout Sessions criadas com sucesso. */
  stripeSessionsCreated: number;
  ordersCreated: number;
  paymentsCompleted: number;
  /** Cêntimos, IVA incluído — soma de `Order.price` das encomendas pagas. */
  revenueCents: number;
};

export type LandingVariantRates = LandingVariantRawCounts & {
  /** Visitante exposto → clique em CTA de preços. */
  ctaClickRate: number | null;
  /** Visitante exposto → entrada em `/pedido`. */
  checkoutConversionRate: number | null;
  /** Entrada em `/pedido` → clique em pagar. */
  checkoutToPaymentClickRate: number | null;
  /** Clique em pagar → Stripe session criada. */
  paymentClickToSessionRate: number | null;
  /** Stripe session criada → pagamento concluído. */
  sessionToPaymentRate: number | null;
  /** Métrica principal — visitante exposto → pagamento concluído (não
   * escolher vencedor só por CTR: ver também `revenuePerVisitorCents`). */
  purchaseConversionRate: number | null;
  /** Receita / visitante único — métrica central, junto com
   * `purchaseConversionRate`, para comparar variantes com preços médios
   * diferentes (uma página pode converter menos mas levar a planos maiores). */
  revenuePerVisitorCents: number | null;
  /** Receita / sessão. */
  revenuePerSessionCents: number | null;
};

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeLandingVariantRates(counts: LandingVariantRawCounts): LandingVariantRates {
  return {
    ...counts,
    ctaClickRate: safeDivide(counts.ctaClicks, counts.visitors),
    checkoutConversionRate: safeDivide(counts.checkoutsStarted, counts.visitors),
    checkoutToPaymentClickRate: safeDivide(counts.paymentClicks, counts.checkoutsStarted),
    paymentClickToSessionRate: safeDivide(counts.stripeSessionsCreated, counts.paymentClicks),
    sessionToPaymentRate: safeDivide(counts.paymentsCompleted, counts.stripeSessionsCreated),
    purchaseConversionRate: safeDivide(counts.paymentsCompleted, counts.visitors),
    revenuePerVisitorCents: safeDivide(counts.revenueCents, counts.visitors),
    revenuePerSessionCents: safeDivide(counts.revenueCents, counts.sessions),
  };
}
