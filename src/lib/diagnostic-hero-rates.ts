/**
 * Matemática pura de agregação do A/B/C test do Hero de `/diagnostico`
 * (`diagnostic_hero_v1`) — sem BD, sem cookies, 100% testável, mesmo
 * padrão de `hero-experiment-rates.ts`/`landing-experiment-rates.ts`.
 * `getDiagnosticHeroExperimentReport` (`src/lib/diagnostic-hero-experiment.ts`)
 * usa esta função depois de ler as contagens em bruto do Prisma.
 */
export type DiagnosticHeroVariantRawCounts = {
  /** Visitantes únicos que viram o Hero (`diagnostic_hero_view`). */
  visitors: number;
  /** Cliques únicos em "Fazer diagnóstico" (`diagnostic_hero_cta_clicked`). */
  ctaClicks: number;
  /** Diagnósticos iniciados (`diagnostic_started`) — métrica principal do teste. */
  starts: number;
  completed: number;
  previewStarted: number;
  previewCompleted: number;
  /** Chegadas a `/pedido` vindas desta variante. */
  checkoutStarted: number;
  ordersCreated: number;
  paymentsCompleted: number;
  /** Cêntimos, IVA incluído — soma de `Order.price` das encomendas pagas. */
  revenueCents: number;
};

export type DiagnosticHeroVariantRates = DiagnosticHeroVariantRawCounts & {
  /** Visitante exposto ao Hero → clique no CTA. */
  ctaClickRate: number | null;
  /** Visitante exposto → diagnóstico iniciado. MÉTRICA PRINCIPAL do teste
   * (secção 8 do pedido: `diagnostic_started / unique hero visitors`). */
  startRate: number | null;
  /** Diagnóstico iniciado → concluído (6 respostas). */
  completionRate: number | null;
  /** Concluído → preview do anúncio iniciado. */
  previewRate: number | null;
  /** Concluído → chegada a `/pedido`. */
  checkoutRate: number | null;
  /** Visitante exposto → pagamento concluído — leitura de "qualidade" do
   * tráfego (secção 10 do pedido: nunca escolher vencedor só pelo clique). */
  purchaseRate: number | null;
  revenuePerVisitorCents: number | null;
};

function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function computeDiagnosticHeroVariantRates(
  counts: DiagnosticHeroVariantRawCounts,
): DiagnosticHeroVariantRates {
  return {
    ...counts,
    ctaClickRate: safeDivide(counts.ctaClicks, counts.visitors),
    startRate: safeDivide(counts.starts, counts.visitors),
    completionRate: safeDivide(counts.completed, counts.starts),
    previewRate: safeDivide(counts.previewStarted, counts.completed),
    checkoutRate: safeDivide(counts.checkoutStarted, counts.completed),
    purchaseRate: safeDivide(counts.paymentsCompleted, counts.visitors),
    revenuePerVisitorCents: safeDivide(counts.revenueCents, counts.visitors),
  };
}
