/**
 * Regras determinísticas das 3 dimensões do diagnóstico — matemática pura,
 * sem BD, sem cookies, 100% testável. Nunca calcula números falsos (ex.:
 * "está a perder 287 clientes") — só classifica em 3 níveis por dimensão,
 * sempre a partir das respostas reais (secção 16 do pedido original).
 */
import type { DiagnosticAnswers } from "@/lib/diagnostic/questions";

export type DependencyLevel = "Alta" | "Média" | "Baixa";
export type OpportunityLevel = "Elevada" | "Moderada" | "Limitada";

export type DiagnosticScore = {
  /** Dependência de canais que a pessoa não controla (boca-a-boca, passagem
   * física, orgânico) — quanto mais alta, mais difícil aumentar o volume
   * quando precisa. */
  channelDependency: DependencyLevel;
  /** Capacidade de aumentar a exposição de forma deliberada e previsível. */
  controllableDistribution: DependencyLevel;
  /** Oportunidade de aumentar a visibilidade do negócio — NUNCA probabilidade
   * de ganhar dinheiro, só um indicador de espaço para crescer notoriedade. */
  localOpportunity: OpportunityLevel;
};

const UNCONTROLLABLE_CHANNELS: DiagnosticAnswers["primaryAcquisitionChannel"][] = [
  "word_of_mouth",
  "foot_traffic",
  "google",
  "social",
];

function computeChannelDependency(answers: DiagnosticAnswers): DependencyLevel {
  const { primaryAcquisitionChannel: channel, predictableReach } = answers;

  if (channel === "mixed") return "Média";

  if (channel === "advertising") {
    return predictableReach === "yes" ? "Baixa" : "Média";
  }

  if (UNCONTROLLABLE_CHANNELS.includes(channel)) {
    if (predictableReach === "no" || predictableReach === "never_thought") return "Alta";
    return "Média";
  }

  return "Média";
}

/** Guiada principalmente pela pergunta-chave (secção 9 do pedido): a
 * capacidade de aumentar o alcance de forma previsível quando precisa. */
function computeControllableDistribution(answers: DiagnosticAnswers): DependencyLevel {
  switch (answers.predictableReach) {
    case "yes":
      return "Alta";
    case "somewhat":
      return "Média";
    case "no":
    case "never_thought":
      return "Baixa";
  }
}

const ACTIVE_BUSINESS_GOALS: DiagnosticAnswers["businessGoal"][] = [
  "more_customers",
  "more_bookings",
  "promote_offer",
  "launch_product",
  "brand_awareness",
];

/** Combina notoriedade percebida + objetivo + urgência + falta de
 * distribuição controlável — nunca afirma potencial financeiro, só espaço
 * para aumentar visibilidade (secção 16 do pedido original). */
function computeLocalOpportunity(
  answers: DiagnosticAnswers,
  controllableDistribution: DependencyLevel,
): OpportunityLevel {
  let score = 0;

  if (answers.localAwareness === "very_few" || answers.localAwareness === "no_idea") score += 2;
  else if (answers.localAwareness === "some") score += 1;

  if (ACTIVE_BUSINESS_GOALS.includes(answers.businessGoal)) score += 1;

  if (answers.urgency === "now") score += 2;
  else if (answers.urgency === "one_to_three_months") score += 1;

  if (controllableDistribution === "Baixa") score += 2;
  else if (controllableDistribution === "Média") score += 1;

  if (score >= 5) return "Elevada";
  if (score >= 2) return "Moderada";
  return "Limitada";
}

export function computeDiagnosticScore(answers: DiagnosticAnswers): DiagnosticScore {
  const channelDependency = computeChannelDependency(answers);
  const controllableDistribution = computeControllableDistribution(answers);
  const localOpportunity = computeLocalOpportunity(answers, controllableDistribution);

  return { channelDependency, controllableDistribution, localOpportunity };
}
