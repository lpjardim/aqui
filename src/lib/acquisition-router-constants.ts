/**
 * Nível 1 do router de experimentos de `/go` (`acquisition_router_v1`) — só
 * constantes/tipos puros e funções sem `next/headers`, para poderem ser
 * usados tanto pelo `proxy.ts` como pelo resto do server, mesmo princípio de
 * `landing-experiment-constants.ts`/`diagnostic-hero-constants.ts`.
 *
 * Decide, ANTES de qualquer sorteio de nível 2, para que família de
 * experimento esta visita vai: `LANDING` (as 3 landing pages tradicionais,
 * `landing_page_v1`) ou `DIAGNOSTIC` (o funil interativo `/diagnostico`,
 * `diagnostic_hero_v1`). O nível 2 de cada família continua exatamente como
 * já era — este ficheiro nunca duplica a randomização do Hero do
 * diagnóstico, só decide se essa família é sequer visitada.
 *
 * Mesma semântica de sessão do `landing_page_v1`/`diagnostic_hero_v1`: a
 * cookie `acquisition_router_session` nunca tem `Max-Age`/`Expires` — morre
 * quando o browser fecha por completo. Mantém a mesma família durante toda a
 * sessão (sem flicker em refresh/back/navegação imediata), mas nunca prende
 * um visitante para sempre — uma nova sessão pode calhar numa família
 * diferente.
 */

export const ACQUISITION_ROUTER_ID = "acquisition_router_v1";

export const ACQUISITION_ROUTER_SESSION_COOKIE = "acquisition_router_session";

export type FunnelFamilyValue = "LANDING" | "DIAGNOSTIC";

export type LandingVariantWeights = Record<"NORMAL" | "SALES" | "BLOG", number>;

/**
 * Única fonte de verdade para todos os pesos do router — mudar a
 * distribuição (ex.: 70% diagnóstico / 30% landing) é só editar estes
 * números, nunca a lógica em `proxy.ts`. Validado no module-load via
 * `validateAcquisitionRouterConfig()` (ver mais abaixo).
 */
export const ACQUISITION_ROUTER_CONFIG = {
  families: {
    LANDING: {
      weight: 0.5,
      variants: {
        NORMAL: 0.33,
        SALES: 0.33,
        BLOG: 0.34,
      } satisfies LandingVariantWeights,
    },
    DIAGNOSTIC: {
      weight: 0.5,
    },
  },
} as const;

/**
 * Randomização probabilística genérica por pesos (sem estado partilhado,
 * sem round-robin) — reutilizada nos dois níveis do router. Particiona
 * `[0, soma dos pesos)` em segmentos consecutivos e sorteia um ponto nesse
 * intervalo; cada chave tem probabilidade `peso / soma` de ser escolhida,
 * independentemente da ordem das chaves no objeto.
 */
export function weightedChoice<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const r = Math.random() * total;

  let cumulative = 0;
  for (const [key, weight] of entries) {
    cumulative += weight;
    if (r < cumulative) return key;
  }
  // Só alcançável por imprecisão de ponto flutuante — devolve a última chave.
  return entries[entries.length - 1][0];
}

export function pickFunnelFamily(): FunnelFamilyValue {
  return weightedChoice({
    LANDING: ACQUISITION_ROUTER_CONFIG.families.LANDING.weight,
    DIAGNOSTIC: ACQUISITION_ROUTER_CONFIG.families.DIAGNOSTIC.weight,
  });
}

export function pickLandingVariant(): "NORMAL" | "SALES" | "BLOG" {
  return weightedChoice(ACQUISITION_ROUTER_CONFIG.families.LANDING.variants);
}

const WEIGHT_SUM_TOLERANCE = 0.001;

function sumWeights(weights: Record<string, number>): number {
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0);
}

/**
 * Valida que os pesos de cada nível somam ~1 — chamada uma única vez no
 * module-load (abaixo), fora de produção, para falhar claramente em
 * desenvolvimento em vez de distorcer silenciosamente o tráfego real.
 */
export function validateAcquisitionRouterConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const familySum = sumWeights({
    LANDING: ACQUISITION_ROUTER_CONFIG.families.LANDING.weight,
    DIAGNOSTIC: ACQUISITION_ROUTER_CONFIG.families.DIAGNOSTIC.weight,
  });
  if (Math.abs(familySum - 1) > WEIGHT_SUM_TOLERANCE) {
    errors.push(`Pesos das famílias (LANDING/DIAGNOSTIC) somam ${familySum}, esperado ~1.`);
  }

  const variantSum = sumWeights(ACQUISITION_ROUTER_CONFIG.families.LANDING.variants);
  if (Math.abs(variantSum - 1) > WEIGHT_SUM_TOLERANCE) {
    errors.push(`Pesos das variantes da landing (NORMAL/SALES/BLOG) somam ${variantSum}, esperado ~1.`);
  }

  return { valid: errors.length === 0, errors };
}

if (process.env.NODE_ENV !== "production") {
  const { valid, errors } = validateAcquisitionRouterConfig();
  if (!valid) {
    throw new Error(`[acquisition-router] Config de pesos inválida: ${errors.join(" ")}`);
  }
}

const QA_FAMILY_PARAM_VALUES: Record<string, FunnelFamilyValue> = {
  landing: "LANDING",
  diagnostic: "DIAGNOSTIC",
};

/** `/go?family=landing|diagnostic` — override manual só para QA/admin,
 * nunca deve poluir o sorteio real (marca sempre `isDebug: true`). */
export function parseForcedFunnelFamily(value: string | null): FunnelFamilyValue | null {
  if (!value) return null;
  return QA_FAMILY_PARAM_VALUES[value.toLowerCase()] ?? null;
}

/**
 * Estado guardado na cookie `acquisition_router_session` — só o essencial
 * para saber a que família esta sessão pertence e se deve ser excluída dos
 * KPIs. A variante da landing continua a viver exclusivamente em
 * `landing_session` (nunca duplicada aqui); a variante do Hero do
 * diagnóstico nunca é decidida a este nível.
 */
export type AcquisitionRouterSessionState = {
  routerExperimentId: string;
  funnelFamily: FunnelFamilyValue;
  /** Tráfego forçado via `/go?family=`/`?variant=`, nunca entra nos KPIs do
   * nível 1 do router — ver `getAcquisitionRouterContext`. */
  isDebug: boolean;
};

export function serializeAcquisitionRouterSession(state: AcquisitionRouterSessionState): string {
  return encodeURIComponent(JSON.stringify(state));
}

/** Nunca lança — cookies antigas/corrompidas devolvem `null` em vez de partir a request. */
export function parseAcquisitionRouterSession(
  rawCookieValue: string | undefined | null,
): AcquisitionRouterSessionState | null {
  if (!rawCookieValue) return null;

  try {
    const decoded = decodeURIComponent(rawCookieValue);
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    const funnelFamily = value.funnelFamily;
    if (funnelFamily !== "LANDING" && funnelFamily !== "DIAGNOSTIC") return null;
    if (typeof value.routerExperimentId !== "string" || value.routerExperimentId === "") return null;

    return {
      routerExperimentId: value.routerExperimentId,
      funnelFamily,
      isDebug: value.isDebug === true,
    };
  } catch {
    return null;
  }
}
