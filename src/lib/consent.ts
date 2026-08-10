import { cookies } from "next/headers";
import { CONSENT_COOKIE, CONSENT_DENIED, CONSENT_GRANTED } from "@/lib/consent-constants";

export { CONSENT_COOKIE, CONSENT_GRANTED, CONSENT_DENIED, CONSENT_MAX_AGE_SECONDS } from "@/lib/consent-constants";

/**
 * Consentimento mínimo de cookies de marketing (Meta Pixel + Conversions
 * API). Só duas categorias: essenciais (sempre ativos — sessão, checkout,
 * A/B test interno) e "marketing" (Meta), que fica desligado por omissão até
 * o visitante decidir explicitamente.
 *
 * Enquanto não houver decisão: sem Pixel, sem `_fbp`/`_fbc`, sem envio de
 * dados pessoais para a Meta (nem Pixel nem CAPI). Isto é uma escolha de
 * produto/legal — ver relatório final para detalhes do que pode ser
 * revisto.
 */
export type ConsentValue = typeof CONSENT_GRANTED | typeof CONSENT_DENIED | null;

/** Lê o consentimento a partir dos cookies da própria request — nunca do body/cliente. */
export async function getMarketingConsent(): Promise<ConsentValue> {
  const store = await cookies();
  const value = store.get(CONSENT_COOKIE)?.value;
  if (value === CONSENT_GRANTED || value === CONSENT_DENIED) return value;
  return null;
}

export async function hasMarketingConsent(): Promise<boolean> {
  return (await getMarketingConsent()) === CONSENT_GRANTED;
}
