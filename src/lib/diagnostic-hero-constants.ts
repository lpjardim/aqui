/**
 * A/B/C test da headline+subtítulo do Hero de `/diagnostico`
 * (`diagnostic_hero_v1`) — só constantes/tipos puros e funções sem
 * `next/headers`, para poderem ser usados tanto pelo `proxy.ts` (Edge)
 * como pelo resto do server (Node), mesmo princípio de
 * `landing-experiment-constants.ts`.
 *
 * Ao contrário dos testes de Preços/Hero da landing page
 * (`pricing_variant`/`hero_variant`, sticky 30 dias), a atribuição aqui é
 * por SESSÃO: a cookie `diagnostic_hero_session` nunca tem
 * `Max-Age`/`Expires` — morre quando o browser fecha por completo. Isto
 * satisfaz o pedido explícito de nunca prender um visitante para sempre à
 * mesma variante, mantendo ao mesmo tempo a mesma variante durante toda a
 * sessão (refresh/back/navegação imediata nunca trocam a headline vista).
 *
 * Ao contrário do `landing_page_v1` (que decide a variante numa rota
 * dedicada, `/go`, e depois redireciona), aqui não há redirect: a própria
 * `/diagnostico` é a única URL enviada para tráfego, e o `proxy.ts`
 * decide a variante ANTES do Server Component renderizar — a página lê a
 * cookie já atribuída e passa a variante como prop, sem nenhum sorteio no
 * cliente (evita hydration mismatch/flash de conteúdo).
 */

export const DIAGNOSTIC_PATH = "/diagnostico";

export const DIAGNOSTIC_HERO_SESSION_COOKIE = "diagnostic_hero_session";

/** `experiment_id` atual — se a headline do Hero mudar de forma
 * significativa no futuro (novo conjunto de variantes), criar
 * `diagnostic_hero_v2` e nunca reescrever este valor, para não misturar
 * experiências diferentes no mesmo relatório. */
export const DIAGNOSTIC_HERO_EXPERIMENT_ID = "diagnostic_hero_v1";

export type DiagnosticHeroVariantValue = "PAIN" | "WORD_OF_MOUTH" | "GROWTH";

export const DIAGNOSTIC_HERO_VARIANTS: DiagnosticHeroVariantValue[] = [
  "PAIN",
  "WORD_OF_MOUTH",
  "GROWTH",
];

/** `/diagnostico?hero=pain|word_of_mouth|growth` — override manual só para
 * QA, nunca deve poluir o sorteio real (marca sempre `isDebug: true`). */
const QA_HERO_VARIANT_PARAM_VALUES: Record<string, DiagnosticHeroVariantValue> = {
  pain: "PAIN",
  word_of_mouth: "WORD_OF_MOUTH",
  growth: "GROWTH",
};

export function parseForcedDiagnosticHeroVariant(
  value: string | null,
): DiagnosticHeroVariantValue | null {
  if (!value) return null;
  return QA_HERO_VARIANT_PARAM_VALUES[value.toLowerCase()] ?? null;
}

/**
 * Randomização probabilística simples (sem estado partilhado, sem
 * round-robin) — mesma técnica de `randomLandingVariant()`. `r < 0.33` →
 * dor/previsibilidade, `r < 0.66` → boca-a-boca, resto → crescimento: dá
 * aproximadamente 33% / 33% / 34%, exatamente como pedido.
 */
export function randomDiagnosticHeroVariant(): DiagnosticHeroVariantValue {
  const r = Math.random();
  if (r < 0.33) return "PAIN";
  if (r < 0.66) return "WORD_OF_MOUTH";
  return "GROWTH";
}

/**
 * Estado guardado na cookie `diagnostic_hero_session` — variante + debug.
 * Serializado da mesma forma que `landing_session`
 * (`encodeURIComponent(JSON.stringify(...))`).
 */
export type DiagnosticHeroSessionState = {
  variant: DiagnosticHeroVariantValue;
  /** Tráfego forçado via `?hero=`, nunca entra nos KPIs do teste — ver
   * `getDiagnosticVisitorContext` (também exclui esta sessão dos KPIs
   * gerais do funil, não só do teste do Hero). */
  isDebug: boolean;
};

export function serializeDiagnosticHeroSession(state: DiagnosticHeroSessionState): string {
  return encodeURIComponent(JSON.stringify(state));
}

/** Nunca lança — cookies antigas/corrompidas devolvem `null` em vez de partir a request. */
export function parseDiagnosticHeroSession(
  rawCookieValue: string | undefined | null,
): DiagnosticHeroSessionState | null {
  if (!rawCookieValue) return null;

  try {
    const decoded = decodeURIComponent(rawCookieValue);
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    const variant = value.variant;
    if (variant !== "PAIN" && variant !== "WORD_OF_MOUTH" && variant !== "GROWTH") return null;

    return { variant, isDebug: value.isDebug === true };
  } catch {
    return null;
  }
}
