/**
 * Handoff `/diagnostico` → `/pedido` — só constantes/tipos puros e funções
 * sem `next/headers` (mesmo princípio de `landing-experiment-constants.ts`),
 * para poderem ser usados tanto pelo cliente (grava a cookie antes do
 * redirect final, ver `recommendation-screen.tsx`) como pelo servidor (lê a
 * cookie em `src/lib/diagnostic-context.ts`).
 *
 * Ao contrário de `landing_session` (escrita pelo `proxy.ts`), esta
 * cookie é escrita pelo PRÓPRIO CLIENTE — por isso todos os campos são
 * validados defensivamente ao ler (nunca confiar em zona/pack/frequência
 * sem confirmar que ainda são válidos), e nunca contém nada usado para
 * decidir preço (o preço continua sempre a ser recalculado em `/api/pedido`
 * a partir de `packId`/`billingFrequency`, nunca lido diretamente daqui).
 */
import { getPack, type PackId } from "@/lib/packs";
import type { BillingFrequency } from "@/lib/pricing";
import { isValidZone } from "@/lib/zones";
import { DIAGNOSTIC_VERSION, type DiagnosticAnswers } from "@/lib/diagnostic/questions";
import { RECOMMENDATION_MODEL_VERSION } from "@/lib/diagnostic/recommendation";

export const DIAGNOSTIC_HANDOFF_COOKIE = "diagnostic_handoff";

/** Curta duração de propósito — só serve para atravessar o redirect
 * `/diagnostico` → `/pedido`, nunca é pensada para durar uma visita
 * inteira. */
export const DIAGNOSTIC_HANDOFF_MAX_AGE_SECONDS = 60 * 60;

export type DiagnosticHandoffAsset = { url: string; fileType: string };

export type DiagnosticHandoff = {
  diagnosticId: string;
  diagnosticVersion: string;
  recommendationId: string;
  recommendationModelVersion: string;
  answers: Partial<DiagnosticAnswers>;
  zone: string;
  packId: PackId;
  billingFrequency: BillingFrequency;
  /** Ficheiros já enviados no ecrã de preview — reaproveitados no checkout
   * para não obrigar a repetir o upload. */
  assets: DiagnosticHandoffAsset[];
};

export function serializeDiagnosticHandoff(handoff: DiagnosticHandoff): string {
  return encodeURIComponent(JSON.stringify(handoff));
}

function isValidAssetEntry(value: unknown): value is DiagnosticHandoffAsset {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).url === "string" &&
    typeof (value as Record<string, unknown>).fileType === "string"
  );
}

/** Nunca lança — cookie ausente/corrompida/desatualizada devolve `null`. */
export function parseDiagnosticHandoff(
  rawCookieValue: string | undefined | null,
): DiagnosticHandoff | null {
  if (!rawCookieValue) return null;

  try {
    const decoded = decodeURIComponent(rawCookieValue);
    const parsed: unknown = JSON.parse(decoded);
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    if (typeof value.diagnosticId !== "string" || value.diagnosticId === "") return null;
    if (typeof value.zone !== "string" || !isValidZone(value.zone)) return null;
    if (typeof value.packId !== "string" || !getPack(value.packId)) return null;
    if (value.billingFrequency !== "ONE_TIME" && value.billingFrequency !== "MONTHLY") return null;

    const assets = Array.isArray(value.assets) ? value.assets.filter(isValidAssetEntry) : [];

    return {
      diagnosticId: value.diagnosticId,
      diagnosticVersion:
        typeof value.diagnosticVersion === "string" ? value.diagnosticVersion : DIAGNOSTIC_VERSION,
      recommendationId: typeof value.recommendationId === "string" ? value.recommendationId : "",
      recommendationModelVersion:
        typeof value.recommendationModelVersion === "string"
          ? value.recommendationModelVersion
          : RECOMMENDATION_MODEL_VERSION,
      answers:
        typeof value.answers === "object" && value.answers !== null
          ? (value.answers as Partial<DiagnosticAnswers>)
          : {},
      zone: value.zone,
      packId: value.packId as PackId,
      billingFrequency: value.billingFrequency,
      assets,
    };
  } catch {
    return null;
  }
}
