import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PricingVariant, ExperimentEventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { computeVariantRates, type VariantRawCounts, type VariantRates } from "@/lib/experiment-rates";

export { computeVariantRates, type VariantRawCounts, type VariantRates };

const PRICING_VARIANT_COOKIE = "pricing_variant";
const VISITOR_ID_COOKIE = "aqui_vid";
const DEBUG_COOKIE = "experiment_debug";

export type PricingContext = {
  variant: PricingVariant;
  visitorId: string;
  /** Tráfego forçado via `?a_variant=`/`?experiment_debug=true` — nunca entra nos KPIs. */
  isDebug: boolean;
};

/**
 * Lê a variante/visitante/debug já atribuídos pelo `middleware.ts` (cookies
 * `pricing_variant`/`aqui_vid`/`experiment_debug`). É a ÚNICA fonte de
 * verdade para a variante efetiva de cada request — nunca se confia num
 * valor de variante vindo do body de um pedido ou de um evento do cliente,
 * precisamente para impedir que tráfego forjado altere a atribuição real de
 * outro visitante ou poluir os resultados.
 */
export async function getPricingContext(): Promise<PricingContext> {
  const store = await cookies();
  const debugCookie = store.get(DEBUG_COOKIE)?.value ?? null;
  const baseVariant: PricingVariant =
    store.get(PRICING_VARIANT_COOKIE)?.value === "B" ? "B" : "A";
  const visitorId = store.get(VISITOR_ID_COOKIE)?.value ?? "unknown";
  const isDebug = debugCookie !== null;
  const variant: PricingVariant =
    debugCookie === "A" || debugCookie === "B" ? debugCookie : baseVariant;

  return { variant, visitorId, isDebug };
}

/**
 * Grava um evento do funil diretamente a partir do servidor (ex.: em
 * `/api/pedido`, depois de confirmar que a Stripe Session foi criada com
 * sucesso) — mesma tabela/forma que `/api/experiments/track`, mas sem
 * depender de um pedido extra do browser.
 */
export async function recordExperimentEvent(params: {
  eventType: ExperimentEventType;
  variant: PricingVariant;
  visitorId: string;
  isDebug: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.experimentEvent.create({
    data: {
      visitorId: params.visitorId,
      variant: params.variant,
      eventType: params.eventType,
      isDebug: params.isDebug,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export type VariantReport = VariantRates & { variant: PricingVariant };

async function distinctVisitorCount(
  variant: PricingVariant,
  eventType: ExperimentEventType,
): Promise<number> {
  const rows = await prisma.experimentEvent.findMany({
    where: { variant, eventType, isDebug: false },
    distinct: ["visitorId"],
    select: { visitorId: true },
  });
  return rows.length;
}

/**
 * Contagem simples (sem `distinct` por visitante) — usada para eventos que
 * já correspondem 1:1 a uma Stripe Session/Order (mesma base de contagem que
 * `ordersCreated`/`paymentsCompleted`, que também vêm da `Order`).
 */
async function rawEventCount(
  variant: PricingVariant,
  eventType: ExperimentEventType,
): Promise<number> {
  return prisma.experimentEvent.count({
    where: { variant, eventType, isDebug: false },
  });
}

/** Estados de `Order.status` que representam um pagamento efetivamente
 * concluído — inclui a progressão operacional normal pós-pagamento
 * (em revisão, ativa, concluída), mas nunca `PENDING_PAYMENT` (nunca pagou),
 * `REJECTED` (rejeitada) ou `REFUNDED` (dinheiro devolvido). */
const PAID_ORDER_STATUSES = ["PAID", "IN_REVIEW", "ACTIVE", "COMPLETED"] as const;

/**
 * Agrega os KPIs do A/B test por variante. Os eventos de funil
 * (exposição/clique/checkout iniciado) vêm do `ExperimentEvent`; tudo o que é
 * financeiro (encomendas criadas, pagamentos, ONE_TIME vs MONTHLY, receita)
 * vem sempre diretamente da `Order` — nunca de eventos do cliente. Tráfego
 * de debug (`isDebug`/`pricingExperimentDebug`) é sempre excluído.
 */
export async function getPricingExperimentReport(): Promise<VariantReport[]> {
  const variants: PricingVariant[] = [PricingVariant.A, PricingVariant.B];

  return Promise.all(
    variants.map(async (variant) => {
      const [visitors, ctaClicks, checkoutsStarted, paymentClicks, stripeSessionsCreated, orders] =
        await Promise.all([
          distinctVisitorCount(variant, ExperimentEventType.PRICING_EXPOSED),
          distinctVisitorCount(variant, ExperimentEventType.PRICING_CTA_CLICKED),
          distinctVisitorCount(variant, ExperimentEventType.CHECKOUT_STARTED),
          distinctVisitorCount(variant, ExperimentEventType.PAYMENT_CLICKED),
          rawEventCount(variant, ExperimentEventType.STRIPE_SESSION_CREATED),
          prisma.order.findMany({
            where: { pricingVariant: variant, pricingExperimentDebug: false },
            select: { status: true, billingFrequency: true, price: true },
          }),
        ]);

      // "Pagamento concluído" = encomenda que passou pelo pagamento com
      // sucesso — inclui a progressão operacional normal pós-pagamento
      // (em revisão/ativa/concluída), mas nunca encomendas que nunca pagaram,
      // foram rejeitadas ou foram reembolsadas.
      const paidOrders = orders.filter((order) =>
        (PAID_ORDER_STATUSES as readonly string[]).includes(order.status),
      );

      const counts: VariantRawCounts = {
        visitors,
        ctaClicks,
        checkoutsStarted,
        paymentClicks,
        stripeSessionsCreated,
        ordersCreated: orders.length,
        paymentsCompleted: paidOrders.length,
        oneTimePurchases: paidOrders.filter((order) => order.billingFrequency === "ONE_TIME")
          .length,
        monthlyPurchases: paidOrders.filter((order) => order.billingFrequency === "MONTHLY")
          .length,
        revenueCents: paidOrders.reduce((sum, order) => sum + order.price, 0),
      };

      return { variant, ...computeVariantRates(counts) };
    }),
  );
}
