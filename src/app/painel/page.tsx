import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusPill } from "@/components/painel/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { FREQUENCY_LABELS, campaignName, progress } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function CampanhasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      cycles: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[28px] font-black leading-tight">Campanhas</h1>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-lg border border-line p-8">
          <p className="text-[15px] text-muted">Ainda não tem campanhas.</p>
          <ButtonLink href="/#precos" size="lg" className="mt-6">
            Comprar visualizações
          </ButtonLink>
        </div>
      ) : (
        <ul className="mt-8 border-t border-line">
          {orders.map((order) => {
            const cycle = order.cycles[0];
            const deliveredViews = cycle?.deliveredViews ?? order.visualizationsDelivered;
            const targetViews = cycle?.targetViews ?? order.visualizationsPurchased;

            return (
              <li key={order.id}>
                <Link
                  href={`/painel/campanhas/${order.id}`}
                  className="flex flex-col gap-3 border-b border-line py-5 transition-colors hover:bg-surface sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="block text-[16px] font-semibold">
                      {campaignName(user.companyName, order.zone)}
                    </span>
                    <span className="mt-1 block text-[13px] text-muted">
                      {formatDate(order.createdAt)} ·{" "}
                      {formatNumber(order.visualizationsPurchased)} visualizações ·{" "}
                      {FREQUENCY_LABELS[order.billingFrequency]}
                    </span>
                  </span>

                  <span className="flex items-center gap-6">
                    <StatusPill status={order.status} />
                    <span className="text-[15px] font-bold tabular-nums">
                      {progress(deliveredViews, targetViews)}%
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
