import { z } from "zod";
import { ZONES } from "@/lib/zones";
import { formatDate, formatNumber } from "@/lib/format";
import { MAX_VIEWS, MIN_VIEWS } from "@/lib/pricing";
import type { Order, User } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

export const orderInputSchema = z.object({
  zone: z.string().refine((value) => ZONES.includes(value), "Zona inválida."),
  views: z.number().int().min(MIN_VIEWS, "Mínimo de 2.000 visualizações.").max(MAX_VIEWS, "Máximo de 200.000 visualizações."),
  billingFrequency: z.enum(["ONE_TIME", "MONTHLY"]),
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

/** Linguagem simples para o cliente — nunca "subscription"/"billing". */
export const FREQUENCY_LABELS: Record<"ONE_TIME" | "MONTHLY", string> = {
  ONE_TIME: "Uma vez",
  MONTHLY: "Todos os meses",
};

/** Estados de subscrição espelhados da Stripe, traduzidos para o admin. */
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  past_due: "Pagamento em falta",
  canceled: "Cancelada",
  unpaid: "Não paga",
  trialing: "Em teste",
  incomplete: "Incompleta",
  incomplete_expired: "Incompleta (expirada)",
  paused: "Pausada",
};
