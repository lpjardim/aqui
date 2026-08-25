/**
 * Experimento A/B/C das 3 landing pages de entrada de campanhas
 * (`landing_page_v1`) — só constantes/tipos puros e funções sem `next/headers`,
 * para poderem ser usados tanto pelo `proxy.ts` (Edge) como pelo resto do
 * server (Node), tal como `src/lib/attribution-constants.ts`.
 *
 * Ao contrário dos testes de Preços/Hero (`pricing_variant`/`hero_variant`,
 * sticky 30 dias), a atribuição aqui é por SESSÃO: a cookie `landing_session`
 * nunca tem `Max-Age`/`Expires` — morre quando o browser fecha por completo.
 * Isto satisfaz explicitamente o pedido de nunca prender um visitante para
 * sempre a uma variante, mantendo ao mesmo tempo a mesma variante durante
 * toda a sessão (sem flicker em refresh/back/navegação imediata).
 */

import type { AdAttribution } from "@/lib/attribution-constants";
import { EMPTY_ATTRIBUTION, extractAttributionFromSearchParams } from "@/lib/attribution-constants";

export const LANDING_SESSION_COOKIE = "landing_session";
export const SESSION_ID_COOKIE = "aqui_sid";

/** Nome real da rota curta usada em todas as campanhas Meta Ads. */
export const LANDING_EXPERIMENT_PATH = "/go";

/** `experiment_id` atual — se a página normal/sales/blog mudar de forma
 * significativa (headline, pricing, oferta, estrutura), criar `landing_page_v2`
 * e nunca reescrever este valor, para não misturar experiências diferentes
 * no mesmo relatório. */
export const LANDING_EXPERIMENT_ID = "landing_page_v1";

export type LandingVariantValue = "NORMAL" | "SALES" | "BLOG";

export const LANDING_VARIANTS: LandingVariantValue[] = ["NORMAL", "SALES", "BLOG"];

/** Rota real de cada variante — única fonte de verdade (usada pelo redirect
 * do `/go` e por qualquer código que precise de saber "que página é esta
 * variante"). Localizada no projeto: normal = home, sales = `/anunciar`
 * (já monta todos os componentes `vendas/*`), blog = único artigo existente. */
export const LANDING_ROUTES: Record<LandingVariantValue, string> = {
  NORMAL: "/",
  SALES: "/anunciar",
  BLOG: "/blog/como-conseguir-mais-clientes-na-sua-zona",
};

/** Mapa inverso — path exato -> variante correspondente (usado pelas próprias
 * páginas para saber "sou eu a variante ativa desta sessão?"). */
export const LANDING_PATH_TO_VARIANT: Record<string, LandingVariantValue> = {
  "/": "NORMAL",
  "/anunciar": "SALES",
  "/blog/como-conseguir-mais-clientes-na-sua-zona": "BLOG",
};

const QA_VARIANT_PARAM_VALUES: Record<string, LandingVariantValue> = {
  normal: "NORMAL",
  sales: "SALES",
  blog: "BLOG",
};

/** `/go?variant=normal|sales|blog` — override manual só para QA/admin, nunca
 * deve poluir o sorteio real (marca sempre `isDebug: true`). */
export function parseForcedLandingVariant(value: string | null): LandingVariantValue | null {
  if (!value) return null;
  return QA_VARIANT_PARAM_VALUES[value.toLowerCase()] ?? null;
}

/**
 * Deteção simples de bots/crawlers/previews — não é um sistema anti-bot
 * complexo, só evita que o tráfego mais óbvio (crawlers de motores de busca,
 * link-preview de redes sociais, monitorização de uptime, ferramentas de
 * scraping/SEO conhecidas, clientes HTTP genéricos) entre no sorteio e
 * contamine os KPIs do experimento.
 */
const BOT_USER_AGENT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|meta-externalagent|slackbot|whatsapp|telegrambot|discordbot|linkedinbot|pinterest|redditbot|preview|lighthouse|headlesschrome|pingdom|uptimerobot|ahrefsbot|semrushbot|mj12bot|petalbot|bytespider|dataminr|curl\/|wget\/|python-requests|go-http-client|okhttp|axios\/|node-fetch/i;

export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim() === "") return true;
  return BOT_USER_AGENT_PATTERN.test(userAgent);
}

/**
 * Estado guardado na cookie `landing_session` — variante + IDs do
 * experimento + snapshot da atribuição desta entrada (para o payload de
 * `experiment_exposure` não precisar de nenhum round-trip extra). Serializado
 * da mesma forma que `aqui_attribution` (`encodeURIComponent(JSON.stringify(...))`).
 */
export type LandingSessionState = {
  variant: LandingVariantValue;
  /** ID específico desta entrada no experimento (um por hit em `/go`, mesmo
   * que a variante da sessão se mantenha — ver `proxy.ts`). */
  visitId: string;
  isDebug: boolean;
  attribution: AdAttribution;
  fbclid: string | null;
};

export function serializeLandingSession(state: LandingSessionState): string {
  return encodeURIComponent(JSON.stringify(state));
}

/** Nunca lança — cookies antigas/corrompidas devolvem `null` em vez de partir a request. */
export function parseLandingSession(rawCookieValue: string | undefined | null): LandingSessionState | null {
  if (!rawCookieValue) return null;

  try {
    const decoded = decodeURIComponent(rawCookieValue);
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    const variant = value.variant;
    if (variant !== "NORMAL" && variant !== "SALES" && variant !== "BLOG") return null;
    if (typeof value.visitId !== "string" || value.visitId === "") return null;

    const attribution =
      typeof value.attribution === "object" && value.attribution !== null
        ? { ...EMPTY_ATTRIBUTION, ...(value.attribution as Partial<AdAttribution>) }
        : EMPTY_ATTRIBUTION;

    return {
      variant,
      visitId: value.visitId,
      isDebug: value.isDebug === true,
      attribution,
      fbclid: typeof value.fbclid === "string" ? value.fbclid : null,
    };
  } catch {
    return null;
  }
}

/**
 * Extrai a atribuição + `fbclid` desta request para embeber na cookie de
 * sessão — mesmos 9 campos já usados por `aqui_attribution`/`aqui_last_paid_attribution`,
 * reaproveitados aqui em vez de duplicar a extração.
 */
export function buildLandingAttributionSnapshot(searchParams: URLSearchParams): {
  attribution: AdAttribution;
  fbclid: string | null;
} {
  const attribution = extractAttributionFromSearchParams(searchParams) ?? EMPTY_ATTRIBUTION;
  const fbclid = searchParams.get("fbclid");
  return { attribution, fbclid: fbclid && fbclid.trim() !== "" ? fbclid.trim() : null };
}
