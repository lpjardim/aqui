import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { formatDate, formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import { STATUS_LABELS, progress } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getLastMetaSyncAt } from "@/lib/meta";
import { AdminLogin } from "./admin-login";
import { MetaSyncButton } from "./meta-sync-button";
import { DeleteOrderButton } from "./delete-order-button";
import {
  adminLogout,
  markCompleted,
  updateMeta,
  updateStatus,
  uploadProof,
} from "./actions";
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

  const [orders, lastMetaSyncAt] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true, assets: true },
    }),
    getLastMetaSyncAt(),
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
        {orders.map((order) => (
          <article
            key={order.id}
            id={`order-${order.id}`}
            className="scroll-mt-6 rounded-lg border border-line p-6"
          >
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-bold">{order.user.companyName}</h2>
                <p className="mt-1 text-[13px] text-muted">
                  {order.user.name} · {order.user.email} · {order.user.phone}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {order.zone} · {formatNumber(order.visualizationsPurchased)} visualizações ·{" "}
                  {formatPrice(order.price)} · {formatDate(order.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[20px] font-black tabular-nums">
                  {progress(order.visualizationsDelivered, order.visualizationsPurchased)}%
                </p>
                <p className="text-[12px] text-muted">
                  {formatNumber(order.visualizationsDelivered)} /{" "}
                  {formatNumber(order.visualizationsPurchased)}
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
                  Meta
                </h3>
                <div className="text-right">
                  <p className="text-[12px] text-muted">
                    Visualizações entregues (via Meta):{" "}
                    <span className="font-semibold text-ink">
                      {formatNumber(order.visualizationsDelivered)} /{" "}
                      {formatNumber(order.visualizationsPurchased)}
                    </span>
                  </p>
                  {order.targetReachedAt && (
                    <p className="mt-0.5 text-[12px] text-muted">
                      Alvo atingido em {formatDateTime(order.targetReachedAt)}
                    </p>
                  )}
                </div>
              </div>

              <form action={updateMeta} className="mt-3 flex flex-wrap items-end gap-3">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="text-[12px] text-muted">
                  Meta Campaign ID
                  <input
                    type="text"
                    name="metaCampaignId"
                    defaultValue={order.metaCampaignId ?? ""}
                    className={`mt-1 block w-44 ${inputClass}`}
                  />
                </label>
                <label className="text-[12px] text-muted">
                  Meta Ad Set ID
                  <input
                    type="text"
                    name="metaAdSetId"
                    defaultValue={order.metaAdSetId ?? ""}
                    className={`mt-1 block w-44 ${inputClass}`}
                  />
                </label>
                <label className="text-[12px] text-muted">
                  Meta Ad ID
                  <input
                    type="text"
                    name="metaAdId"
                    defaultValue={order.metaAdId ?? ""}
                    className={`mt-1 block w-44 ${inputClass}`}
                  />
                </label>
                <label className="text-[12px] text-muted">
                  Link do anúncio
                  <input
                    type="url"
                    name="metaAdUrl"
                    placeholder="https://..."
                    defaultValue={order.metaAdUrl ?? ""}
                    className={`mt-1 block w-56 ${inputClass}`}
                  />
                </label>
                <Button variant="outline" className="h-10 px-4 text-[13px]">
                  Guardar
                </Button>
              </form>
            </div>
          </article>
        ))}

        {orders.length === 0 && <p className="text-[15px] text-muted">Ainda não há encomendas.</p>}
      </div>
    </main>
  );
}
