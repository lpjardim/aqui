import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHeroContext } from "@/lib/hero-experiment";
import { HeroEventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

const EVENT_MAP: Record<string, HeroEventType> = {
  hero_exposed: HeroEventType.HERO_EXPOSED,
  hero_cta_clicked: HeroEventType.HERO_CTA_CLICKED,
  hero_checkout_started: HeroEventType.CHECKOUT_STARTED,
  hero_payment_clicked: HeroEventType.PAYMENT_CLICKED,
};

function isPlainMetadata(value: unknown): value is Prisma.InputJsonValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recebe eventos do funil do A/B test do Hero (`sendBeacon`/`fetch` de
 * `src/lib/hero-experiment-tracking.ts`). Espelha `/api/experiments/track`
 * (teste de preços), mas grava numa tabela (`HeroExperimentEvent`) e com uma
 * cookie de variante (`hero_variant`) completamente independentes — a
 * variante/visitante/debug nunca vêm do corpo do pedido.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { event?: string; metadata?: unknown }
    | null;

  const eventType = body?.event ? EVENT_MAP[body.event] : undefined;

  if (!eventType) {
    return NextResponse.json({ ok: false, error: "Evento inválido." }, { status: 400 });
  }

  const { variant, visitorId, isDebug } = await getHeroContext();

  await prisma.heroExperimentEvent.create({
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
