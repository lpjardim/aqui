/**
 * Persistência local do diagnóstico — permite voltar atrás/retomar na
 * mesma sessão de browser (secções 43-44 do pedido original), usando
 * `sessionStorage`. Deliberadamente NUNCA usa cookies nem se mistura com o
 * sticky assignment dos testes A/B/C (`landing_session`/`pricing_variant`/
 * `hero_variant`) — são conceitos diferentes.
 */
import { DIAGNOSTIC_VERSION, type DiagnosticAnswers } from "@/lib/diagnostic/questions";

const SESSION_STORAGE_KEY = "aqui_diagnostic_session";

export type DiagnosticSessionState = {
  version: string;
  diagnosticId: string;
  answers: Partial<DiagnosticAnswers>;
  updatedAt: string;
};

/** Gera um novo `diagnosticId` — identifica uma "corrida" completa do
 * diagnóstico nos eventos de tracking (`DiagnosticEvent.diagnosticId`). */
export function createDiagnosticId(): string {
  return crypto.randomUUID();
}

/** Nunca lança — `sessionStorage` corrompida/indisponível devolve `null`. */
export function loadDiagnosticSession(): DiagnosticSessionState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const value = parsed as Record<string, unknown>;
    // Uma versão antiga do questionário nunca se mistura com respostas novas.
    if (value.version !== DIAGNOSTIC_VERSION) return null;
    if (typeof value.diagnosticId !== "string" || value.diagnosticId === "") return null;

    return {
      version: DIAGNOSTIC_VERSION,
      diagnosticId: value.diagnosticId,
      answers: typeof value.answers === "object" && value.answers !== null ? value.answers : {},
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Nunca lança — se `sessionStorage` estiver indisponível (modo privado,
 * quota esgotada), o diagnóstico continua a funcionar, só sem retomar. */
export function saveDiagnosticSession(state: {
  diagnosticId: string;
  answers: Partial<DiagnosticAnswers>;
}): void {
  if (typeof window === "undefined") return;

  const payload: DiagnosticSessionState = {
    version: DIAGNOSTIC_VERSION,
    diagnosticId: state.diagnosticId,
    answers: state.answers,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignorado de propósito — nunca partir o fluxo do diagnóstico por isto.
  }
}

export function clearDiagnosticSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignorado de propósito.
  }
}
