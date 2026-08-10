import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPricingContext } from "@/lib/experiments";
import { ExperimentEventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

const EVENT_MAP: Record<string, ExperimentEventType> = {
  pricing_exposed: ExperimentEventType.PRICING_EXPOSED,
  pricing_cta_clicked: ExperimentEventType.PRICING_CTA_CLICKED,
  pricing_toggle_changed: ExperimentEventType.PRICING_TOGGLE_CHANGED,
  checkout_started: ExperimentEventType.CHECKOUT_STARTED,
};

function isPlainMetadata(value: unknown): value is Prisma.InputJsonValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recebe eventos do funil do A/B test de preços (`sendBeacon`/`fetch` de
 * `src/lib/experiment-tracking.ts`). A variante/visitante/debug nunca vêm do
 * corpo do pedido — são sempre lidos das cookies através de
 * `getPricingContext`, para que nada no cliente possa forjar a atribuição.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { event?: string; metadata?: unknown }
    | null;

  const eventType = body?.event ? EVENT_MAP[body.event] : undefined;

  if (!eventType) {
    return NextResponse.json({ ok: false, error: "Evento inválido." }, { status: 400 });
  }

  const { variant, visitorId, isDebug } = await getPricingContext();

  await prisma.experimentEvent.create({
    data: {
      visitorId,
      variant,
      eventType,
      isDebug,
      metadata: isPlainMetadata(body?.metadata) ? body.metadata : undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
