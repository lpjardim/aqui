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
 * - `hero_variant` ("A" | "B") — 30 dias, atribuída uma única vez. A/B test
 *   independente, só da headline do Hero (ver `src/lib/hero-experiment.ts`).
 *   Usa a mesma técnica/infraestrutura do `pricing_variant` (atribuição
 *   50/50 no Edge, cookie própria), mas nunca partilha a variante nem os
 *   eventos com o teste de preços.
 * - `aqui_vid` (uuid anónimo) — 180 dias, só para contar visitantes únicos
 *   nos KPIs dos experimentos (partilhada pelos dois testes); não é PII.
 * - `experiment_debug` — presente só quando pedido explicitamente via
 *   `?a_variant=A|B` (força a variante SÓ para esta cookie de debug, nunca
 *   reescreve a `pricing_variant` real) ou `?experiment_debug=true`. Sessões
 *   com esta cookie ficam sempre excluídas dos KPIs — ver `getPricingContext`
 *   em `src/lib/experiments.ts`.
 * - `hero_debug` — equivalente a `experiment_debug`, mas só para o teste do
 *   Hero: presente via `?h_variant=A|B` (força só a variante do Hero) ou
 *   `?experiment_debug=true` (mesmo parâmetro genérico marca debug nos dois
 *   testes ao mesmo tempo). Ver `getHeroContext` em `src/lib/hero-experiment.ts`.
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
const HERO_VARIANT_COOKIE = "hero_variant";
const VISITOR_ID_COOKIE = "aqui_vid";
const DEBUG_COOKIE = "experiment_debug";
const HERO_DEBUG_COOKIE = "hero_debug";
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
  const forcedHeroVariantParam = searchParams.get("h_variant");
  const debugParam = searchParams.get("experiment_debug");

  const forcedVariant =
    forcedVariantParam === "A" || forcedVariantParam === "B" ? forcedVariantParam : null;
  const forcedHeroVariant =
    forcedHeroVariantParam === "A" || forcedHeroVariantParam === "B" ? forcedHeroVariantParam : null;
  const clearDebug = debugParam === "false";
  const wantsGenericDebug = debugParam === "true";

  const response = NextResponse.next({ request });

  // Debug nunca altera a atribuição real — só sobrepõe a variante *efetiva*
  // desta sessão de teste e marca-a para ser excluída dos KPIs. `a_variant`
  // força só o teste de preços; `h_variant` força só o teste do Hero;
  // `experiment_debug=true` marca debug genérico nos dois ao mesmo tempo.
  if (clearDebug) {
    request.cookies.delete(DEBUG_COOKIE);
    response.cookies.delete(DEBUG_COOKIE);
    request.cookies.delete(HERO_DEBUG_COOKIE);
    response.cookies.delete(HERO_DEBUG_COOKIE);
  } else {
    if (forcedVariant || wantsGenericDebug) {
      const debugValue = forcedVariant ?? "1";
      request.cookies.set(DEBUG_COOKIE, debugValue);
      response.cookies.set(DEBUG_COOKIE, debugValue, {
        maxAge: ONE_DAY,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }
    if (forcedHeroVariant || wantsGenericDebug) {
      const heroDebugValue = forcedHeroVariant ?? "1";
      request.cookies.set(HERO_DEBUG_COOKIE, heroDebugValue);
      response.cookies.set(HERO_DEBUG_COOKIE, heroDebugValue, {
        maxAge: ONE_DAY,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });
    }
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

  // Atribuição 50/50 independente da do teste de preços — outra chamada a
  // `randomVariant()`, outra cookie, nunca correlacionada de propósito com
  // `pricing_variant` (um visitante pode calhar em qualquer combinação das
  // duas variantes de cada teste).
  if (!request.cookies.get(HERO_VARIANT_COOKIE)) {
    const variant = randomVariant();
    request.cookies.set(HERO_VARIANT_COOKIE, variant);
    response.cookies.set(HERO_VARIANT_COOKIE, variant, {
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
