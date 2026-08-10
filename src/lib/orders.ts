import { z } from "zod";
import { ZONES } from "@/lib/zones";
import { PACKS } from "@/lib/packs";
import { formatDate, formatNumber } from "@/lib/format";
import type { Order, User } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

export const orderInputSchema = z.object({
  zone: z.string().refine((value) => ZONES.includes(value), "Zona inválida."),
  packId: z.enum(PACKS.map((pack) => pack.id) as [string, ...string[]]),
  assets: z
    .array(
      z.object({
        url: z.string().min(1),
        fileType: z.string().min(1),
      }),
    )
    .min(1, "Envie pelo menos um ficheiro.")
    .max(5, "Máximo de 5 ficheiros."),
  name: z.string().trim().min(2, "Indique o seu nome."),
  companyName: z.string().trim().min(2, "Indique o nome da empresa."),
  email: z.email("Email inválido."),
  phone: z.string().trim().min(6, "Telefone inválido."),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguarda pagamento",
  PAID: "Pago",
  IN_REVIEW: "Em revisão",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  REJECTED: "Rejeitada",
  REFUNDED: "Reembolsada",
};

/** Estado mostrado ao cliente. Nunca expõe vocabulário de publicidade. */
export const CUSTOMER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Aguarda pagamento",
  PAID: "Em revisão",
  IN_REVIEW: "Em revisão",
  ACTIVE: "Ativa",
  COMPLETED: "Concluída",
  REJECTED: "Rejeitada",
  REFUNDED: "Reembolsada",
};

export function campaignName(companyName: string, zone: string): string {
  return `${companyName} — ${zone}`;
}

type OrderForMetaName = Pick<Order, "id" | "zone" | "createdAt"> & {
  user: Pick<User, "companyName">;
};

/**
 * Nome determinístico esperado para a campanha Meta correspondente a uma
 * encomenda: `{empresa} — {zona} — {data} — {shortOrderId}`.
 *
 * `shortOrderId` (últimos 4 caracteres do Order ID, em maiúsculas) garante
 * unicidade quando o mesmo cliente compra duas campanhas na mesma zona no
 * mesmo dia. Este nome é apenas interno/técnico para localizar a campanha na
 * Meta — nunca é mostrado ao cliente como título da campanha.
 */
export function getExpectedMetaCampaignName(order: OrderForMetaName): string {
  const shortOrderId = order.id.slice(-4).toUpperCase();
  return `${order.user.companyName} — ${order.zone} — ${formatDate(order.createdAt)} — ${shortOrderId}`;
}

export function checkoutLineName(visualizations: number, zone: string): string {
  return `${formatNumber(visualizations)} visualizações — ${zone}`;
}

export function progress(delivered: number, purchased: number): number {
  if (purchased <= 0) return 0;
  return Math.min(100, Math.round((delivered / purchased) * 100));
}
