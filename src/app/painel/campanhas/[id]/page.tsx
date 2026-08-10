import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "@/components/icons";
import { ProgressRing } from "@/components/painel/progress-ring";
import { StatusPill } from "@/components/painel/status-pill";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { campaignName, progress } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function CampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
  });

  if (!order) notFound();

  const percent = progress(order.visualizationsDelivered, order.visualizationsPurchased);
  const remaining = Math.max(0, order.visualizationsPurchased - order.visualizationsDelivered);
  const completed = order.status === "COMPLETED";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/painel" className="text-[13px] text-muted transition-colors hover:text-ink">
        ← Campanhas
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-black leading-tight">
          {campaignName(user.companyName, order.zone)} — {formatDate(order.createdAt)}
        </h1>
        {order.metaAdUrl && (
          <a
            href={order.metaAdUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            Ver anúncio ↗
          </a>
        )}
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_auto] md:items-start">
        <dl className="border-t border-line">
          <Row label="Zona" value={order.zone} />
          <Row label="Estado" value={<StatusPill status={order.status} />} />
          <Row
            label="Visualizações compradas"
            value={formatNumber(order.visualizationsPurchased)}
          />
          <Row
            label="Visualizações entregues"
            value={formatNumber(order.visualizationsDelivered)}
          />
          <Row label="Visualizações restantes" value={formatNumber(remaining)} />
        </dl>

        <div className="flex flex-col items-center gap-4">
          <ProgressRing
            percent={percent}
            delivered={order.visualizationsDelivered}
            purchased={order.visualizationsPurchased}
          />
          <p className="text-center text-[14px] font-medium">
            {completed
              ? "Campanha concluída"
              : `${formatNumber(order.visualizationsDelivered)} / ${formatNumber(
                  order.visualizationsPurchased,
                )} visualizações`}
          </p>
        </div>
      </div>

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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line py-4">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px] font-semibold">{value}</dd>
    </div>
  );
}
