import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "@/components/icons";
import { AdPreviewToggle } from "@/components/painel/ad-preview-toggle";
import { CancelRenewalButton } from "@/components/painel/cancel-renewal-button";
import { ProgressRing } from "@/components/painel/progress-ring";
import { StatusPill } from "@/components/painel/status-pill";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { getAdPreviewHtml, getMetaCampaignChildren } from "@/lib/meta";
import {
  FREQUENCY_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  campaignName,
  progress,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function CampanhaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anuncio?: string }>;
}) {
  const { id } = await params;
  const { anuncio } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { cycles: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!order) notFound();

  const cycle = order.cycles[0];
  const isMonthly = order.billingFrequency === "MONTHLY";
  const deliveredViews = cycle?.deliveredViews ?? order.visualizationsDelivered;
  const targetViews = cycle?.targetViews ?? order.visualizationsPurchased;

  const percent = progress(deliveredViews, targetViews);
  const remaining = Math.max(0, targetViews - deliveredViews);
  const completed = isMonthly ? cycle?.status === "COMPLETED" : order.status === "COMPLETED";
  const adPreview = await loadAdPreview(order.metaCampaignId, order.metaAdId);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/painel" className="text-[13px] text-muted transition-colors hover:text-ink">
        ← Campanhas
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-black leading-tight">
          {campaignName(user.companyName, order.zone)} — {formatDate(order.createdAt)}
        </h1>
        {adPreview ? (
          <AdPreviewToggle
            label={adPreview.label}
            html={adPreview.html}
            defaultOpen={anuncio === "1"}
          />
        ) : (
          order.metaAdUrl && (
            <a
              href={order.metaAdUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-muted underline underline-offset-2 transition-colors hover:text-ink"
            >
              Ver anúncio ↗
            </a>
          )
        )}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_auto] md:items-start">
        <dl className="border-t border-line">
          <Row label="Zona" value={order.zone} />
          <Row label="Estado" value={<StatusPill status={order.status} />} />
          <Row label="Frequência" value={FREQUENCY_LABELS[order.billingFrequency]} />
          <Row
            label={isMonthly ? "Visualizações/mês" : "Visualizações compradas"}
            value={formatNumber(targetViews)}
          />
          <Row
            label={isMonthly ? "Entregues neste ciclo" : "Visualizações entregues"}
            value={formatNumber(deliveredViews)}
          />
          <Row label="Visualizações restantes" value={formatNumber(remaining)} />
          {isMonthly && cycle && (
            <Row label="Próxima renovação" value={formatDate(cycle.endsAt)} />
          )}
          {isMonthly && (
            <Row
              label="Estado da subscrição"
              value={
                order.subscriptionStatus
                  ? SUBSCRIPTION_STATUS_LABELS[order.subscriptionStatus] ?? order.subscriptionStatus
                  : "—"
              }
            />
          )}
        </dl>

        <div className="flex flex-col items-center gap-4">
          <ProgressRing percent={percent} delivered={deliveredViews} purchased={targetViews} />
          <p className="text-center text-[14px] font-medium">
            {completed
              ? isMonthly
                ? "Ciclo concluído"
                : "Campanha concluída"
              : `${formatNumber(deliveredViews)} / ${formatNumber(targetViews)} visualizações`}
          </p>
        </div>
      </div>

      {isMonthly && (
        <div className="mt-10 border-t border-line pt-8">
          <h2 className="text-[15px] font-bold">Renovação mensal</h2>
          {order.cancelAtPeriodEnd ? (
            <p className="mt-2 text-[14px] text-muted">
              A renovação está cancelada. Esta campanha continua a decorrer até ao fim do ciclo
              atual e não será cobrada novamente.
            </p>
          ) : (
            <>
              <p className="mt-2 text-[14px] text-muted">
                Renova automaticamente todos os meses. Pode cancelar quando quiser — o ciclo atual
                continua normalmente até ao fim.
              </p>
              <div className="mt-4">
                <CancelRenewalButton orderId={order.id} />
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-10 border-t border-line pt-8">
        {order.proofUrl ? (
          <a
            href={order.proofUrl}
            download
            className={buttonClasses("outline", "lg", "w-full sm:w-auto")}
          >
            <Download className="size-4" />
            Descarregar comprovativo
          </a>
        ) : (
          <p className="text-[14px] text-muted">
            O comprovativo fica disponível quando a campanha estiver concluída.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Gera, no servidor e na hora, a pré-visualização de um anúncio da campanha
 * (Ad Previews API) — nunca é guardada na BD, porque o URL assinado
 * devolvido pela Meta expira. Falha em silêncio (devolve `null`) para nunca
 * partir a página do cliente por uma indisponibilidade da Meta.
 */
async function loadAdPreview(
  metaCampaignId: string | null,
  metaAdId: string | null,
): Promise<{ label: string; html: string } | null> {
  if (!metaCampaignId && !metaAdId) return null;

  try {
    let adId = metaAdId;
    let adCount = adId ? 1 : 0;

    if (metaCampaignId) {
      const children = await getMetaCampaignChildren(metaCampaignId);
      adCount = children.ads.length;
      adId = children.ads[0]?.id ?? adId;
    }

    if (!adId) return null;

    const html = await getAdPreviewHtml(adId);
    if (!html) return null;

    return { label: adCount > 1 ? "Ver anúncios" : "Ver anúncio", html };
  } catch (error) {
    console.error("[painel] falha ao gerar pré-visualização do anúncio:", error);
    return null;
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line py-4">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px] font-semibold">{value}</dd>
    </div>
  );
}
