/**
 * Regras de recomendação de campanha — honestas e determinísticas (secção
 * 24 do pedido original): "mais caro" nunca é o padrão, só é recomendado
 * quando há sinais claros nas respostas reais. `RECOMMENDATION_MODEL_VERSION`
 * segue o mesmo princípio de `DIAGNOSTIC_VERSION` — sobe para "v2" se as
 * regras mudarem de forma significativa, para nunca misturar recomendações
 * de versões diferentes nos relatórios.
 */
import type { PackId } from "@/lib/packs";
import type { BillingFrequency } from "@/lib/pricing";
import { NATIONAL_ZONE } from "@/lib/zones";
import { ANSWER_LABELS, type DiagnosticAnswers } from "@/lib/diagnostic/questions";
import type { DiagnosticScore } from "@/lib/diagnostic/scoring";

export const RECOMMENDATION_MODEL_VERSION = "v1";

export type CampaignTier = "essencial" | "crescimento" | "escala";

export type Recommendation = {
  id: string;
  tier: CampaignTier;
  packId: PackId;
  billingFrequency: BillingFrequency;
  /** Frases concretas, construídas a partir das respostas reais — nunca
   * texto genérico desligado do que a pessoa respondeu. */
  reasons: string[];
};

const TIER_TO_PACK: Record<CampaignTier, PackId> = {
  essencial: "p2k",
  crescimento: "p20k",
  escala: "p200k",
};

export const TIER_LABELS: Record<CampaignTier, string> = {
  essencial: "Campanha Essencial",
  crescimento: "Campanha Crescimento",
  escala: "Campanha Escala",
};

/**
 * Escala só entra quando há um sinal claro de necessidade de grande
 * distribuição (quer alcançar todo o país E quer resultados já) — nunca por
 * defeito. Essencial entra quando a pessoa está só a explorar. Fora destes
 * dois extremos, quem já tem algum sinal de precisar de distribuição
 * deliberada (dependência de canais não controláveis OU falta de capacidade
 * de distribuição controlável) fica em Crescimento — o "meio-termo" honesto
 * para quem já tem um objetivo real, sem empurrar o plano maior.
 */
function computeTier(answers: DiagnosticAnswers, score: DiagnosticScore): CampaignTier {
  if (answers.urgency === "exploring") return "essencial";

  const wantsNationalScale = answers.targetLocation === NATIONAL_ZONE;
  if (wantsNationalScale && answers.urgency === "now") return "escala";

  const needsDeliberateDistribution =
    score.channelDependency !== "Baixa" || score.controllableDistribution !== "Alta";

  return needsDeliberateDistribution ? "crescimento" : "essencial";
}

function computeBillingFrequency(answers: DiagnosticAnswers): BillingFrequency {
  if (answers.businessGoal === "stay_present") return "MONTHLY";
  if (answers.businessGoal === "promote_offer" || answers.businessGoal === "launch_product") {
    return "ONE_TIME";
  }
  return answers.urgency === "exploring" ? "ONE_TIME" : "MONTHLY";
}

function urgencyReason(answers: DiagnosticAnswers): string {
  switch (answers.urgency) {
    case "now":
      return "quer começar a notar movimento agora ou nas próximas semanas";
    case "one_to_three_months":
      return "quer começar a notar movimento nos próximos 1 a 3 meses";
    case "exploring":
      return "está sobretudo a explorar, por agora";
  }
}

function buildReasons(answers: DiagnosticAnswers, tier: CampaignTier): string[] {
  const reasons: string[] = [
    `quer ${ANSWER_LABELS.businessGoal(answers.businessGoal).toLowerCase()}`,
    urgencyReason(answers),
  ];

  if (answers.primaryAcquisitionChannel !== "advertising") {
    reasons.push(
      `hoje a maioria dos seus clientes vem de ${ANSWER_LABELS.primaryAcquisitionChannel(
        answers.primaryAcquisitionChannel,
      ).toLowerCase()}`,
    );
  }

  if (answers.businessGoal === "stay_present") {
    reasons.push("pretende manter presença regular, não só uma campanha pontual");
  }

  if (tier === "escala") {
    reasons.push("quer alcançar clientes em todo o país");
  }

  return reasons;
}

export function computeRecommendation(
  answers: DiagnosticAnswers,
  score: DiagnosticScore,
): Recommendation {
  const tier = computeTier(answers, score);
  const packId = TIER_TO_PACK[tier];
  const billingFrequency = computeBillingFrequency(answers);
  const reasons = buildReasons(answers, tier);
  const id = `${packId}_${billingFrequency}_${RECOMMENDATION_MODEL_VERSION}`;

  return { id, tier, packId, billingFrequency, reasons };
}
