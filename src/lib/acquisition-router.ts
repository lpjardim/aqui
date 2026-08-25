import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { FunnelFamily, AcquisitionRouterEventType, LandingVariant } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  ACQUISITION_ROUTER_SESSION_COOKIE,
  parseAcquisitionRouterSession,
  type FunnelFamilyValue,
} from "@/lib/acquisition-router-constants";
import { getLandingExperimentReport } from "@/lib/landing-experiment";
import { getDiagnosticHeroExperimentReport } from "@/lib/diagnostic-hero-experiment";
import {
  computeFunnelFamilyRates,
  type FunnelFamilyRawCounts,
  type FunnelFamilyRates,
} from "@/lib/acquisition-router-rates";

export { computeFunnelFamilyRates, type FunnelFamilyRawCounts, type FunnelFamilyRates };

const VISITOR_ID_COOKIE = "aqui_vid";
const SESSION_ID_COOKIE = "aqui_sid";

export type AcquisitionRouterContext = {
  /** `null` = esta visita não passou por `/go` nesta sessão — não faz parte
   * do router (tráfego orgânico/direto às páginas). Nenhum evento deve ser
   * gravado nem nenhuma exposição contada quando `funnelFamily` é `null`. */
  funnelFamily: FunnelFamilyValue | null;
  routerExperimentId: string | null;
  visitorId: string;
  sessionId: string;
  isDebug: boolean;
};

/**
 * Lê a família/visitante/sessão já atribuídos pelo `proxy.ts` (cookie
 * `acquisition_router_session`, mesmo padrão de `getLandingContext`/
 * `getDiagnosticVisitorContext`). `funnelFamily` só é não-nulo quando esta
 * sessão passou por `/go`.
 */
export async function getAcquisitionRouterContext(): Promise<AcquisitionRouterContext> {
  const store = await cookies();
  const visitorId = store.get(VISITOR_ID_COOKIE)?.value ?? "unknown";
  const sessionId = store.get(SESSION_ID_COOKIE)?.value ?? "unknown";
  const session = parseAcquisitionRouterSession(
    store.get(ACQUISITION_ROUTER_SESSION_COOKIE)?.value,
  );

  if (!session) {
    return { funnelFamily: null, routerExperimentId: null, visitorId, sessionId, isDebug: false };
  }

  return {
    funnelFamily: session.funnelFamily,
    routerExperimentId: session.routerExperimentId,
    visitorId,
    sessionId,
    isDebug: session.isDebug,
  };
}

/**
 * Grava a exposição ao nível 1 do router (`acquisition_router_assignment`)
 * — sempre um no-op silencioso quando não há sessão de router ativa
 * (`routerContext.funnelFamily === null`), mesmo princípio de
 * `recordLandingExperimentEvent`. Chamada como efeito secundário dentro dos
 * pontos de exposição de nível 2 já existentes (`experiment_exposure` da
 * landing, `diagnostic_hero_view` do diagnóstico) — nunca precisa de uma
 * rota de API própria.
 */
export async function recordAcquisitionRouterAssignment(params: {
  routerContext: AcquisitionRouterContext;
  landingVariant?: LandingVariant | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { routerContext } = params;
  if (!routerContext.funnelFamily || !routerContext.routerExperimentId) return;

  await prisma.acquisitionRouterEvent.create({
    data: {
      visitorId: routerContext.visitorId,
      sessionId: routerContext.sessionId,
      routerExperimentId: routerContext.routerExperimentId,
      funnelFamily: routerContext.funnelFamily,
      landingVariant: params.landingVariant ?? null,
      eventType: AcquisitionRouterEventType.ASSIGNMENT,
      isDebug: routerContext.isDebug,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export type FunnelFamilyReport = FunnelFamilyRates & { family: FunnelFamilyValue };

async function distinctAssignedVisitorCount(family: FunnelFamily): Promise<number> {
  const rows = await prisma.acquisitionRouterEvent.findMany({
    where: { funnelFamily: family, eventType: AcquisitionRouterEventType.ASSIGNMENT, isDebug: false },
    distinct: ["visitorId"],
    select: { visitorId: true },
  });
  return rows.length;
}

/**
 * KPIs do nível 1 do router — `visitors` vem do evento dedicado
 * `AcquisitionRouterEvent` (robusto e versionado por `routerExperimentId`,
 * independente do que mudar nos experimentos filhos). O resto
 * (`checkoutsStarted`/`ordersCreated`/`paymentsCompleted`/`revenueCents`) é
 * a SOMA das 3 variantes de cada família, lida dos relatórios já existentes
 * e já testados (`getLandingExperimentReport`/`getDiagnosticHeroExperimentReport`)
 * — nunca uma segunda pipeline de eventos financeiros.
 */
export async function getAcquisitionRouterFamilyReport(): Promise<FunnelFamilyReport[]> {
  const [landingVisitors, diagnosticVisitors, landingReport, diagnosticReport] = await Promise.all([
    distinctAssignedVisitorCount(FunnelFamily.LANDING),
    distinctAssignedVisitorCount(FunnelFamily.DIAGNOSTIC),
    getLandingExperimentReport(),
    getDiagnosticHeroExperimentReport(),
  ]);

  const landingCounts: FunnelFamilyRawCounts = landingReport.reduce(
    (sum, variant) => ({
      visitors: landingVisitors,
      checkoutsStarted: sum.checkoutsStarted + variant.checkoutsStarted,
      ordersCreated: sum.ordersCreated + variant.ordersCreated,
      paymentsCompleted: sum.paymentsCompleted + variant.paymentsCompleted,
      revenueCents: sum.revenueCents + variant.revenueCents,
    }),
    { visitors: landingVisitors, checkoutsStarted: 0, ordersCreated: 0, paymentsCompleted: 0, revenueCents: 0 },
  );

  const diagnosticCounts: FunnelFamilyRawCounts = diagnosticReport.reduce(
    (sum, variant) => ({
      visitors: diagnosticVisitors,
      checkoutsStarted: sum.checkoutsStarted + variant.checkoutStarted,
      ordersCreated: sum.ordersCreated + variant.ordersCreated,
      paymentsCompleted: sum.paymentsCompleted + variant.paymentsCompleted,
      revenueCents: sum.revenueCents + variant.revenueCents,
    }),
    { visitors: diagnosticVisitors, checkoutsStarted: 0, ordersCreated: 0, paymentsCompleted: 0, revenueCents: 0 },
  );

  return [
    { family: "LANDING", ...computeFunnelFamilyRates(landingCounts) },
    { family: "DIAGNOSTIC", ...computeFunnelFamilyRates(diagnosticCounts) },
  ];
}
