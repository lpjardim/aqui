/**
 * Atribuição de marketing (de onde veio o cliente) — nunca confundir com a
 * Integração Meta Marketing API (`src/lib/meta.ts`), que é a campanha que a
 * PRÓPRIA Aqui. cria/gere na Meta Ads para entregar as visualizações
 * compradas. Isto aqui é o "snapshot" dos parâmetros vindos do anúncio que
 * trouxe o visitante — capturado no `proxy.ts`, lido em
 * `src/lib/attribution.ts`, gravado na Order em `/api/pedido`.
 *
 * Duas cookies independentes, para dois propósitos de análise distintos:
 * - `ATTRIBUTION_COOKIE` (first-touch) — "de onde veio o cliente da primeira
 *   vez" (análise de aquisição). Nunca é sobrescrita depois de escrita.
 * - `LAST_PAID_ATTRIBUTION_COOKIE` (last paid touch) — "que campanha PAGA o
 *   convenceu a comprar desta vez" (otimização de spend em Ads). É
 *   atualizada sempre que há uma nova entrada com evidência de campanha paga
 *   (ver `isPaidTouch`), mas uma visita direta/orgânica nunca a apaga.
 *
 * Ficheiro partilhado entre o middleware (Edge runtime) e o resto do server
 * (Node) — só constantes/tipos puros, sem `next/headers`.
 */

export const ATTRIBUTION_COOKIE = "aqui_attribution";
export const LAST_PAID_ATTRIBUTION_COOKIE = "aqui_last_paid_attribution";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

/** Nunca guardar um valor absurdamente grande (defesa contra URLs forjadas) — nem na cookie, nem na BD. */
export const ATTRIBUTION_VALUE_MAX_LENGTH = 300;

export type AdAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  placement: string | null;
  attributionCampaignId: string | null;
  attributionAdsetId: string | null;
  attributionAdId: string | null;
};

export const EMPTY_ATTRIBUTION: AdAttribution = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  placement: null,
  attributionCampaignId: null,
  attributionAdsetId: null,
  attributionAdId: null,
};

/** Nome do parâmetro de query para cada campo — única fonte de verdade (middleware e testes usam isto). */
export const ATTRIBUTION_QUERY_PARAMS: Record<keyof AdAttribution, string> = {
  utmSource: "utm_source",
  utmMedium: "utm_medium",
  utmCampaign: "utm_campaign",
  utmContent: "utm_content",
  utmTerm: "utm_term",
  placement: "placement",
  attributionCampaignId: "campaign_id",
  attributionAdsetId: "adset_id",
  attributionAdId: "ad_id",
};

const ATTRIBUTION_FIELDS = Object.keys(ATTRIBUTION_QUERY_PARAMS) as (keyof AdAttribution)[];

function truncate(value: string): string {
  return value.length > ATTRIBUTION_VALUE_MAX_LENGTH
    ? value.slice(0, ATTRIBUTION_VALUE_MAX_LENGTH)
    : value;
}

/**
 * Lê os 9 parâmetros de um `URLSearchParams` — usado só pelo `proxy.ts`
 * para decidir se há alguma atribuição nesta visita (e o quê guardar).
 * Devolve `null` se nenhum dos 9 parâmetros estiver presente.
 */
export function extractAttributionFromSearchParams(searchParams: URLSearchParams): AdAttribution | null {
  let hasAny = false;
  const result = { ...EMPTY_ATTRIBUTION };

  for (const field of ATTRIBUTION_FIELDS) {
    const raw = searchParams.get(ATTRIBUTION_QUERY_PARAMS[field]);
    if (raw !== null && raw.trim() !== "") {
      result[field] = truncate(raw.trim());
      hasAny = true;
    }
  }

  return hasAny ? result : null;
}

/** Serializa para o valor da cookie — nunca a URL inteira, só os campos já extraídos. */
export function serializeAttribution(attribution: AdAttribution): string {
  return encodeURIComponent(JSON.stringify(attribution));
}

/**
 * Parseia o valor da cookie de forma protegida — cookies antigas/corrompidas/
 * de outra versão nunca devem lançar nem partir a criação da Order. Qualquer
 * campo em falta ou com tipo errado fica `null`.
 */
export function parseAttribution(rawCookieValue: string | undefined | null): AdAttribution | null {
  if (!rawCookieValue) return null;

  try {
    const decoded = decodeURIComponent(rawCookieValue);
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== "object" || parsed === null) return null;

    const result = { ...EMPTY_ATTRIBUTION };
    let hasAny = false;
    for (const field of ATTRIBUTION_FIELDS) {
      const value = (parsed as Record<string, unknown>)[field];
      if (typeof value === "string" && value.trim() !== "") {
        result[field] = truncate(value);
        hasAny = true;
      }
    }
    return hasAny ? result : null;
  } catch {
    return null;
  }
}

/**
 * Regra para classificar uma visita como "paid touch" (usada só pelo
 * last-paid-touch, nunca pelo first-touch, que não distingue origem paga de
 * orgânica). Um `utm_source` sozinho NUNCA conta — é fácil de forjar/repetir
 * em qualquer link (newsletter, referral, partilha manual) e não prova
 * despesa em anúncios. Só conta como pago quando há evidência concreta de
 * campanha paga:
 * - `utm_medium=paid_social` (convenção usada nos nossos anúncios Meta); OU
 * - qualquer um dos 3 IDs técnicos (`campaign_id`/`adset_id`/`ad_id`), que só
 *   a própria plataforma de anúncios preenche automaticamente; OU
 * - `fbclid` (Meta Click ID), que só existe num clique real vindo da Meta.
 */
export function isPaidTouch(searchParams: URLSearchParams): boolean {
  if (searchParams.get(ATTRIBUTION_QUERY_PARAMS.utmMedium) === "paid_social") return true;
  if (searchParams.get(ATTRIBUTION_QUERY_PARAMS.attributionCampaignId)) return true;
  if (searchParams.get(ATTRIBUTION_QUERY_PARAMS.attributionAdsetId)) return true;
  if (searchParams.get(ATTRIBUTION_QUERY_PARAMS.attributionAdId)) return true;
  if (searchParams.get("fbclid")) return true;
  return false;
}
