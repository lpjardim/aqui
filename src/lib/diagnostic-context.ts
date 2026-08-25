import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DiagnosticEventType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import {
  DIAGNOSTIC_HANDOFF_COOKIE,
  parseDiagnosticHandoff,
  type DiagnosticHandoff,
} from "@/lib/diagnostic/handoff";
import {
  DIAGNOSTIC_HERO_SESSION_COOKIE,
  parseDiagnosticHeroSession,
  type DiagnosticHeroVariantValue,
} from "@/lib/diagnostic-hero-constants";

const VISITOR_ID_COOKIE = "aqui_vid";
const SESSION_ID_COOKIE = "aqui_sid";
const DIAGNOSTIC_DEBUG_COOKIE = "diagnostic_debug";

/** Fallback só usado quando, por alguma razão, esta request nunca passou
 * pelo `proxy.ts` para `/diagnostico` (ex.: chamada direta a uma API,
 * testes) — corresponde à variante A ("dor/previsibilidade"), a mesma
 * copy que sempre existiu no Hero antes deste teste. */
const DEFAULT_HERO_VARIANT: DiagnosticHeroVariantValue = "PAIN";

export type DiagnosticVisitorContext = {
  visitorId: string;
  sessionId: string;
  /** Variante do A/B/C test do Hero de `/diagnostico` ativa nesta sessão —
   * ver `src/lib/diagnostic-hero-constants.ts`. */
  heroVariant: DiagnosticHeroVariantValue;
  /** Tráfego forçado via `/diagnostico?diagnostic_debug=true` OU
   * `?hero=` (override manual da variante do Hero), nunca deve entrar nos
   * KPIs — nem do funil geral, nem do teste do Hero — ver
   * `proxy.ts`. */
  isDebug: boolean;
};

/**
 * Lê visitante/sessão/variante do Hero/debug das cookies globais já
 * geridas pelo `proxy.ts` (`aqui_vid`/`aqui_sid`/
 * `diagnostic_hero_session`/`diagnostic_debug`), mesmo padrão de
 * `getLandingContext()`/`getPricingContext()`. Nunca confia em nada vindo
 * do corpo do pedido do cliente.
 */
export async function getDiagnosticVisitorContext(): Promise<DiagnosticVisitorContext> {
  const store = await cookies();
  const heroSession = parseDiagnosticHeroSession(
    store.get(DIAGNOSTIC_HERO_SESSION_COOKIE)?.value,
  );

  return {
    visitorId: store.get(VISITOR_ID_COOKIE)?.value ?? "unknown",
    sessionId: store.get(SESSION_ID_COOKIE)?.value ?? "unknown",
    heroVariant: heroSession?.variant ?? DEFAULT_HERO_VARIANT,
    isDebug: store.get(DIAGNOSTIC_DEBUG_COOKIE)?.value === "1" || heroSession?.isDebug === true,
  };
}

/**
 * Lê o handoff `/diagnostico` → `/pedido` (cookie `diagnostic_handoff`,
 * escrita pelo próprio cliente no CTA final — ver
 * `recommendation-screen.tsx`). Devolve `null` quando o utilizador chegou a
 * `/pedido` sem passar pelo diagnóstico (o checkout normal continua 100%
 * inalterado nesse caso).
 */
export async function getDiagnosticHandoff(): Promise<DiagnosticHandoff | null> {
  const store = await cookies();
  return parseDiagnosticHandoff(store.get(DIAGNOSTIC_HANDOFF_COOKIE)?.value);
}

/**
 * Grava um evento do funil `/diagnostico`. Ao contrário de
 * `recordLandingExperimentEvent`, nunca é um no-op condicional — só exige um
 * `diagnosticId` não vazio (gerado no cliente ao chegar ao Hero, ver
 * `src/lib/diagnostic/session.ts`).
 */
export async function recordDiagnosticEvent(params: {
  eventType: DiagnosticEventType;
  diagnosticId: string;
  context: DiagnosticVisitorContext;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!params.diagnosticId) return;

  await prisma.diagnosticEvent.create({
    data: {
      visitorId: params.context.visitorId,
      sessionId: params.context.sessionId,
      diagnosticId: params.diagnosticId,
      eventType: params.eventType,
      heroVariant: params.context.heroVariant,
      isDebug: params.context.isDebug,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
