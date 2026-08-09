import { redirect } from "next/navigation";
import { Download } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { campaignName } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

export default async function DocumentosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const orders = await prisma.order.findMany({
    where: { userId: user.id, proofUrl: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[28px] font-black leading-tight">Documentos</h1>

      {orders.length === 0 ? (
        <p className="mt-8 text-[15px] text-muted">
          Ainda não há comprovativos. Ficam disponíveis quando a campanha estiver concluída.
        </p>
      ) : (
        <ul className="mt-8 border-t border-line">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-col gap-3 border-b border-line py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <span className="block text-[15px] font-semibold">
                  Comprovativo de visualizações
                </span>
                <span className="mt-1 block text-[13px] text-muted">
                  {campaignName(user.companyName, order.zone)} · {formatDate(order.updatedAt)}
                </span>
              </span>

              <a
                href={order.proofUrl ?? "#"}
                download
                className={buttonClasses("outline", "md", "shrink-0")}
              >
                <Download className="size-4" />
                Descarregar
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
