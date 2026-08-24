import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { LandingVariant, LandingEventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  LANDING_SESSION_COOKIE,
  SESSION_ID_COOKIE,
  parseLandingSession,
  type LandingSessionState,
} from "@/lib/landing-experiment-constants";
import {
  computeLandingVariantRates,
  type LandingVariantRawCounts,
  type LandingVariantRates,
} from "@/lib/landing-experiment-rates";

export { computeLandingVariantRates, type LandingVariantRawCounts, type LandingVariantRates };

const VISITOR_ID_COOKIE = "aqui_vid";

export type LandingContext = {
  /** `null` = esta visita não passou por `/go` nesta sessão — não faz parte
   * do experimento (tráfego orgânico/direto às páginas). Nenhum evento deve
   * ser gravado nem nenhuma exposição contada quando `variant` é `null`. */
  variant: LandingVariant | null;
  visitorId: string;
  sessionId: string;
  experimentVisitId: string | null;
  /** Tráfego forçado via `/go?variant=`, nunca entra nos KPIs. */
  isDebug: boolean;
  session: LandingSessionState | null;
};

/**
 * Lê a variante/visitante/sessão já atribuídos pelo `middleware.ts` (cookies
 * `landing_session`/`aqui_vid`/`aqui_sid`). Espelha `getPricingContext`/
 * `getHeroContext`, mas com uma diferença importante: aqui `variant` pode ser
 * `null` — só existe uma variante ativa quando esta sessão passou por `/go`
 * (ao contrário de Preços/Hero, que atribuem sempre uma variante a todos os
 * visitantes, em qualquer rota).
 */
export async function getLandingContext(): Promise<LandingContext> {
  const store = await cookies();
  const visitorId = store.get(VISITOR_ID_COOKIE)?.value ?? "unknown";
  const sessionId = store.get(SESSION_ID_COOKIE)?.value ?? "unknown";
  const session = parseLandingSession(store.get(LANDING_SESSION_COOKIE)?.value);

  if (!session) {
    return { variant: null, visitorId, sessionId, experimentVisitId: null, isDebug: false, session: null };
  }

  return {
    variant: session.variant,
    visitorId,
    sessionId,
    experimentVisitId: session.visitId,
    isDebug: session.isDebug,
    session,
  };
}

/**
 * Grava um evento do funil do experimento de landing. É sempre um no-op
 * silencioso quando não há sessão ativa (`context.variant === null`) — esta
 * visita nunca passou por `/go`, portanto não deve poluir os KPIs.
 */
export async function recordLandingExperimentEvent(params: {
  eventType: LandingEventType;
  context: LandingContext;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { context } = params;
  if (!context.variant || !context.experimentVisitId) return;

  await prisma.landingExperimentEvent.create({
    data: {
      visitorId: context.visitorId,
      sessionId: context.sessionId,
      experimentVisitId: context.experimentVisitId,
      variant: context.variant,
      eventType: params.eventType,
      isDebug: context.isDebug,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export type LandingVariantReport = LandingVariantRates & { variant: LandingVariant };

async function distinctVisitorCount(
  variant: LandingVariant,
  eventType: LandingEventType,
): Promise<number> {
  const rows = await prisma.landingExperimentEvent.findMany({
    where: { variant, eventType, isDebug: false },
    distinct: ["visitorId"],
    select: { visitorId: true },
  });
  return rows.length;
}

/** "Sessões" do experimento — visitas distintas (`experiment_visit_id`), ao
 * contrário de "visitantes" (`aqui_vid`), que pode repetir-se entre sessões. */
async function distinctSessionCount(
  variant: LandingVariant,
  eventType: LandingEventType,
): Promise<number> {
  const rows = await prisma.landingExperimentEvent.findMany({
    where: { variant, eventType, isDebug: false },
    distinct: ["experimentVisitId"],
    select: { experimentVisitId: true },
  });
  return rows.length;
}

/**
 * Contagem simples (sem `distinct`) — usada para eventos que já
 * correspondem 1:1 a uma Stripe Session/Order, mesmo padrão de
 * `rawEventCount` em `src/lib/experiments.ts`.
 */
async function rawEventCount(variant: LandingVariant, eventType: LandingEventType): Promise<number> {
  return prisma.landingExperimentEvent.count({
    where: { variant, eventType, isDebug: false },
  });
}

/** Mesma definição de "pago" que os outros experimentos (ver `src/lib/experiments.ts`). */
const PAID_ORDER_STATUSES = ["PAID", "IN_REVIEW", "ACTIVE", "COMPLETED"] as const;

/**
 * Agrega os KPIs do experimento por variante — leitura "direct/session"
 * (conversão dentro da MESMA sessão de entrada). Para first/last/any-touch
 * (jornadas entre sessões) ver `src/lib/landing-attribution.ts`.
 */
export async function getLandingExperimentReport(): Promise<LandingVariantReport[]> {
  const variants: LandingVariant[] = [LandingVariant.NORMAL, LandingVariant.SALES, LandingVariant.BLOG];

  return Promise.all(
    variants.map(async (variant) => {
      const [visitors, sessions, ctaClicks, checkoutsStarted, paymentClicks, stripeSessionsCreated, orders] =
        await Promise.all([
          distinctVisitorCount(variant, LandingEventType.EXPOSURE),
          distinctSessionCount(variant, LandingEventType.EXPOSURE),
          distinctVisitorCount(variant, LandingEventType.CTA_CLICKED),
          distinctVisitorCount(variant, LandingEventType.CHECKOUT_STARTED),
          distinctVisitorCount(variant, LandingEventType.PAYMENT_CLICKED),
          rawEventCount(variant, LandingEventType.STRIPE_SESSION_CREATED),
          prisma.order.findMany({
            where: { landingVariant: variant, landingExperimentDebug: false },
            select: { status: true, price: true },
          }),
        ]);

      const paidOrders = orders.filter((order) =>
        (PAID_ORDER_STATUSES as readonly string[]).includes(order.status),
      );

      const counts: LandingVariantRawCounts = {
        visitors,
        sessions,
        ctaClicks,
        checkoutsStarted,
        paymentClicks,
        stripeSessionsCreated,
        ordersCreated: orders.length,
        paymentsCompleted: paidOrders.length,
        revenueCents: paidOrders.reduce((sum, order) => sum + order.price, 0),
      };

      return { variant, ...computeLandingVariantRates(counts) };
    }),
  );
}
