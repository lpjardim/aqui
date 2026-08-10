import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PricingVariant, ExperimentEventType } from "@/generated/prisma/enums";
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
      const [visitors, ctaClicks, checkoutsStarted, orders] = await Promise.all([
        distinctVisitorCount(variant, ExperimentEventType.PRICING_EXPOSED),
        distinctVisitorCount(variant, ExperimentEventType.PRICING_CTA_CLICKED),
        distinctVisitorCount(variant, ExperimentEventType.CHECKOUT_STARTED),
        prisma.order.findMany({
          where: { pricingVariant: variant, pricingExperimentDebug: false },
          select: { status: true, billingFrequency: true, price: true },
        }),
      ]);

      // "Pagamento concluído" = chegou a ser confirmado pelo Stripe pelo
      // menos uma vez (saiu de PENDING_PAYMENT), independentemente do estado
      // operacional seguinte (em revisão, reembolsada, etc.).
      const paidOrders = orders.filter((order) => order.status !== "PENDING_PAYMENT");

      const counts: VariantRawCounts = {
        visitors,
        ctaClicks,
        checkoutsStarted,
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
