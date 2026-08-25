import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { HeroVariant, HeroEventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  computeHeroVariantRates,
  type HeroVariantRawCounts,
  type HeroVariantRates,
} from "@/lib/hero-experiment-rates";

export { computeHeroVariantRates, type HeroVariantRawCounts, type HeroVariantRates };

const HERO_VARIANT_COOKIE = "hero_variant";
const VISITOR_ID_COOKIE = "aqui_vid";
const HERO_DEBUG_COOKIE = "hero_debug";

export type HeroContext = {
  variant: HeroVariant;
  visitorId: string;
  /** Tráfego forçado via `?h_variant=`/`?experiment_debug=true` — nunca entra nos KPIs. */
  isDebug: boolean;
};

/**
 * Lê a variante/visitante/debug já atribuídos pelo `proxy.ts` (cookies
 * `hero_variant`/`aqui_vid`/`hero_debug`). Espelha `getPricingContext` de
 * `src/lib/experiments.ts`, mas para o teste independente da headline do
 * Hero — nunca partilha cookie de variante nem tabela de eventos com o teste
 * de preços. `aqui_vid` é a única cookie partilhada entre os dois testes
 * (só identifica o visitante, não atribui nenhuma variante).
 */
export async function getHeroContext(): Promise<HeroContext> {
  const store = await cookies();
  const debugCookie = store.get(HERO_DEBUG_COOKIE)?.value ?? null;
  const baseVariant: HeroVariant = store.get(HERO_VARIANT_COOKIE)?.value === "B" ? "B" : "A";
  const visitorId = store.get(VISITOR_ID_COOKIE)?.value ?? "unknown";
  const isDebug = debugCookie !== null;
  const variant: HeroVariant = debugCookie === "A" || debugCookie === "B" ? debugCookie : baseVariant;

  return { variant, visitorId, isDebug };
}

/**
 * Grava um evento do funil do teste do Hero diretamente a partir do
 * servidor (ex.: em `/api/pedido`, depois de confirmar que a Stripe Session
 * foi criada com sucesso) — mesmo padrão que `recordExperimentEvent` do
 * teste de preços, mas escrevendo em `HeroExperimentEvent`.
 */
export async function recordHeroExperimentEvent(params: {
  eventType: HeroEventType;
  variant: HeroVariant;
  visitorId: string;
  isDebug: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.heroExperimentEvent.create({
    data: {
      visitorId: params.visitorId,
      variant: params.variant,
      eventType: params.eventType,
      isDebug: params.isDebug,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export type HeroVariantReport = HeroVariantRates & { variant: HeroVariant };

async function distinctVisitorCount(
  variant: HeroVariant,
  eventType: HeroEventType,
): Promise<number> {
  const rows = await prisma.heroExperimentEvent.findMany({
    where: { variant, eventType, isDebug: false },
    distinct: ["visitorId"],
    select: { visitorId: true },
  });
  return rows.length;
}

async function rawEventCount(variant: HeroVariant, eventType: HeroEventType): Promise<number> {
  return prisma.heroExperimentEvent.count({
    where: { variant, eventType, isDebug: false },
  });
}

/** Mesma definição de "pago" que o teste de preços (ver `src/lib/experiments.ts`). */
const PAID_ORDER_STATUSES = ["PAID", "IN_REVIEW", "ACTIVE", "COMPLETED"] as const;

/**
 * Agrega os KPIs do A/B test do Hero por variante — Hero A vs Hero B. Os
 * eventos do funil (exposição/clique/checkout/pagamento) vêm do
 * `HeroExperimentEvent`; tudo o que é financeiro (encomendas criadas,
 * pagamentos) vem sempre diretamente da `Order` (campo `heroVariant`),
 * nunca de eventos do cliente. Tráfego de debug é sempre excluído.
 */
export async function getHeroExperimentReport(): Promise<HeroVariantReport[]> {
  const variants: HeroVariant[] = [HeroVariant.A, HeroVariant.B];

  return Promise.all(
    variants.map(async (variant) => {
      const [visitors, ctaClicks, checkoutsStarted, paymentClicks, stripeSessionsCreated, orders] =
        await Promise.all([
          distinctVisitorCount(variant, HeroEventType.HERO_EXPOSED),
          distinctVisitorCount(variant, HeroEventType.HERO_CTA_CLICKED),
          distinctVisitorCount(variant, HeroEventType.CHECKOUT_STARTED),
          distinctVisitorCount(variant, HeroEventType.PAYMENT_CLICKED),
          rawEventCount(variant, HeroEventType.STRIPE_SESSION_CREATED),
          prisma.order.findMany({
            where: { heroVariant: variant, heroExperimentDebug: false },
            select: { status: true },
          }),
        ]);

      const paymentsCompleted = orders.filter((order) =>
        (PAID_ORDER_STATUSES as readonly string[]).includes(order.status),
      ).length;

      const counts: HeroVariantRawCounts = {
        visitors,
        ctaClicks,
        checkoutsStarted,
        paymentClicks,
        stripeSessionsCreated,
        ordersCreated: orders.length,
        paymentsCompleted,
      };

      return { variant, ...computeHeroVariantRates(counts) };
    }),
  );
}
