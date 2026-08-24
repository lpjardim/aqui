import { cookies } from "next/headers";
import {
  ATTRIBUTION_COOKIE,
  EMPTY_ATTRIBUTION,
  LAST_PAID_ATTRIBUTION_COOKIE,
  parseAttribution,
  type AdAttribution,
} from "@/lib/attribution-constants";

export type { AdAttribution };

/**
 * Lê a atribuição FIRST-TOUCH já capturada pelo `middleware.ts` (cookie
 * `aqui_attribution`) — é a ÚNICA fonte de verdade para "de onde veio o
 * cliente da primeira vez", nunca um valor vindo do body de um pedido. Mesmo
 * padrão de `getPricingContext()`/`getHeroContext()` em
 * `src/lib/experiments.ts`/`src/lib/hero-experiment.ts`.
 *
 * Devolve todos os campos a `null` se não houver cookie (visita orgânica,
 * cookie expirada, ou visitante que nunca veio de um anúncio) — nunca lança.
 */
export async function getStoredAttribution(): Promise<AdAttribution> {
  const store = await cookies();
  const raw = store.get(ATTRIBUTION_COOKIE)?.value;
  return parseAttribution(raw) ?? EMPTY_ATTRIBUTION;
}

/**
 * Lê a atribuição LAST PAID TOUCH (cookie `aqui_last_paid_attribution`) —
 * a última visita com evidência de campanha paga antes desta Order (ver
 * `isPaidTouch`). Complementa `getStoredAttribution()`: aquela nunca muda
 * depois de escrita, esta é atualizada a cada novo toque pago. Devolve todos
 * os campos a `null` quando nunca houve nenhum toque pago identificável
 * (ex.: cliente só visitou organicamente, ou entrou por UTMs genéricos sem
 * evidência de campanha paga) — nunca lança.
 */
export async function getLastPaidTouchAttribution(): Promise<AdAttribution> {
  const store = await cookies();
  const raw = store.get(LAST_PAID_ATTRIBUTION_COOKIE)?.value;
  return parseAttribution(raw) ?? EMPTY_ATTRIBUTION;
}

/**
 * Converte um snapshot de atribuição para os nomes dos campos `lastPaid*` da
 * Order — só o last-paid-touch precisa disto, porque os nomes de coluna não
 * são um simples prefixo dos campos genéricos (ex.: `attributionCampaignId`
 * → `lastPaidCampaignId`, não `lastPaidAttributionCampaignId`).
 */
export function toLastPaidTouchOrderFields(attribution: AdAttribution) {
  return {
    lastPaidUtmSource: attribution.utmSource,
    lastPaidUtmMedium: attribution.utmMedium,
    lastPaidUtmCampaign: attribution.utmCampaign,
    lastPaidUtmContent: attribution.utmContent,
    lastPaidUtmTerm: attribution.utmTerm,
    lastPaidPlacement: attribution.placement,
    lastPaidCampaignId: attribution.attributionCampaignId,
    lastPaidAdsetId: attribution.attributionAdsetId,
    lastPaidAdId: attribution.attributionAdId,
  };
}
