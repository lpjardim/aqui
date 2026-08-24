import { NextResponse, type NextRequest } from "next/server";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  LAST_PAID_ATTRIBUTION_COOKIE,
  extractAttributionFromSearchParams,
  isPaidTouch,
  serializeAttribution,
} from "@/lib/attribution-constants";
import {
  LANDING_EXPERIMENT_PATH,
  LANDING_ROUTES,
  LANDING_SESSION_COOKIE,
  SESSION_ID_COOKIE,
  buildLandingAttributionSnapshot,
  isLikelyBot,
  parseForcedLandingVariant,
  parseLandingSession,
  randomLandingVariant,
  serializeLandingSession,
  type LandingSessionState,
  type LandingVariantValue,
} from "@/lib/landing-experiment-constants";

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
 * - `aqui_attribution` — atribuição de marketing FIRST-TOUCH (UTMs + IDs de
 *   campanha/adset/anúncio do anúncio que trouxe o visitante — ver
 *   `src/lib/attribution-constants.ts`). First-touch puro, 90 dias: só é
 *   escrita se a URL trouxer pelo menos um destes parâmetros E a cookie
 *   ainda não existir — nunca sobrescrita por navegação interna nem por uma
 *   nova entrada externa dentro da mesma janela de 90 dias. Independente de
 *   consentimento de marketing (não é um identificador de terceiros, só
 *   rótulos de campanha — ver README).
 * - `aqui_last_paid_attribution` — atribuição de marketing LAST PAID TOUCH,
 *   mesmos 9 campos da cookie acima, mas com semântica oposta: é
 *   REESCRITA sempre que a URL trouxer evidência de campanha paga (ver
 *   `isPaidTouch` em `src/lib/attribution-constants.ts`), 90 dias a partir
 *   da última escrita. Uma visita direta/orgânica NUNCA a apaga nem a
 *   sobrescreve — só uma nova visita paga o faz. Complementa o first-touch
 *   para otimização de spend em Ads (ver `src/lib/attribution.ts`).
 *
 * Rota `/go` — experimento A/B/C das 3 landing pages (`landing_page_v1`, ver
 * `src/lib/landing-experiment-constants.ts`). Todos os Meta Ads apontam para
 * `aqui.network/go`; esta rota nunca renderiza nada — só decide a variante e
 * redireciona (307, `Cache-Control: no-store` para nunca ser cacheada por
 * CDN/browser, o que quebraria a randomização para todos os visitantes
 * seguintes com o mesmo URL de campanha) preservando todos os query params
 * (UTMs, `fbclid`, etc.).
 * - `landing_session` — variante (normal/sales/blog) + `experiment_visit_id`
 *   + snapshot da atribuição desta entrada, tudo num único JSON. AO
 *   CONTRÁRIO de `pricing_variant`/`hero_variant`, esta cookie NUNCA leva
 *   `Max-Age`/`Expires` — é uma cookie de sessão pura, morre quando o browser
 *   fecha por completo. Isto é intencional: o pedido é explícito em nunca
 *   prender um visitante para sempre à mesma variante (uma nova sessão faz
 *   sempre um novo sorteio), mas sem trocar de variante a meio da mesma
 *   sessão (refresh/back/navegação imediata). Só é atribuída em `/go`; as
 *   próprias páginas de destino nunca reatribuem.
 * - `aqui_sid` — `session_id` genérico (uuid), também sem `Max-Age` — mesma
 *   ideia de `aqui_vid`, mas por sessão em vez de por visitante.
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

/**
 * Constrói a resposta de redirect de `/go` — variante da sessão + novo
 * `experiment_visit_id`, sempre preservando os query params originais
 * (exceto `variant`, que é só o override de QA). Bots/crawlers óbvios nunca
 * recebem cookie de sessão (logo nunca entram no experimento nem geram
 * exposição), mas continuam a ser redirecionados normalmente para a home.
 */
function buildGoRedirect(request: NextRequest): NextResponse {
  const { searchParams } = request.nextUrl;
  const forcedVariant = parseForcedLandingVariant(searchParams.get("variant"));
  const bot = !forcedVariant && isLikelyBot(request.headers.get("user-agent"));

  let variant: LandingVariantValue;
  let isDebug: boolean;

  if (!bot) {
    if (forcedVariant) {
      variant = forcedVariant;
      isDebug = true;
    } else {
      const existing = parseLandingSession(request.cookies.get(LANDING_SESSION_COOKIE)?.value);
      if (existing) {
        variant = existing.variant;
        isDebug = existing.isDebug;
      } else {
        variant = randomLandingVariant();
        isDebug = false;
      }
    }
  } else {
    variant = "NORMAL";
    isDebug = false;
  }

  const targetUrl = new URL(LANDING_ROUTES[variant], request.url);
  searchParams.forEach((value, key) => {
    if (key === "variant") return;
    targetUrl.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(targetUrl, 307);
  // Nunca cacheável: o URL de campanha é sempre o mesmo para todos os
  // visitantes — uma resposta cacheada por CDN/browser quebraria a
  // randomização para todos os visitantes seguintes.
  response.headers.set("Cache-Control", "no-store, private");

  if (!bot) {
    const { attribution, fbclid } = buildLandingAttributionSnapshot(searchParams);
    const sessionState: LandingSessionState = {
      variant,
      visitId: crypto.randomUUID(),
      isDebug,
      attribution,
      fbclid,
    };
    response.cookies.set(LANDING_SESSION_COOKIE, serializeLandingSession(sessionState), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      // Sem `maxAge`/`expires` de propósito — cookie de sessão, nunca sticky.
    });
  }

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const forcedVariantParam = searchParams.get("a_variant");
  const forcedHeroVariantParam = searchParams.get("h_variant");
  const debugParam = searchParams.get("experiment_debug");

  const forcedVariant =
    forcedVariantParam === "A" || forcedVariantParam === "B" ? forcedVariantParam : null;
  const forcedHeroVariant =
    forcedHeroVariantParam === "A" || forcedHeroVariantParam === "B" ? forcedHeroVariantParam : null;
  const clearDebug = debugParam === "false";
  const wantsGenericDebug = debugParam === "true";

  const response =
    pathname === LANDING_EXPERIMENT_PATH ? buildGoRedirect(request) : NextResponse.next({ request });

  if (!request.cookies.get(SESSION_ID_COOKIE)) {
    const sessionId = crypto.randomUUID();
    request.cookies.set(SESSION_ID_COOKIE, sessionId);
    response.cookies.set(SESSION_ID_COOKIE, sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      // Sem `maxAge` de propósito — cookie de sessão (ver doc no topo do ficheiro).
    });
  }

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

  // Extraído uma única vez e partilhado pelas duas cookies de atribuição
  // abaixo — mesmos 9 campos, duas semânticas de escrita diferentes.
  const attribution = extractAttributionFromSearchParams(searchParams);

  // First-touch: só grava se houver pelo menos um parâmetro de atribuição
  // nesta URL E ainda não existir cookie — nunca sobrescreve navegação
  // interna nem uma nova entrada externa dentro da mesma janela de 90 dias.
  // COMPORTAMENTO INALTERADO por causa do last-paid-touch abaixo.
  if (!request.cookies.get(ATTRIBUTION_COOKIE) && attribution) {
    response.cookies.set(ATTRIBUTION_COOKIE, serializeAttribution(attribution), {
      maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  // Last paid touch: ao contrário do first-touch, é sempre reescrita quando
  // há evidência de campanha paga — mesmo que já exista uma cookie anterior.
  // Uma visita direta/orgânica (sem evidência de "pago") não entra aqui, por
  // isso nunca apaga nem sobrescreve o último toque pago conhecido.
  if (attribution && isPaidTouch(searchParams)) {
    response.cookies.set(LAST_PAID_ATTRIBUTION_COOKIE, serializeAttribution(attribution), {
      maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|map|woff2?)$).*)",
  ],
};
