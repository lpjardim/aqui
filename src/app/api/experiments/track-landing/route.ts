import { NextResponse } from "next/server";
import { getLandingContext, recordLandingExperimentEvent } from "@/lib/landing-experiment";
import { LANDING_EXPERIMENT_ID } from "@/lib/landing-experiment-constants";
import { LandingEventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

const EVENT_MAP: Record<string, LandingEventType> = {
  experiment_exposure: LandingEventType.EXPOSURE,
  pricing_view: LandingEventType.PRICING_VIEW,
  cta_clicked: LandingEventType.CTA_CLICKED,
  plan_selected: LandingEventType.PLAN_SELECTED,
  checkout_started: LandingEventType.CHECKOUT_STARTED,
  payment_clicked: LandingEventType.PAYMENT_CLICKED,
};

function isPlainMetadata(value: unknown): value is Record<string, Prisma.InputJsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recebe eventos do funil do experimento `landing_page_v1`
 * (`sendBeacon`/`fetch` de `src/lib/landing-experiment-tracking.ts`). A
 * variante/visitante/sessão nunca vêm do corpo do pedido — são sempre lidos
 * das cookies através de `getLandingContext`. Quando não há sessão de
 * landing ativa (esta visita nunca passou por `/go`), o pedido é aceite mas
 * NADA é gravado — nunca deve poluir os KPIs do experimento.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { event?: string; metadata?: unknown }
    | null;

  const eventType = body?.event ? EVENT_MAP[body.event] : undefined;

  if (!eventType) {
    return NextResponse.json({ ok: false, error: "Evento inválido." }, { status: 400 });
  }

  const context = await getLandingContext();

  if (!context.variant) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const baseMetadata = isPlainMetadata(body?.metadata) ? body.metadata : {};

  // `experiment_exposure` carrega também a atribuição capturada em `/go`
  // (secção 6 do pedido) — nunca confiada ao cliente, vem sempre do snapshot
  // já guardado na cookie `landing_session` pelo `middleware.ts`.
  const metadata =
    eventType === LandingEventType.EXPOSURE && context.session
      ? {
          ...baseMetadata,
          experimentId: LANDING_EXPERIMENT_ID,
          utmSource: context.session.attribution.utmSource,
          utmMedium: context.session.attribution.utmMedium,
          utmCampaign: context.session.attribution.utmCampaign,
          utmContent: context.session.attribution.utmContent,
          utmTerm: context.session.attribution.utmTerm,
          fbclid: context.session.fbclid,
        }
      : baseMetadata;

  await recordLandingExperimentEvent({ eventType, context, metadata });

  return NextResponse.json({ ok: true });
}
