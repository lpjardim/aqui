/**
 * Copy determinística do resultado e do preview — PT-PT simples, sem os
 * termos proibidos (secções 46-47 do pedido original: "awareness", "funnel",
 * "performance", "revolucione", etc.). Tudo aqui é gerado só a partir das
 * respostas reais — nunca frases genéricas desligadas do diagnóstico, e
 * nunca números inventados (secção 9).
 */
import type { BusinessGoal, DiagnosticAnswers } from "@/lib/diagnostic/questions";
import { ANSWER_LABELS } from "@/lib/diagnostic/questions";
import type { DependencyLevel, DiagnosticScore, OpportunityLevel } from "@/lib/diagnostic/scoring";
import { NATIONAL_ZONE } from "@/lib/zones";

export type DiagnosticDimensionCopy = {
  title: string;
  /** Só para apresentação — nunca é literalmente o valor interno de
   * `OpportunityLevel`/`DependencyLevel` quando isso pudesse ler-se como
   * "não há motivo para comprar" (ver `LOCAL_OPPORTUNITY_LEVEL_LABELS`). A
   * pontuação/recomendação continuam sempre a usar o valor interno de
   * `DiagnosticScore`, nunca este texto. */
  level: string;
  description: string;
};

const CHANNEL_DEPENDENCY_DESCRIPTIONS: Record<DependencyLevel, (channelLabel: string) => string> = {
  Alta: (channelLabel) =>
    `Indicou que a maioria dos seus clientes chega através de ${channelLabel}. É um bom canal, mas é difícil aumentar o volume por decisão própria quando precisa.`,
  Média: (channelLabel) =>
    `Os seus clientes chegam de uma mistura de canais, incluindo ${channelLabel}. Já tem alguma diversidade, mas ainda depende em parte de canais que não controla.`,
  Baixa: () =>
    "Já usa publicidade de forma consistente para chegar a mais pessoas — tem uma base mais sólida do que a maioria dos negócios.",
};

export function buildChannelDependencyCopy(
  answers: DiagnosticAnswers,
  score: DiagnosticScore,
): DiagnosticDimensionCopy {
  const channelLabel = ANSWER_LABELS.primaryAcquisitionChannel(
    answers.primaryAcquisitionChannel,
  ).toLowerCase();

  return {
    title: "Dependência de canais que não controla",
    level: score.channelDependency,
    description: CHANNEL_DEPENDENCY_DESCRIPTIONS[score.channelDependency](channelLabel),
  };
}

const CONTROLLABLE_DISTRIBUTION_DESCRIPTIONS: Record<DependencyLevel, string> = {
  Baixa:
    "Hoje não tem uma forma previsível de colocar o negócio perante mais pessoas quando quer gerar mais procura.",
  Média:
    "Consegue, mais ou menos, aumentar a exposição do negócio quando precisa — mas não de forma totalmente previsível.",
  Alta: "Já consegue aumentar a exposição do negócio de forma previsível quando precisa.",
};

export function buildControllableDistributionCopy(score: DiagnosticScore): DiagnosticDimensionCopy {
  return {
    title: "Capacidade de aumentar visibilidade",
    level: score.controllableDistribution,
    description: CONTROLLABLE_DISTRIBUTION_DESCRIPTIONS[score.controllableDistribution],
  };
}

function urgencyPhrase(urgency: DiagnosticAnswers["urgency"]): string {
  switch (urgency) {
    case "now":
      return "nas próximas semanas";
    case "one_to_three_months":
      return "nos próximos meses";
    case "exploring":
      return "quando decidir avançar";
  }
}

/**
 * Nunca mostrar "Limitada" ao utilizador aqui — numa página cujo objetivo é
 * levar a uma compra, dizer que a "oportunidade é limitada" lê-se como "não
 * vale a pena investir", o oposto do que é verdade (mesmo estes negócios
 * recebem uma recomendação real — ver cenário B em `recommendation.ts`).
 * A pontuação interna (`score.localOpportunity`) continua "Limitada" para
 * efeitos de lógica/testes; só este rótulo apresentado é reformulado como
 * uma conquista a proteger, nunca como ausência de motivo para agir.
 */
const LOCAL_OPPORTUNITY_LEVEL_LABELS: Record<OpportunityLevel, string> = {
  Elevada: "Elevada",
  Moderada: "Moderada",
  Limitada: "Já conquistada",
};

export function buildLocalOpportunityCopy(
  answers: DiagnosticAnswers,
  score: DiagnosticScore,
): DiagnosticDimensionCopy {
  const goalLabel = ANSWER_LABELS.businessGoal(answers.businessGoal).toLowerCase();
  const phrase = urgencyPhrase(answers.urgency);

  const descriptions: Record<OpportunityLevel, string> = {
    Elevada: `Quer ${goalLabel} ${phrase} e existe espaço claro para aumentar deliberadamente a presença do negócio na sua zona.`,
    Moderada: `Quer ${goalLabel} e existe espaço para aumentar a presença do negócio na sua zona, mesmo que não seja a prioridade mais urgente.`,
    Limitada:
      "Já é bem conhecido na sua zona — a oportunidade agora é manter essa posição e não perder terreno para negócios que estão a começar a investir em publicidade.",
  };

  return {
    title: "Oportunidade local",
    level: LOCAL_OPPORTUNITY_LEVEL_LABELS[score.localOpportunity],
    description: descriptions[score.localOpportunity],
  };
}

export function buildDiagnosticDimensions(
  answers: DiagnosticAnswers,
  score: DiagnosticScore,
): DiagnosticDimensionCopy[] {
  return [
    buildChannelDependencyCopy(answers, score),
    buildControllableDistributionCopy(score),
    buildLocalOpportunityCopy(answers, score),
  ];
}

/**
 * Frase principal do resultado — só aparece quando as respostas a
 * suportam. Se o negócio já usa publicidade de forma consistente e
 * consegue aumentar o alcance quando quer, não faz sentido nenhuma
 * conclusão "alarmista" (secção 19 do pedido: cenário B do QA manual).
 */
export function buildMainConclusion(score: DiagnosticScore): string | null {
  if (score.channelDependency === "Baixa" && score.controllableDistribution === "Alta") {
    return null;
  }

  if (score.channelDependency === "Alta" || score.controllableDistribution === "Baixa") {
    return "O problema não parece ser falta de opções. É depender demasiado de as pessoas o encontrarem.";
  }

  return "Hoje, grande parte da descoberta do seu negócio acontece através de canais que não consegue acelerar quando precisa.";
}

/**
 * FOMO de inação baseado nas próprias respostas (secção 18) — nunca
 * escassez inventada. Cada frase só aparece quando a condição real que a
 * justifica está presente; pode devolver uma lista vazia.
 */
export function buildFomoInsights(answers: DiagnosticAnswers, score: DiagnosticScore): string[] {
  const insights: string[] = [];

  if (answers.urgency === "now" && score.controllableDistribution !== "Alta") {
    insights.push(
      "Indicou que gostaria de gerar mais movimento nas próximas semanas, mas hoje não tem um canal que lhe permita aumentar deliberadamente a exposição.",
    );
  }

  if (answers.primaryAcquisitionChannel === "word_of_mouth") {
    insights.push(
      "Enquanto depender sobretudo de recomendações, a velocidade a que novas pessoas descobrem o negócio não está totalmente nas suas mãos.",
    );
  }

  if (answers.localAwareness === "very_few" || answers.localAwareness === "no_idea") {
    insights.push(
      "Se poucas pessoas da sua zona conhecem o negócio, há uma etapa anterior à venda: entrar primeiro no radar delas.",
    );
  }

  return insights;
}

const GOAL_HEADLINE_TEMPLATES: Record<BusinessGoal, (name: string, locationPhrase: string) => string> = {
  more_customers: (name, locationPhrase) => `${name} está ${locationPhrase}. Venha conhecer.`,
  more_bookings: (name, locationPhrase) => `Marque já com ${name}, ${locationPhrase}.`,
  promote_offer: (name, locationPhrase) => `${name} tem uma novidade para si, ${locationPhrase}.`,
  launch_product: (name, locationPhrase) => `Já pode conhecer ${name}, ${locationPhrase}.`,
  brand_awareness: (name, locationPhrase) => `Conheça ${name}, ${locationPhrase}.`,
  stay_present: (name, locationPhrase) => `${name} continua ao seu lado, ${locationPhrase}.`,
};

/**
 * "Sugira o texto por mim" — templates 100% determinísticos (sem geração
 * por IA), parametrizados pelo objetivo real indicado no diagnóstico e pela
 * zona. Nunca usa nenhuma das frases proibidas nas secções 46-47.
 */
export function suggestPreviewHeadline({
  businessName,
  businessGoal,
  zone,
}: {
  businessName: string;
  businessGoal: BusinessGoal;
  zone: string;
}): string {
  const name = businessName.trim() || "O nosso negócio";
  const locationPhrase = zone === NATIONAL_ZONE ? "em todo o país" : `em ${zone}`;
  return GOAL_HEADLINE_TEMPLATES[businessGoal](name, locationPhrase);
}
