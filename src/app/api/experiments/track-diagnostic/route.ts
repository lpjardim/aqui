import { NextResponse } from "next/server";
import { getDiagnosticVisitorContext, recordDiagnosticEvent } from "@/lib/diagnostic-context";
import { getStoredAttribution } from "@/lib/attribution";
import { DIAGNOSTIC_HERO_EXPERIMENT_ID } from "@/lib/diagnostic-hero-constants";
import { getAcquisitionRouterContext, recordAcquisitionRouterAssignment } from "@/lib/acquisition-router";
import { DiagnosticEventType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const EVENT_MAP: Record<string, DiagnosticEventType> = {
  diagnostic_hero_view: DiagnosticEventType.HERO_VIEWED,
  diagnostic_hero_cta_clicked: DiagnosticEventType.HERO_CTA_CLICKED,
  diagnostic_started: DiagnosticEventType.STARTED,
  diagnostic_question_answered: DiagnosticEventType.QUESTION_ANSWERED,
  diagnostic_completed: DiagnosticEventType.COMPLETED,
  diagnostic_result_viewed: DiagnosticEventType.RESULT_VIEWED,
  preview_started: DiagnosticEventType.PREVIEW_STARTED,
  preview_completed: DiagnosticEventType.PREVIEW_COMPLETED,
  recommendation_viewed: DiagnosticEventType.RECOMMENDATION_VIEWED,
  recommended_plan_clicked: DiagnosticEventType.RECOMMENDED_PLAN_CLICKED,
  checkout_started: DiagnosticEventType.CHECKOUT_STARTED,
  payment_clicked: DiagnosticEventType.PAYMENT_CLICKED,
};

function isPlainMetadata(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recebe eventos do funil `/diagnostico` (`sendBeacon`/`fetch` de
 * `src/lib/diagnostic-tracking.ts`). Visitante/sessão/debug nunca vêm do
 * corpo do pedido — sempre lidos das cookies via
 * `getDiagnosticVisitorContext`. `diagnosticId` tem de vir explícito no
 * corpo (não há cookie de sessão atribuída pelo servidor para este funil);
 * sem ele, o pedido é rejeitado — nunca gravamos eventos sem forma de os
 * agrupar numa corrida do diagnóstico.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { event?: string; diagnosticId?: string; metadata?: unknown }
    | null;

  const eventType = body?.event ? EVENT_MAP[body.event] : undefined;
  const diagnosticId = typeof body?.diagnosticId === "string" ? body.diagnosticId : "";

  if (!eventType || !diagnosticId) {
    return NextResponse.json({ ok: false, error: "Evento inválido." }, { status: 400 });
  }

  const context = await getDiagnosticVisitorContext();
  const metadata = isPlainMetadata(body?.metadata) ? body.metadata : {};

  // A exposição do Hero (secção 6 do pedido: "experiment_id, variant,
  // visitor_id, session_id, timestamp, UTMs, referrer") já tem
  // visitor_id/session_id/variant/timestamp como colunas próprias
  // (`visitorId`/`sessionId`/`heroVariant`/`createdAt`) — aqui só
  // enriquecemos a metadata com o `experiment_id` e as UTMs, lidas sempre
  // da cookie `aqui_attribution` (nunca do corpo do pedido). `referrer` vem
  // do cliente (`document.referrer`), que o servidor não tem forma própria
  // de obter de forma fiável.
  if (eventType === DiagnosticEventType.HERO_VIEWED) {
    const attribution = await getStoredAttribution();
    metadata.experimentId = DIAGNOSTIC_HERO_EXPERIMENT_ID;
    metadata.utmSource = attribution.utmSource;
    metadata.utmMedium = attribution.utmMedium;
    metadata.utmCampaign = attribution.utmCampaign;
    metadata.utmContent = attribution.utmContent;
    metadata.utmTerm = attribution.utmTerm;
  }

  await recordDiagnosticEvent({ eventType, diagnosticId, context, metadata });

  // Mirror do nível 1 do router (`acquisition_router_v1`) — só grava quando
  // esta sessão passou por `/go` E calhou na família DIAGNOSTIC (visitas
  // diretas a `/diagnostico` sem passar por `/go` nunca geram este evento,
  // mantendo o nível 1 limpo). Mesmo princípio do mirror em `track-landing`
  // (ver `src/app/api/experiments/track-landing/route.ts`).
  if (eventType === DiagnosticEventType.HERO_VIEWED) {
    const routerContext = await getAcquisitionRouterContext();
    if (routerContext.funnelFamily === "DIAGNOSTIC") {
      await recordAcquisitionRouterAssignment({ routerContext, metadata });
    }
  }

  return NextResponse.json({ ok: true });
}
