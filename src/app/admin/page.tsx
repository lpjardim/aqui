import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth";
import { formatDate, formatNumber, formatPrice } from "@/lib/format";
import { STATUS_LABELS, progress } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { AdminLogin } from "./admin-login";
import {
  adminLogout,
  markCompleted,
  updateDelivered,
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

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, assets: true },
  });

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

      <h1 className="mt-10 text-[26px] font-black">Encomendas</h1>
      <p className="mt-2 text-[14px] text-muted">{orders.length} no total</p>

      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-lg border border-line p-6">
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

              <form action={updateDelivered} className="flex items-end gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="text-[12px] text-muted">
                  Visualizações entregues
                  <input
                    type="number"
                    name="delivered"
                    min={0}
                    max={order.visualizationsPurchased}
                    defaultValue={order.visualizationsDelivered}
                    className={`mt-1 block w-40 ${inputClass}`}
                  />
                </label>
                <Button variant="outline" className="h-10 px-4 text-[13px]">
                  Atualizar
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
          </article>
        ))}

        {orders.length === 0 && <p className="text-[15px] text-muted">Ainda não há encomendas.</p>}
      </div>
    </main>
  );
}
