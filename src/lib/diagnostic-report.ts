import { prisma } from "@/lib/prisma";
import { DiagnosticEventType } from "@/generated/prisma/enums";
import type { OrderStatus } from "@/generated/prisma/enums";
import { getPackByVisualizations } from "@/lib/packs";
import {
  ANSWER_LABELS,
  type BusinessGoal,
  type PredictableReach,
  type PrimaryAcquisitionChannel,
  type Urgency,
} from "@/lib/diagnostic/questions";
import {
  aggregateDiagnosticSegment,
  computeDiagnosticFunnelRates,
  type DiagnosticFunnelRates,
  type DiagnosticSegmentCount,
} from "@/lib/diagnostic-rates";

/** Mesma definição de "pago" que os outros relatórios (ver `src/lib/experiments.ts`). */
const PAID_ORDER_STATUSES = ["PAID", "IN_REVIEW", "ACTIVE", "COMPLETED"] as const;

function isPaidStatus(status: OrderStatus): boolean {
  return (PAID_ORDER_STATUSES as readonly string[]).includes(status);
}

async function distinctDiagnosticIdCount(eventType: DiagnosticEventType): Promise<number> {
  const rows = await prisma.diagnosticEvent.findMany({
    where: { eventType, isDebug: false },
    distinct: ["diagnosticId"],
    select: { diagnosticId: true },
  });
  return rows.length;
}

async function distinctVisitorCount(eventType: DiagnosticEventType): Promise<number> {
  const rows = await prisma.diagnosticEvent.findMany({
    where: { eventType, isDebug: false },
    distinct: ["visitorId"],
    select: { visitorId: true },
  });
  return rows.length;
}

/**
 * Agrega os KPIs do funil `/diagnostico` (secção 30 do pedido original) —
 * início, cada etapa, resultado, preview, recomendação, checkout,
 * pagamento e receita, com as respetivas taxas de conversão/drop-off entre
 * etapas consecutivas.
 */
export async function getDiagnosticFunnelReport(): Promise<DiagnosticFunnelRates> {
  const [
    visitors,
    starts,
    completed,
    resultViewed,
    previewStarted,
    previewCompleted,
    recommendationViewed,
    recommendedPlanClicked,
    checkoutStarted,
    paymentClicks,
    stripeSessionsCreated,
    orders,
  ] = await Promise.all([
    distinctVisitorCount(DiagnosticEventType.STARTED),
    distinctDiagnosticIdCount(DiagnosticEventType.STARTED),
    distinctDiagnosticIdCount(DiagnosticEventType.COMPLETED),
    distinctDiagnosticIdCount(DiagnosticEventType.RESULT_VIEWED),
    distinctDiagnosticIdCount(DiagnosticEventType.PREVIEW_STARTED),
    distinctDiagnosticIdCount(DiagnosticEventType.PREVIEW_COMPLETED),
    distinctDiagnosticIdCount(DiagnosticEventType.RECOMMENDATION_VIEWED),
    distinctDiagnosticIdCount(DiagnosticEventType.RECOMMENDED_PLAN_CLICKED),
    distinctDiagnosticIdCount(DiagnosticEventType.CHECKOUT_STARTED),
    distinctDiagnosticIdCount(DiagnosticEventType.PAYMENT_CLICKED),
    prisma.diagnosticEvent.count({
      where: { eventType: DiagnosticEventType.STRIPE_SESSION_CREATED, isDebug: false },
    }),
    prisma.order.findMany({
      where: { funnelSource: "diagnostic" },
      select: { status: true, price: true },
    }),
  ]);

  const paidOrders = orders.filter((order) => isPaidStatus(order.status));

  return computeDiagnosticFunnelRates({
    visitors,
    starts,
    completed,
    resultViewed,
    previewStarted,
    previewCompleted,
    recommendationViewed,
    recommendedPlanClicked,
    checkoutStarted,
    paymentClicks,
    stripeSessionsCreated,
    ordersCreated: orders.length,
    paymentsCompleted: paidOrders.length,
    revenueCents: paidOrders.reduce((sum, order) => sum + order.price, 0),
  });
}

export type DiagnosticSegmentationReport = {
  byChannel: DiagnosticSegmentCount[];
  byUrgency: DiagnosticSegmentCount[];
  byGoal: DiagnosticSegmentCount[];
  byPredictableReach: DiagnosticSegmentCount[];
  byRecommendedPack: DiagnosticSegmentCount[];
};

type DiagnosticOrderForSegmentation = {
  status: OrderStatus;
  price: number;
  visualizationsPurchased: number;
  diagnosticAnswers: unknown;
};

function readAnswerField(answers: unknown, key: string): string | null {
  if (typeof answers !== "object" || answers === null) return null;
  const value = (answers as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

/**
 * Segmentação simples (secção 31 do pedido original) das compras vindas do
 * diagnóstico por resposta real — canal, urgência, objetivo,
 * previsibilidade e pack recomendado. Só compras pagas entram aqui; a UI
 * (`DiagnosticFunnelSection`) decide quando um segmento tem amostra
 * suficiente para não sugerir conclusões precipitadas.
 */
export async function getDiagnosticSegmentationReport(): Promise<DiagnosticSegmentationReport> {
  const orders = await prisma.order.findMany({
    where: { funnelSource: "diagnostic" },
    select: {
      status: true,
      price: true,
      visualizationsPurchased: true,
      diagnosticAnswers: true,
    },
  });

  const paidOrders: DiagnosticOrderForSegmentation[] = orders.filter((order) =>
    isPaidStatus(order.status),
  );

  return {
    byChannel: aggregateDiagnosticSegment(
      paidOrders,
      (order) => readAnswerField(order.diagnosticAnswers, "primaryAcquisitionChannel"),
      (value) => ANSWER_LABELS.primaryAcquisitionChannel(value as PrimaryAcquisitionChannel),
    ),
    byUrgency: aggregateDiagnosticSegment(
      paidOrders,
      (order) => readAnswerField(order.diagnosticAnswers, "urgency"),
      (value) => ANSWER_LABELS.urgency(value as Urgency),
    ),
    byGoal: aggregateDiagnosticSegment(
      paidOrders,
      (order) => readAnswerField(order.diagnosticAnswers, "businessGoal"),
      (value) => ANSWER_LABELS.businessGoal(value as BusinessGoal),
    ),
    byPredictableReach: aggregateDiagnosticSegment(
      paidOrders,
      (order) => readAnswerField(order.diagnosticAnswers, "predictableReach"),
      (value) => ANSWER_LABELS.predictableReach(value as PredictableReach),
    ),
    byRecommendedPack: aggregateDiagnosticSegment(
      paidOrders,
      (order) => getPackByVisualizations(order.visualizationsPurchased)?.id ?? null,
      (value) => value.toUpperCase(),
    ),
  };
}
