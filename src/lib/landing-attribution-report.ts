/**
 * Wrappers com acesso a BD do attribution do experimento `landing_page_v1` —
 * busca em lote (nunca N+1) e delega toda a matemática para
 * `landing-attribution.ts` (puro, sem Prisma, testável isoladamente).
 */
import { prisma } from "@/lib/prisma";
import { LandingEventType } from "@/generated/prisma/enums";
import {
  computeLandingAttributionReport,
  computeLandingJourneyReport,
  type ExposureInput,
  type JourneyAggregate,
  type LandingAttributionReport,
  type PurchaseOrderInput,
} from "@/lib/landing-attribution";

const PAID_ORDER_STATUSES = ["PAID", "IN_REVIEW", "ACTIVE", "COMPLETED"] as const;

async function loadPurchaseOrdersAndExposures(): Promise<{
  orders: PurchaseOrderInput[];
  exposures: ExposureInput[];
}> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...PAID_ORDER_STATUSES] },
      visitorId: { not: null },
    },
    select: {
      id: true,
      visitorId: true,
      landingVariant: true,
      landingExperimentDebug: true,
      price: true,
      createdAt: true,
    },
  });

  const visitorIds = [...new Set(orders.map((order) => order.visitorId).filter((id): id is string => !!id))];

  const exposureRows =
    visitorIds.length === 0
      ? []
      : await prisma.landingExperimentEvent.findMany({
          where: { visitorId: { in: visitorIds }, eventType: LandingEventType.EXPOSURE, isDebug: false },
          select: { visitorId: true, variant: true, createdAt: true },
        });

  const purchaseOrders: PurchaseOrderInput[] = orders.map((order) => ({
    id: order.id,
    visitorId: order.visitorId as string,
    landingVariant: order.landingExperimentDebug ? null : order.landingVariant,
    price: order.price,
    createdAt: order.createdAt,
  }));

  return { orders: purchaseOrders, exposures: exposureRows };
}

/**
 * Busca em lote (não N+1): todas as Orders pagas com `visitorId` conhecido +
 * todo o histórico de `EXPOSURE` desses visitantes — depois delega a
 * agregação para `computeLandingAttributionReport`.
 */
export async function getLandingAttributionReport(): Promise<LandingAttributionReport> {
  const { orders, exposures } = await loadPurchaseOrdersAndExposures();
  return computeLandingAttributionReport(orders, exposures);
}

export async function getLandingJourneyReport(): Promise<JourneyAggregate[]> {
  const { orders, exposures } = await loadPurchaseOrdersAndExposures();
  return computeLandingJourneyReport(orders, exposures);
}
