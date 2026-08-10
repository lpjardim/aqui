import { NextResponse, type NextRequest } from "next/server";

/**
 * A/B test da secção de preços — atribuição 50/50 feita aqui (Edge, antes de
 * qualquer render) para que o Server Component da homepage já veja a
 * variante correta na MESMA resposta, sem flicker nem troca depois de
 * montar. Segue o padrão oficial do Next.js: a cookie é escrita tanto no
 * `request` (para o resto do pipeline desta própria request já a ver) como
 * na `response` (para persistir no browser nas próximas visitas).
 *
 * Cookies geridas aqui:
 * - `pricing_variant` ("A" | "B") — 30 dias, atribuída uma única vez.
 * - `aqui_vid` (uuid anónimo) — 180 dias, só para contar visitantes únicos
 *   nos KPIs do experimento; não é PII.
 * - `experiment_debug` — presente só quando pedido explicitamente via
 *   `?a_variant=A|B` (força a variante SÓ para esta cookie de debug, nunca
 *   reescreve a `pricing_variant` real) ou `?experiment_debug=true`. Sessões
 *   com esta cookie ficam sempre excluídas dos KPIs — ver `getPricingContext`
 *   em `src/lib/experiments.ts`.
 * - `_fbc_pending` — Meta Conversions API. Guarda o `fbclid` já normalizado
 *   no formato oficial `fb.1.<timestamp_ms>.<fbclid>` (ver documentação
 *   "ClickID and the fbp and fbc Parameters") assim que aparece na URL, para
 *   não o perder enquanto o visitante ainda não decidiu sobre cookies de
 *   marketing. NUNCA é a cookie `_fbc` real (essa só é escrita pelo próprio
 *   Pixel da Meta, e só depois de consentimento) — é só um valor técnico de
 *   reserva, lido como fallback pelos endpoints que enviam eventos para a
 *   Meta (ver `src/app/api/meta/track/route.ts`).
 */

const PRICING_VARIANT_COOKIE = "pricing_variant";
const VISITOR_ID_COOKIE = "aqui_vid";
const DEBUG_COOKIE = "experiment_debug";
const FBC_PENDING_COOKIE = "_fbc_pending";
const FBC_SUBDOMAIN_INDEX = 1;

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const ONE_HUNDRED_EIGHTY_DAYS = 60 * 60 * 24 * 180;
const NINETY_DAYS = 60 * 60 * 24 * 90;
const ONE_DAY = 60 * 60 * 24;

function randomVariant(): "A" | "B" {
  return Math.random() < 0.5 ? "A" : "B";
}

export function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const forcedVariantParam = searchParams.get("a_variant");
  const debugParam = searchParams.get("experiment_debug");

  const forcedVariant =
    forcedVariantParam === "A" || forcedVariantParam === "B" ? forcedVariantParam : null;
  const clearDebug = debugParam === "false";
  const wantsGenericDebug = debugParam === "true";

  const response = NextResponse.next({ request });

  // Debug nunca altera a atribuição real — só sobrepõe a variante *efetiva*
  // desta sessão de teste e marca-a para ser excluída dos KPIs.
  if (clearDebug) {
    request.cookies.delete(DEBUG_COOKIE);
    response.cookies.delete(DEBUG_COOKIE);
  } else if (forcedVariant || wantsGenericDebug) {
    const debugValue = forcedVariant ?? "1";
    request.cookies.set(DEBUG_COOKIE, debugValue);
    response.cookies.set(DEBUG_COOKIE, debugValue, {
      maxAge: ONE_DAY,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  if (!request.cookies.get(PRICING_VARIANT_COOKIE)) {
    const variant = randomVariant();
    request.cookies.set(PRICING_VARIANT_COOKIE, variant);
    response.cookies.set(PRICING_VARIANT_COOKIE, variant, {
      maxAge: THIRTY_DAYS,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  if (!request.cookies.get(VISITOR_ID_COOKIE)) {
    const visitorId = crypto.randomUUID();
    request.cookies.set(VISITOR_ID_COOKIE, visitorId);
    response.cookies.set(VISITOR_ID_COOKIE, visitorId, {
      maxAge: ONE_HUNDRED_EIGHTY_DAYS,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  const fbclid = searchParams.get("fbclid");
  if (fbclid && !request.cookies.get(FBC_PENDING_COOKIE)) {
    const fbc = `fb.${FBC_SUBDOMAIN_INDEX}.${Date.now()}.${fbclid}`;
    response.cookies.set(FBC_PENDING_COOKIE, fbc, {
      maxAge: NINETY_DAYS,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|map|woff2?)$).*)",
  ],
};
