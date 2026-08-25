import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { formatDate, formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import {
  FREQUENCY_LABELS,
  STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  campaignName,
  getExpectedMetaCampaignName,
  progress,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getLastMetaSyncAt } from "@/lib/meta";
import { getPricingExperimentReport, type VariantReport } from "@/lib/experiments";
import { getHeroExperimentReport, type HeroVariantReport } from "@/lib/hero-experiment";
import { getLandingExperimentReport, type LandingVariantReport } from "@/lib/landing-experiment";
import { getAcquisitionRouterFamilyReport, type FunnelFamilyReport } from "@/lib/acquisition-router";
import {
  hasEnoughSample,
  MIN_SAMPLE_SIZE,
  type JourneyAggregate,
  type LandingAttributionReport,
  type VariantAttributionCounts,
} from "@/lib/landing-attribution";
import { getLandingAttributionReport, getLandingJourneyReport } from "@/lib/landing-attribution-report";
import {
  getDiagnosticFunnelReport,
  getDiagnosticSegmentationReport,
  type DiagnosticSegmentationReport,
} from "@/lib/diagnostic-report";
import type { DiagnosticFunnelRates, DiagnosticSegmentCount } from "@/lib/diagnostic-rates";
import {
  getDiagnosticHeroExperimentReport,
  type DiagnosticHeroVariantReport,
} from "@/lib/diagnostic-hero-experiment";
import type { LandingVariant, DiagnosticHeroVariant, FunnelFamily } from "@/generated/prisma/enums";
import { AdminLogin } from "./admin-login";
import { MetaSyncButton } from "./meta-sync-button";
import { MetaAssociation } from "./meta-association";
import { RetryPauseButton } from "./retry-pause-button";
import { DeleteOrderButton } from "./delete-order-button";
import { adminLogout, markCompleted, updateStatus, uploadProof } from "./actions";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

const inputClass =
  "h-10 rounded-sm border border-line-strong bg-white px-3 text-[14px] outline-none focus:border-ink";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="container-page py-10">
        <AdminLogin />
      </main>
    );
  }

  const [
    orders,
    lastMetaSyncAt,
    acquisitionRouterReport,
    pricingReport,
    heroReport,
    landingReport,
    landingAttributionReport,
    landingJourneyReport,
    diagnosticFunnelReport,
    diagnosticSegmentationReport,
    diagnosticHeroExperimentReport,
  ] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        assets: true,
        // O ciclo mais recente representa o estado "atual" a mostrar: o
        // ciclo ACTIVE em curso, ou o último COMPLETED se não houver nenhum
        // ativo (ex.: ONE_TIME já concluída, ou entre renovações mensais).
        cycles: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    getLastMetaSyncAt(),
    getAcquisitionRouterFamilyReport(),
    getPricingExperimentReport(),
    getHeroExperimentReport(),
    getLandingExperimentReport(),
    getLandingAttributionReport(),
    getLandingJourneyReport(),
    getDiagnosticFunnelReport(),
    getDiagnosticSegmentationReport(),
    getDiagnosticHeroExperimentReport(),
  ]);

  return (
    <main className="container-page py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 pl-2">
          <Logo size="sm" />
          <span className="text-[13px] uppercase tracking-[0.16em] text-muted">Interno</span>
        </div>
        <form action={adminLogout}>
          <Button variant="ghost" className="h-9 px-3 text-[13px]">
            Sair
          </Button>
        </form>
      </div>

      <AcquisitionRouterSection report={acquisitionRouterReport} />

      <PricingExperimentSection report={pricingReport} />

      <HeroExperimentSection report={heroReport} />

      <LandingExperimentSection report={landingReport} />

      <LandingAttributionSection report={landingAttributionReport} />

      <LandingJourneySection journeys={landingJourneyReport} />

      <DiagnosticHeroExperimentSection report={diagnosticHeroExperimentReport} />

      <DiagnosticFunnelSection report={diagnosticFunnelReport} segmentation={diagnosticSegmentationReport} />

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-black">Encomendas</h1>
          <p className="mt-2 text-[14px] text-muted">{orders.length} no total</p>
        </div>
        <div className="text-right">
          <MetaSyncButton />
          <p className="mt-2 text-[12px] text-muted">
            Última sincronização Meta:{" "}
            {lastMetaSyncAt ? formatDateTime(lastMetaSyncAt) : "ainda não foi feita"}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {orders.map((order) => {
          const cycle = order.cycles[0];
          const deliveredViews = cycle?.deliveredViews ?? order.visualizationsDelivered;
          const targetViews = cycle?.targetViews ?? order.visualizationsPurchased;
          const isMonthly = order.billingFrequency === "MONTHLY";
          const attributionLabel = compactAttributionLabel(order);

          return (
          <article
            key={order.id}
            id={`order-${order.id}`}
            className="scroll-mt-6 rounded-lg border border-line p-6"
          >
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-bold">
                  {campaignName(order.user.companyName, order.zone)} —{" "}
                  {formatDate(order.createdAt)}
                </h2>
                <p className="mt-1 text-[13px] text-muted">
                  {order.user.companyName} · {order.user.name} · {order.user.email} ·{" "}
                  {order.user.phone}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {order.zone} · {formatNumber(order.visualizationsPurchased)} visualizações ·{" "}
                  {formatPrice(order.price)}
                  {isMonthly ? "/mês" : ""} · {FREQUENCY_LABELS[order.billingFrequency]} ·{" "}
                  {formatDate(order.createdAt)}
                </p>
                {isMonthly && (
                  <p className="mt-1 text-[13px] text-muted">
                    Subscrição:{" "}
                    {order.subscriptionStatus
                      ? SUBSCRIPTION_STATUS_LABELS[order.subscriptionStatus] ?? order.subscriptionStatus
                      : "—"}
                    {order.cancelAtPeriodEnd && " · cancela no fim do período"}
                    {cycle && ` · próxima renovação: ${formatDate(cycle.endsAt)}`}
                  </p>
                )}
                {attributionLabel && (
                  <p className="mt-1 text-[13px] text-muted">Atribuição: {attributionLabel}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[20px] font-black tabular-nums">
                  {progress(deliveredViews, targetViews)}%
                </p>
                <p className="text-[12px] text-muted">
                  {formatNumber(deliveredViews)} / {formatNumber(targetViews)}
                  {isMonthly ? " (ciclo atual)" : ""}
                </p>
                {order.status === "PENDING_PAYMENT" && (
                  <div className="mt-2">
                    <DeleteOrderButton
                      orderId={order.id}
                      companyName={order.user.companyName}
                      email={order.user.email}
                    />
                  </div>
                )}
              </div>
            </header>

            {order.assets.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {order.assets.map((asset, index) => {
                  // Assets no Blob (STORAGE_DRIVER="vercel-blob") são privados: o link
                  // passa pela rota de admin, que autentica antes de servir o ficheiro.
                  const href = asset.fileUrl.startsWith("http")
                    ? `/api/admin/ficheiros?url=${encodeURIComponent(asset.fileUrl)}`
                    : asset.fileUrl;
                  return (
                    <a
                      key={asset.id}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-sm border border-line px-3 py-1.5 text-[12px] transition-colors hover:bg-surface"
                    >
                      Ficheiro {index + 1} · {asset.fileType.split("/")[1]}
                    </a>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-end gap-6 border-t border-line pt-5">
              <form action={updateStatus} className="flex items-end gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="text-[12px] text-muted">
                  Estado
                  <select name="status" defaultValue={order.status} className={`mt-1 block ${inputClass}`}>
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <Button variant="outline" className="h-10 px-4 text-[13px]">
                  Guardar
                </Button>
              </form>

              <form action={markCompleted}>
                <input type="hidden" name="orderId" value={order.id} />
                <Button variant="outline" className="h-10 px-4 text-[13px]">
                  Marcar concluída
                </Button>
              </form>

              <form action={uploadProof} className="flex items-end gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="text-[12px] text-muted">
                  Comprovativo
                  <input
                    type="file"
                    name="proof"
                    accept="application/pdf,image/png,image/jpeg"
                    className="mt-1 block w-56 text-[12px] file:mr-3 file:rounded-sm file:border file:border-line-strong file:bg-white file:px-3 file:py-1.5 file:text-[12px]"
                  />
                </label>
                <Button variant="outline" className="h-10 px-4 text-[13px]">
                  Carregar
                </Button>
              </form>

              {order.proofUrl && (
                <a
                  href={order.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] underline"
                >
                  Ver comprovativo atual
                </a>
              )}
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted">
                  Meta {isMonthly && cycle && <span className="font-normal text-muted">· ciclo atual</span>}
                </h3>
                <div className="text-right">
                  <p className="text-[12px] text-muted">
                    Impressions atuais / alvo:{" "}
                    <span className="font-semibold text-ink">
                      {formatNumber(deliveredViews)} / {formatNumber(targetViews)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Alvo atingido:{" "}
                    {cycle?.targetReachedAt
                      ? `sim (${formatDateTime(cycle.targetReachedAt)})`
                      : "não"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Meta pausada:{" "}
                    {cycle?.metaPausedAt ? `sim (${formatDateTime(cycle.metaPausedAt)})` : "não"}
                  </p>
                </div>
              </div>

              <MetaAssociation
                orderId={order.id}
                expectedName={getExpectedMetaCampaignName(order)}
                metaCampaignId={order.metaCampaignId}
              />

              {cycle?.targetReachedAt && !cycle.metaPausedAt && order.metaCampaignId && (
                <div className="mt-3 rounded-sm border border-red-strong/30 bg-red-strong/5 p-3">
                  <p className="text-[12px] font-semibold text-red-strong">
                    Limite atingido — falha ao pausar na Meta
                  </p>
                  {cycle.metaPauseLastError && (
                    <p className="mt-1 text-[11px] text-muted">{cycle.metaPauseLastError}</p>
                  )}
                  <RetryPauseButton cycleId={cycle.id} />
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted">Atribuição</h3>
              <AttributionDetails order={order} />
            </div>
          </article>
          );
        })}

        {orders.length === 0 && <p className="text-[15px] text-muted">Ainda não há encomendas.</p>}
      </div>
    </main>
  );
}

function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function divideOrNull(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-2 last:border-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={`text-[13px] font-semibold ${highlight ? "text-red-strong" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

type OrderAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  placement: string | null;
  attributionCampaignId: string | null;
  attributionAdsetId: string | null;
  attributionAdId: string | null;
  lastPaidUtmSource: string | null;
  lastPaidUtmMedium: string | null;
  lastPaidUtmCampaign: string | null;
  lastPaidUtmContent: string | null;
  lastPaidUtmTerm: string | null;
  lastPaidPlacement: string | null;
  lastPaidCampaignId: string | null;
  lastPaidAdsetId: string | null;
  lastPaidAdId: string | null;
};

/**
 * Linha compacta do cabeçalho da Order — prioriza LAST PAID TOUCH (mais útil
 * para decisão de spend em Ads); cai para first-touch quando a Order nunca
 * teve nenhum toque pago identificável (ex.: entrada 100% orgânica). Devolve
 * `null` quando não há nenhuma das duas.
 */
function compactAttributionLabel(order: OrderAttribution): string | null {
  const source = order.lastPaidUtmSource ?? order.utmSource;
  const campaign = order.lastPaidUtmCampaign ?? order.utmCampaign;
  const label = [source, campaign].filter(Boolean).join(" · ");
  return label || null;
}

/**
 * Atribuição de marketing (de onde veio o cliente), dividida em duas
 * origens independentes — snapshots capturados no `proxy.ts`/
 * `src/lib/attribution.ts` no momento em que a Order foi criada:
 * - PRIMEIRA ORIGEM: first-touch, nunca muda depois da primeira visita.
 * - ÚLTIMA ORIGEM PAGA: last paid touch, última campanha PAGA (ver
 *   `isPaidTouch`) antes desta compra — `null` se nunca houve nenhuma.
 * `utm_campaign` → Campanha, `utm_term` → Adset, `utm_content` → Anúncio
 * (mapeamento pedido, corresponde à forma como os anúncios da Meta
 * preenchem estes UTMs).
 */
function AttributionDetails({ order }: { order: OrderAttribution }) {
  return (
    <div className="mt-3 grid gap-5 sm:grid-cols-2">
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
          Primeira origem
        </h4>
        <AttributionRows
          rows={[
            ["Fonte", order.utmSource],
            ["Meio", order.utmMedium],
            ["Campanha", order.utmCampaign],
            ["Adset", order.utmTerm],
            ["Anúncio", order.utmContent],
            ["Placement", order.placement],
            ["Campaign ID", order.attributionCampaignId],
            ["Adset ID", order.attributionAdsetId],
            ["Ad ID", order.attributionAdId],
          ]}
        />
      </div>
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
          Última origem paga
        </h4>
        <AttributionRows
          rows={[
            ["Fonte", order.lastPaidUtmSource],
            ["Meio", order.lastPaidUtmMedium],
            ["Campanha", order.lastPaidUtmCampaign],
            ["Adset", order.lastPaidUtmTerm],
            ["Anúncio", order.lastPaidUtmContent],
            ["Placement", order.lastPaidPlacement],
            ["Campaign ID", order.lastPaidCampaignId],
            ["Adset ID", order.lastPaidAdsetId],
            ["Ad ID", order.lastPaidAdId],
          ]}
        />
      </div>
    </div>
  );
}

function AttributionRows({ rows }: { rows: [string, string | null][] }) {
  const visibleRows = rows.filter(([, value]) => value);

  if (visibleRows.length === 0) {
    return <p className="mt-2 text-[13px] text-muted">Origem não identificada.</p>;
  }

  return (
    <dl className="mt-2">
      {visibleRows.map(([label, value]) => (
        <StatRow key={label} label={label} value={value as string} />
      ))}
    </dl>
  );
}

const FUNNEL_FAMILY_LABELS: Record<FunnelFamily, string> = {
  LANDING: "Landing Pages",
  DIAGNOSTIC: "Diagnóstico",
};

const FUNNEL_FAMILY_ORDER: FunnelFamily[] = ["LANDING", "DIAGNOSTIC"];

/**
 * Nível 1 do router de experimentos de `/go` (`acquisition_router_v1`, ver
 * `src/lib/acquisition-router.ts`) — decide para que família de experimento
 * cada visita vai (Landing Pages vs Diagnóstico) ANTES de qualquer sorteio
 * de nível 2. `visitors` vem do evento dedicado `AcquisitionRouterEvent`
 * (robusto e versionado, independente do que mudar nos experimentos
 * filhos); o resto é a SOMA das 3 variantes de cada família, já lida pelas
 * secções "A/B/C Test — Landing Pages" e "Diagnóstico — Teste de Hero" mais
 * abaixo — nunca uma segunda pipeline de eventos financeiros. Tráfego de QA
 * (`?family=`/`?variant=`) já vem excluído destes números. Métrica
 * principal: conversão (visitante → pagamento) e receita por visitante, para
 * decidir se vale a pena continuar a investir em cada família.
 */
function AcquisitionRouterSection({ report }: { report: FunnelFamilyReport[] }) {
  const orderedReport = FUNNEL_FAMILY_ORDER.map(
    (family) => report.find((entry) => entry.family === family) ?? null,
  ).filter((entry): entry is FunnelFamilyReport => entry !== null);

  return (
    <section className="mt-10 rounded-lg border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-black">Acquisition Router v1 — /go</h2>
        <span className="rounded-full bg-red-strong/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-red-strong">
          Experimento em curso
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        Nível 1 de `/go`: 50% do tráfego vai para as landing pages tradicionais, 50% para o funil
        interativo `/diagnostico` (pesos configuráveis). As secções abaixo (Landing Pages e Teste
        de Hero do Diagnóstico) mostram o nível 2 de cada família. Métrica principal: conversão
        (visitante → pagamento) e receita por visitante.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {orderedReport.map((family) => (
          <div key={family.family} className="rounded-md border border-line p-5">
            <h3 className="text-[14px] font-bold">{FUNNEL_FAMILY_LABELS[family.family]}</h3>
            <dl className="mt-3">
              <StatRow label="Visitantes" value={formatNumber(family.visitors)} />
              <StatRow label="Checkouts iniciados" value={formatNumber(family.checkoutsStarted)} />
              <StatRow label="Encomendas criadas" value={formatNumber(family.ordersCreated)} />
              <StatRow label="Compras (pagamentos concluídos)" value={formatNumber(family.paymentsCompleted)} />
              <StatRow
                label="Visitante → checkout iniciado"
                value={formatRate(family.checkoutConversionRate)}
              />
              <StatRow
                label="Purchase CR (visitante → pagamento)"
                value={formatRateOrInsufficient(family.purchaseConversionRate, family.paymentsCompleted)}
                highlight
              />
              <StatRow
                label="Receita"
                value={
                  hasEnoughSample(family.paymentsCompleted)
                    ? formatPrice(family.revenueCents)
                    : "Dados insuficientes"
                }
              />
              <StatRow
                label="Receita por visitante"
                value={
                  hasEnoughSample(family.paymentsCompleted) && family.revenuePerVisitorCents !== null
                    ? formatPrice(Math.round(family.revenuePerVisitorCents))
                    : "Dados insuficientes"
                }
                highlight
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Resultados do A/B test da secção de preços da landing page (Variante A =
 * split, Variante B = toggle — ver `src/lib/experiments.ts`). Tráfego de
 * debug (`?a_variant=`/`?experiment_debug=true`) já vem excluído destes
 * números pelo próprio `getPricingExperimentReport`.
 */
function PricingExperimentSection({ report }: { report: VariantReport[] }) {
  return (
    <section className="mt-10 rounded-lg border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-black">A/B Test — Preços</h2>
        <span className="rounded-full bg-red-strong/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-red-strong">
          Experimento em curso
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        Variante A = colunas Uma vez/Mensal por card · Variante B = toggle Uma vez/Mensal acima
        dos cards. Métrica principal: receita por visitante exposto.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {report.map((variant) => (
          <div key={variant.variant} className="rounded-md border border-line p-5">
            <h3 className="text-[14px] font-bold">
              Variante {variant.variant}{" "}
              <span className="font-normal text-muted">
                ({variant.variant === "B" ? "toggle" : "split"})
              </span>
            </h3>
            <dl className="mt-3">
              <StatRow label="Visitantes" value={formatNumber(variant.visitors)} />
              <StatRow label="Cliques CTA" value={formatNumber(variant.ctaClicks)} />
              <StatRow label="Checkouts iniciados" value={formatNumber(variant.checkoutsStarted)} />
              <StatRow label="Cliques em pagar" value={formatNumber(variant.paymentClicks)} />
              <StatRow
                label="Stripe sessions criadas"
                value={formatNumber(variant.stripeSessionsCreated)}
              />
              <StatRow label="Encomendas criadas" value={formatNumber(variant.ordersCreated)} />
              <StatRow label="Pagamentos concluídos" value={formatNumber(variant.paymentsCompleted)} />
              <StatRow
                label="Visitante → checkout iniciado"
                value={formatRate(variant.checkoutConversionRate)}
              />
              <StatRow
                label="Checkout iniciado → clique em pagar"
                value={formatRate(variant.checkoutToPaymentClickRate)}
              />
              <StatRow
                label="Clique em pagar → Stripe session criada"
                value={formatRate(variant.paymentClickToSessionRate)}
              />
              <StatRow
                label="Stripe session criada → pagamento"
                value={formatRate(variant.sessionToPaymentRate)}
              />
              <StatRow
                label="Taxa checkout → pagamento"
                value={formatRate(divideOrNull(variant.paymentsCompleted, variant.checkoutsStarted))}
              />
              <StatRow
                label="Conversão (visitante → pagamento)"
                value={formatRate(variant.purchaseConversionRate)}
              />
              <StatRow label="Compras uma vez" value={formatNumber(variant.oneTimePurchases)} />
              <StatRow label="Compras mensais" value={formatNumber(variant.monthlyPurchases)} />
              <StatRow label="% adoção mensal" value={formatRate(variant.monthlyAdoptionRate)} />
              <StatRow label="Receita inicial" value={formatPrice(variant.revenueCents)} />
              <StatRow
                label="Receita por visitante"
                value={
                  variant.revenuePerVisitorCents !== null
                    ? formatPrice(Math.round(variant.revenuePerVisitorCents))
                    : "—"
                }
                highlight
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Resultados do A/B test da headline do Hero da landing page (Variante A =
 * "Ponha o seu negócio à frente...", Variante B = "Faça mais pessoas... " —
 * ver `src/lib/hero-experiment.ts`). Completamente independente do teste de
 * preços acima: cookie, tabela de eventos e campos na `Order` próprios.
 * Tráfego de debug (`?h_variant=`/`?experiment_debug=true`) já vem excluído
 * destes números.
 */
function HeroExperimentSection({ report }: { report: HeroVariantReport[] }) {
  return (
    <section className="mt-10 rounded-lg border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-black">A/B Test — Hero</h2>
        <span className="rounded-full bg-red-strong/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-red-strong">
          Experimento em curso
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        Variante A = &quot;Ponha o seu negócio à frente de mais pessoas da sua zona.&quot; ·
        Variante B = &quot;Faça mais pessoas da sua zona conhecerem o seu negócio.&quot; Resto do
        Hero é igual nas duas. Métrica principal: taxa visitante → pagamento.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {report.map((variant) => (
          <div key={variant.variant} className="rounded-md border border-line p-5">
            <h3 className="text-[14px] font-bold">Hero {variant.variant}</h3>
            <dl className="mt-3">
              <StatRow label="Visitantes" value={formatNumber(variant.visitors)} />
              <StatRow label="Cliques no CTA principal" value={formatNumber(variant.ctaClicks)} />
              <StatRow label="Entradas em /pedido" value={formatNumber(variant.checkoutsStarted)} />
              <StatRow label="Cliques em pagar" value={formatNumber(variant.paymentClicks)} />
              <StatRow
                label="Stripe sessions criadas"
                value={formatNumber(variant.stripeSessionsCreated)}
              />
              <StatRow label="Encomendas criadas" value={formatNumber(variant.ordersCreated)} />
              <StatRow label="Pagamentos concluídos" value={formatNumber(variant.paymentsCompleted)} />
              <StatRow label="Visitante → clique no CTA" value={formatRate(variant.ctaClickRate)} />
              <StatRow
                label="Visitante → entrada em /pedido"
                value={formatRate(variant.checkoutConversionRate)}
              />
              <StatRow
                label="Entrada em /pedido → clique em pagar"
                value={formatRate(variant.checkoutToPaymentClickRate)}
              />
              <StatRow
                label="Clique em pagar → Stripe session criada"
                value={formatRate(variant.paymentClickToSessionRate)}
              />
              <StatRow
                label="Stripe session criada → pagamento"
                value={formatRate(variant.sessionToPaymentRate)}
              />
              <StatRow
                label="Visitante → pagamento"
                value={formatRate(variant.purchaseConversionRate)}
                highlight
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

const LANDING_VARIANT_LABELS: Record<LandingVariant, string> = {
  NORMAL: "Normal (/)",
  SALES: "Sales (/anunciar)",
  BLOG: "Blog",
};

/**
 * Resultados do experimento A/B/C das landing pages (`landing_page_v1` — ver
 * `src/lib/landing-experiment.ts`). Ao contrário dos testes acima, esta
 * variante é atribuída por SESSÃO (não sticky 30 dias) através da rota
 * `/go` — só entram aqui visitantes que vieram de uma campanha com esse
 * link. Métricas principais: taxa de conversão (visitante → pagamento) e
 * receita por visitante, para comparar páginas com estruturas e preços
 * diferentes de forma justa.
 */
function LandingExperimentSection({ report }: { report: LandingVariantReport[] }) {
  return (
    <section className="mt-10 rounded-lg border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-black">A/B/C Test — Landing Pages</h2>
        <span className="rounded-full bg-red-strong/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-red-strong">
          Experimento em curso
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        Tráfego de campanhas distribuído por `/go` entre a home, a página de vendas (`/anunciar`)
        e o artigo do blog — atribuição por sessão (nunca sticky para sempre). Métricas
        principais: conversão (visitante → pagamento) e receita por visitante.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {report.map((variant) => (
          <div key={variant.variant} className="rounded-md border border-line p-5">
            <h3 className="text-[14px] font-bold">{LANDING_VARIANT_LABELS[variant.variant]}</h3>
            <dl className="mt-3">
              <StatRow label="Visitantes" value={formatNumber(variant.visitors)} />
              <StatRow label="Sessões (visitas)" value={formatNumber(variant.sessions)} />
              <StatRow label="Cliques CTA / preços vistos" value={formatNumber(variant.ctaClicks)} />
              <StatRow label="Checkouts iniciados" value={formatNumber(variant.checkoutsStarted)} />
              <StatRow label="Cliques em pagar" value={formatNumber(variant.paymentClicks)} />
              <StatRow
                label="Stripe sessions criadas"
                value={formatNumber(variant.stripeSessionsCreated)}
              />
              <StatRow label="Encomendas criadas" value={formatNumber(variant.ordersCreated)} />
              <StatRow label="Pagamentos concluídos" value={formatNumber(variant.paymentsCompleted)} />
              <StatRow label="Visitante → clique CTA" value={formatRate(variant.ctaClickRate)} />
              <StatRow
                label="Visitante → checkout iniciado"
                value={formatRate(variant.checkoutConversionRate)}
              />
              <StatRow
                label="Conversão (visitante → pagamento)"
                value={formatRate(variant.purchaseConversionRate)}
                highlight
              />
              <StatRow label="Receita (sessão/direta)" value={formatPrice(variant.revenueCents)} />
              <StatRow
                label="Receita por visitante"
                value={
                  variant.revenuePerVisitorCents !== null
                    ? formatPrice(Math.round(variant.revenuePerVisitorCents))
                    : "—"
                }
                highlight
              />
              <StatRow
                label="Receita por sessão"
                value={
                  variant.revenuePerSessionCents !== null
                    ? formatPrice(Math.round(variant.revenuePerSessionCents))
                    : "—"
                }
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function landingAttributionRows(counts: VariantAttributionCounts[]): VariantAttributionCounts[] {
  const order: LandingVariant[] = ["NORMAL", "SALES", "BLOG"];
  return order.map(
    (variant) => counts.find((count) => count.variant === variant) ?? { variant, purchases: 0, revenueCents: 0 },
  );
}

/** Uma tabela compacta (variante · compras · receita) para um dos 4 modelos de attribution. */
function AttributionModelTable({
  title,
  description,
  counts,
}: {
  title: string;
  description: string;
  counts: VariantAttributionCounts[];
}) {
  return (
    <div className="rounded-md border border-line p-5">
      <h3 className="text-[14px] font-bold">{title}</h3>
      <p className="mt-1 text-[12px] text-muted">{description}</p>
      <dl className="mt-3">
        {landingAttributionRows(counts).map((count) => (
          <div
            key={count.variant}
            className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"
          >
            <dt className="text-[13px] text-muted">{LANDING_VARIANT_LABELS[count.variant]}</dt>
            <dd className="text-right text-[13px] font-semibold text-ink">
              {hasEnoughSample(count.purchases) ? (
                <>
                  {formatNumber(count.purchases)} compras · {formatPrice(count.revenueCents)}
                </>
              ) : (
                <span className="text-muted">
                  {formatNumber(count.purchases)} compras · dados insuficientes
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Attribution do experimento de landing ao longo de VÁRIAS sessões (ver
 * `src/lib/landing-attribution.ts`) — capacidade nova face aos testes de
 * Preços/Hero. Os 4 modelos são leituras diferentes do MESMO conjunto de
 * compras pagas — nunca somar a receita entre eles. "Dados insuficientes"
 * aparece sempre que uma variante tem menos de 30 compras nesse modelo, para
 * não sugerir um vencedor sem volume suficiente.
 */
function LandingAttributionSection({ report }: { report: LandingAttributionReport }) {
  return (
    <section className="mt-10 rounded-lg border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-black">Landing Pages — Attribution</h2>
        <span className="text-[12px] text-muted">
          {formatNumber(report.totalPaidOrders)} encomendas pagas com visitante identificado
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        4 leituras diferentes das MESMAS compras — nunca somar a receita entre elas. Direta/sessão
        = variante da sessão em que a compra foi criada; first/last-touch = 1ª/última exposição
        antes da compra (pode ter acontecido numa sessão anterior); assistida = qualquer variante
        vista antes da compra (uma compra pode contar para mais do que uma).
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AttributionModelTable
          title="Direta / sessão"
          description="Variante ativa no momento da compra."
          counts={report.direct}
        />
        <AttributionModelTable
          title="First-touch"
          description="1ª exposição do visitante, mesmo que noutra sessão."
          counts={report.firstTouch}
        />
        <AttributionModelTable
          title="Last-touch"
          description="Última exposição antes da compra."
          counts={report.lastTouch}
        />
        <AttributionModelTable
          title="Assistida (any-touch)"
          description="Qualquer variante vista antes da compra."
          counts={report.assisted}
        />
      </div>
    </section>
  );
}

/**
 * Jornadas mais comuns até à compra (ex.: Blog → Sales) — versão simples,
 * sem árvore de decisão nem estatística avançada (ver
 * `computeLandingJourneyReport`). Útil para perceber o papel do blog em
 * conversões assistidas mesmo quando não é a página onde a compra "nasce".
 */
function LandingJourneySection({ journeys }: { journeys: JourneyAggregate[] }) {
  const topJourneys = journeys.slice(0, 10);

  return (
    <section className="mt-10 rounded-lg border border-line p-6">
      <h2 className="text-[18px] font-black">Landing Pages — Jornadas mais comuns</h2>
      <p className="mt-1.5 text-[13px] text-muted">
        Sequência de variantes vistas antes de cada compra (repetições consecutivas colapsadas —
        ex.: Blog, Blog, Sales conta como Blog → Sales).
      </p>

      {topJourneys.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted">Ainda não há compras suficientes para mostrar jornadas.</p>
      ) : (
        <dl className="mt-4">
          {topJourneys.map((journey) => (
            <div
              key={journey.label}
              className="flex items-center justify-between border-b border-line/60 py-2.5 last:border-0"
            >
              <dt className="text-[13px] font-semibold text-ink">{journey.label}</dt>
              <dd className="text-right text-[13px] text-muted">
                {formatNumber(journey.purchases)} compras · {formatPrice(journey.revenueCents)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

const DIAGNOSTIC_HERO_VARIANT_LABELS: Record<DiagnosticHeroVariant, string> = {
  PAIN: "A — Dor",
  WORD_OF_MOUTH: "B — Boca-a-boca",
  GROWTH: "C — Crescimento",
};

const DIAGNOSTIC_HERO_VARIANT_ORDER: DiagnosticHeroVariant[] = ["PAIN", "WORD_OF_MOUTH", "GROWTH"];

/** Mostra "Dados insuficientes" em vez da taxa quando a amostra (visitantes
 * ou compras, dependendo da métrica) ainda é pequena demais para sugerir
 * qualquer vencedor — mesmo corte simples de `hasEnoughSample` (30). */
function formatRateOrInsufficient(value: number | null, sampleSize: number): string {
  if (!hasEnoughSample(sampleSize)) return "Dados insuficientes";
  return formatRate(value);
}

/**
 * Resultados do A/B/C test da headline+subtítulo do Hero de `/diagnostico`
 * (`diagnostic_hero_v1`, ver `src/lib/diagnostic-hero-experiment.ts`) — só a
 * mensagem do Hero muda entre as 3 variantes, todo o resto do funil é
 * idêntico. Tráfego de QA (`?hero=`/`?diagnostic_debug=true`) já vem
 * excluído destes números. Métrica principal: Diagnostic Start Rate
 * (visitante exposto ao Hero → diagnóstico iniciado). "Dados insuficientes"
 * aparece nas taxas de compra/receita e na taxa principal enquanto a
 * amostra relevante tiver menos de {MIN_SAMPLE_SIZE} — nunca declarar
 * vencedor cedo demais só pelo clique (secção 10 do pedido): comparar
 * sempre a taxa de início com completion/checkout/purchase rate e receita
 * por visitante antes de tirar conclusões.
 */
function DiagnosticHeroExperimentSection({ report }: { report: DiagnosticHeroVariantReport[] }) {
  const orderedReport = DIAGNOSTIC_HERO_VARIANT_ORDER.map(
    (variant) => report.find((entry) => entry.variant === variant) ?? null,
  ).filter((entry): entry is DiagnosticHeroVariantReport => entry !== null);

  return (
    <section className="mt-10 rounded-lg border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-black">Diagnóstico — Teste de Hero</h2>
        <span className="rounded-full bg-red-strong/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-red-strong">
          Experimento em curso
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        A — &quot;Se amanhã precisasse de mais clientes...&quot; (dor/previsibilidade) · B —
        &quot;O seu negócio depende demasiado do boca-a-boca?&quot; · C — &quot;Descubra o que
        pode estar a limitar o crescimento...&quot; (crescimento/oportunidade). Só headline +
        subtítulo do Hero mudam — resto de `/diagnostico` é idêntico nas 3. Métrica principal:
        Diagnostic Start Rate (visitante exposto → diagnóstico iniciado).
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {orderedReport.map((variant) => (
          <div key={variant.variant} className="rounded-md border border-line p-5">
            <h3 className="text-[14px] font-bold">{DIAGNOSTIC_HERO_VARIANT_LABELS[variant.variant]}</h3>
            <dl className="mt-3">
              <StatRow label="Visitantes (viram o Hero)" value={formatNumber(variant.visitors)} />
              <StatRow label="Cliques em «Fazer diagnóstico»" value={formatNumber(variant.ctaClicks)} />
              <StatRow label="Visitante → clique no CTA" value={formatRate(variant.ctaClickRate)} />
              <StatRow label="Diagnósticos iniciados" value={formatNumber(variant.starts)} />
              <StatRow
                label="Diagnostic Start Rate"
                value={formatRateOrInsufficient(variant.startRate, variant.visitors)}
                highlight
              />
              <StatRow label="Diagnósticos concluídos" value={formatNumber(variant.completed)} />
              <StatRow label="Início → concluído" value={formatRate(variant.completionRate)} />
              <StatRow label="Preview iniciado" value={formatNumber(variant.previewStarted)} />
              <StatRow label="Preview concluído" value={formatNumber(variant.previewCompleted)} />
              <StatRow label="Concluído → preview iniciado" value={formatRate(variant.previewRate)} />
              <StatRow label="Checkouts iniciados (/pedido)" value={formatNumber(variant.checkoutStarted)} />
              <StatRow label="Concluído → checkout iniciado" value={formatRate(variant.checkoutRate)} />
              <StatRow label="Encomendas criadas" value={formatNumber(variant.ordersCreated)} />
              <StatRow label="Compras (pagamentos concluídos)" value={formatNumber(variant.paymentsCompleted)} />
              <StatRow
                label="Purchase CR (visitante → pagamento)"
                value={formatRateOrInsufficient(variant.purchaseRate, variant.paymentsCompleted)}
                highlight
              />
              <StatRow
                label="Receita"
                value={
                  hasEnoughSample(variant.paymentsCompleted)
                    ? formatPrice(variant.revenueCents)
                    : "Dados insuficientes"
                }
              />
              <StatRow
                label="Receita por visitante"
                value={
                  hasEnoughSample(variant.paymentsCompleted) && variant.revenuePerVisitorCents !== null
                    ? formatPrice(Math.round(variant.revenuePerVisitorCents))
                    : "Dados insuficientes"
                }
                highlight
              />
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Uma tabela compacta (valor da resposta · compras · receita) para uma dimensão de segmentação. */
function DiagnosticSegmentTable({ title, counts }: { title: string; counts: DiagnosticSegmentCount[] }) {
  return (
    <div className="rounded-md border border-line p-5">
      <h3 className="text-[14px] font-bold">{title}</h3>
      {counts.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted">Ainda sem compras com esta resposta.</p>
      ) : (
        <dl className="mt-2">
          {counts.map((count) => (
            <div
              key={count.value}
              className="flex items-center justify-between border-b border-line/60 py-2 last:border-0"
            >
              <dt className="text-[13px] text-muted">{count.label}</dt>
              <dd className="text-right text-[13px] font-semibold text-ink">
                {hasEnoughSample(count.purchases) ? (
                  <>
                    {formatNumber(count.purchases)} compras · {formatPrice(count.revenueCents)}
                  </>
                ) : (
                  <span className="text-muted">
                    {formatNumber(count.purchases)} compras · dados insuficientes
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/**
 * Funil próprio de `/diagnostico` (diagnóstico → resultado → preview do
 * anúncio → recomendação → checkout — ver `src/lib/diagnostic-report.ts`).
 * Não é um teste A/B/C (não há sorteio nem variantes): é uma origem de
 * tráfego adicional, comparável às outras via `Order.funnelSource`. Métrica
 * principal: conversão (início do diagnóstico → pagamento).
 */
function DiagnosticFunnelSection({
  report,
  segmentation,
}: {
  report: DiagnosticFunnelRates;
  segmentation: DiagnosticSegmentationReport;
}) {
  return (
    <section className="mt-10 rounded-lg border border-line p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[18px] font-black">Funil de Diagnóstico (/diagnostico)</h2>
        <span className="rounded-full bg-ink/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-ink">
          Origem de tráfego
        </span>
      </div>
      <p className="mt-1.5 text-[13px] text-muted">
        6 perguntas → resultado personalizado → preview do anúncio → recomendação de campanha →
        checkout pré-preenchido. Métrica principal: início do diagnóstico → pagamento.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-line p-5">
          <h3 className="text-[14px] font-bold">Funil (início → resultado → preview)</h3>
          <dl className="mt-3">
            <StatRow label="Visitantes que começaram" value={formatNumber(report.visitors)} />
            <StatRow label="Diagnósticos iniciados" value={formatNumber(report.starts)} />
            <StatRow label="Diagnósticos concluídos (6 respostas)" value={formatNumber(report.completed)} />
            <StatRow
              label="Início → concluído"
              value={formatRate(report.startToCompletedRate)}
            />
            <StatRow label="Resultado visto" value={formatNumber(report.resultViewed)} />
            <StatRow
              label="Concluído → resultado visto"
              value={formatRate(report.completedToResultRate)}
            />
            <StatRow label="Preview iniciado" value={formatNumber(report.previewStarted)} />
            <StatRow
              label="Resultado → preview iniciado"
              value={formatRate(report.resultToPreviewRate)}
            />
            <StatRow label="Preview concluído" value={formatNumber(report.previewCompleted)} />
          </dl>
        </div>

        <div className="rounded-md border border-line p-5">
          <h3 className="text-[14px] font-bold">Recomendação → checkout → pagamento</h3>
          <dl className="mt-3">
            <StatRow label="Recomendação vista" value={formatNumber(report.recommendationViewed)} />
            <StatRow
              label="Preview → recomendação vista"
              value={formatRate(report.previewToRecommendationRate)}
            />
            <StatRow
              label="Clique no plano recomendado"
              value={formatNumber(report.recommendedPlanClicked)}
            />
            <StatRow
              label="Recomendação → clique no plano"
              value={formatRate(report.recommendationToPlanClickRate)}
            />
            <StatRow label="Checkouts iniciados (/pedido)" value={formatNumber(report.checkoutStarted)} />
            <StatRow
              label="Clique no plano → checkout iniciado"
              value={formatRate(report.planClickToCheckoutRate)}
            />
            <StatRow label="Cliques em pagar" value={formatNumber(report.paymentClicks)} />
            <StatRow
              label="Checkout iniciado → clique em pagar"
              value={formatRate(report.checkoutToPaymentClickRate)}
            />
            <StatRow label="Stripe sessions criadas" value={formatNumber(report.stripeSessionsCreated)} />
            <StatRow
              label="Clique em pagar → Stripe session criada"
              value={formatRate(report.paymentClickToSessionRate)}
            />
            <StatRow label="Encomendas criadas" value={formatNumber(report.ordersCreated)} />
            <StatRow label="Pagamentos concluídos" value={formatNumber(report.paymentsCompleted)} />
            <StatRow
              label="Stripe session criada → pagamento"
              value={formatRate(report.sessionToPaymentRate)}
            />
            <StatRow
              label="Conversão (início → pagamento)"
              value={formatRate(report.purchaseConversionRate)}
              highlight
            />
            <StatRow label="Receita total" value={formatPrice(report.revenueCents)} />
            <StatRow
              label="Receita por início"
              value={
                report.revenuePerStartCents !== null
                  ? formatPrice(Math.round(report.revenuePerStartCents))
                  : "—"
              }
              highlight
            />
            <StatRow
              label="Receita por diagnóstico concluído"
              value={
                report.revenuePerCompletedCents !== null
                  ? formatPrice(Math.round(report.revenuePerCompletedCents))
                  : "—"
              }
            />
          </dl>
        </div>
      </div>

      <h3 className="mt-6 text-[13px] font-bold uppercase tracking-[0.1em] text-muted">
        Segmentação das compras por resposta
      </h3>
      <p className="mt-1 text-[12px] text-muted">
        Só compras pagas vindas do diagnóstico. &quot;Dados insuficientes&quot; abaixo de{" "}
        {MIN_SAMPLE_SIZE} compras nesse valor, para não sugerir conclusões precipitadas.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DiagnosticSegmentTable title="Canal de aquisição hoje" counts={segmentation.byChannel} />
        <DiagnosticSegmentTable title="Urgência" counts={segmentation.byUrgency} />
        <DiagnosticSegmentTable title="Objetivo" counts={segmentation.byGoal} />
        <DiagnosticSegmentTable
          title="Alcance previsível (auto-avaliado)"
          counts={segmentation.byPredictableReach}
        />
        <DiagnosticSegmentTable title="Pack recomendado" counts={segmentation.byRecommendedPack} />
      </div>
    </section>
  );
}
