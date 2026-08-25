/**
 * As 6 perguntas do funil `/diagnostico` — só tipos e configuração estática
 * (sem lógica de negócio, sem JSX). `DIAGNOSTIC_VERSION` identifica a versão
 * atual do próprio questionário: se as perguntas mudarem de forma
 * significativa no futuro, sobe para "v2" e nunca se reescreve este valor,
 * para não misturar respostas de versões diferentes nos relatórios (mesmo
 * princípio de `LANDING_EXPERIMENT_ID` em `landing-experiment-constants.ts`).
 */
import { ZONES } from "@/lib/zones";

export const DIAGNOSTIC_VERSION = "v1";

export type PrimaryAcquisitionChannel =
  | "word_of_mouth"
  | "google"
  | "social"
  | "advertising"
  | "foot_traffic"
  | "mixed";

export type PredictableReach = "yes" | "somewhat" | "no" | "never_thought";

export type LocalAwareness = "most" | "some" | "very_few" | "no_idea";

export type BusinessGoal =
  | "more_customers"
  | "more_bookings"
  | "promote_offer"
  | "launch_product"
  | "brand_awareness"
  | "stay_present";

export type Urgency = "now" | "one_to_three_months" | "exploring";

/** Pergunta opcional, feita no ecrã de preview (não conta para as 6 perguntas
 * do diagnóstico) — só influencia a copy do anúncio sugerido. */
export type BusinessType =
  | "restauracao"
  | "beleza"
  | "saude"
  | "imobiliario"
  | "fitness"
  | "servicos"
  | "comercio"
  | "outro";

export type DiagnosticAnswers = {
  primaryAcquisitionChannel: PrimaryAcquisitionChannel;
  predictableReach: PredictableReach;
  localAwareness: LocalAwareness;
  businessGoal: BusinessGoal;
  urgency: Urgency;
  targetLocation: string;
};

export type QuestionOption<TValue extends string> = {
  value: TValue;
  label: string;
};

export const PRIMARY_ACQUISITION_CHANNEL_OPTIONS: QuestionOption<PrimaryAcquisitionChannel>[] = [
  { value: "word_of_mouth", label: "Recomendações / boca-a-boca" },
  { value: "google", label: "Google / Google Maps" },
  { value: "social", label: "Instagram ou Facebook" },
  { value: "advertising", label: "Publicidade" },
  { value: "foot_traffic", label: "Pessoas que passam pelo negócio" },
  { value: "mixed", label: "Um pouco de tudo" },
];

export const PREDICTABLE_REACH_OPTIONS: QuestionOption<PredictableReach>[] = [
  { value: "yes", label: "Sim" },
  { value: "somewhat", label: "Mais ou menos" },
  { value: "no", label: "Não" },
  { value: "never_thought", label: "Nunca pensei nisso" },
];

export const LOCAL_AWARENESS_OPTIONS: QuestionOption<LocalAwareness>[] = [
  { value: "most", label: "A maioria conhece" },
  { value: "some", label: "Algumas conhecem" },
  { value: "very_few", label: "Muito poucas" },
  { value: "no_idea", label: "Não faço ideia" },
];

export const BUSINESS_GOAL_OPTIONS: QuestionOption<BusinessGoal>[] = [
  { value: "more_customers", label: "Mais clientes" },
  { value: "more_bookings", label: "Mais marcações ou pedidos" },
  { value: "promote_offer", label: "Dar a conhecer uma promoção" },
  { value: "launch_product", label: "Lançar um produto ou serviço" },
  { value: "brand_awareness", label: "Tornar o negócio mais conhecido" },
  { value: "stay_present", label: "Manter presença regular" },
];

export const URGENCY_OPTIONS: QuestionOption<Urgency>[] = [
  { value: "now", label: "Agora / nas próximas semanas" },
  { value: "one_to_three_months", label: "Nos próximos 1–3 meses" },
  { value: "exploring", label: "Estou apenas a explorar" },
];

export const BUSINESS_TYPE_OPTIONS: QuestionOption<BusinessType>[] = [
  { value: "restauracao", label: "Restauração" },
  { value: "beleza", label: "Beleza / estética" },
  { value: "saude", label: "Saúde" },
  { value: "imobiliario", label: "Imobiliário" },
  { value: "fitness", label: "Fitness" },
  { value: "servicos", label: "Serviços" },
  { value: "comercio", label: "Comércio / loja" },
  { value: "outro", label: "Outro" },
];

export const TOTAL_DIAGNOSTIC_QUESTIONS = 6;

export type QuestionDefinition =
  | {
      step: 1;
      key: "primaryAcquisitionChannel";
      title: "De onde vêm hoje a maioria dos seus clientes?";
      kind: "cards";
      options: typeof PRIMARY_ACQUISITION_CHANNEL_OPTIONS;
    }
  | {
      step: 2;
      key: "predictableReach";
      title: "Se na próxima semana quisesse chegar a mais pessoas, conseguiria fazê-lo de forma previsível?";
      kind: "cards";
      options: typeof PREDICTABLE_REACH_OPTIONS;
    }
  | {
      step: 3;
      key: "localAwareness";
      title: "Quanto acha que as pessoas da sua zona conhecem o seu negócio?";
      kind: "cards";
      options: typeof LOCAL_AWARENESS_OPTIONS;
    }
  | {
      step: 4;
      key: "businessGoal";
      title: "O que gostaria mais de conseguir neste momento?";
      kind: "cards";
      options: typeof BUSINESS_GOAL_OPTIONS;
    }
  | {
      step: 5;
      key: "urgency";
      title: "Quando gostaria de começar a notar mais movimento?";
      kind: "cards";
      options: typeof URGENCY_OPTIONS;
    }
  | {
      step: 6;
      key: "targetLocation";
      title: "Onde estão os clientes que quer alcançar?";
      kind: "select";
      options: { value: string; label: string }[];
    };

export const DIAGNOSTIC_QUESTIONS: QuestionDefinition[] = [
  {
    step: 1,
    key: "primaryAcquisitionChannel",
    title: "De onde vêm hoje a maioria dos seus clientes?",
    kind: "cards",
    options: PRIMARY_ACQUISITION_CHANNEL_OPTIONS,
  },
  {
    step: 2,
    key: "predictableReach",
    title:
      "Se na próxima semana quisesse chegar a mais pessoas, conseguiria fazê-lo de forma previsível?",
    kind: "cards",
    options: PREDICTABLE_REACH_OPTIONS,
  },
  {
    step: 3,
    key: "localAwareness",
    title: "Quanto acha que as pessoas da sua zona conhecem o seu negócio?",
    kind: "cards",
    options: LOCAL_AWARENESS_OPTIONS,
  },
  {
    step: 4,
    key: "businessGoal",
    title: "O que gostaria mais de conseguir neste momento?",
    kind: "cards",
    options: BUSINESS_GOAL_OPTIONS,
  },
  {
    step: 5,
    key: "urgency",
    title: "Quando gostaria de começar a notar mais movimento?",
    kind: "cards",
    options: URGENCY_OPTIONS,
  },
  {
    step: 6,
    key: "targetLocation",
    title: "Onde estão os clientes que quer alcançar?",
    kind: "select",
    options: ZONES.map((zone) => ({ value: zone, label: zone })),
  },
];

function labelFor<TValue extends string>(
  options: QuestionOption<TValue>[],
  value: TValue,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Labels em PT-PT das respostas reais — usados na copy do resultado/recomendação
 * (nunca frases genéricas desligadas do que a pessoa respondeu). */
export const ANSWER_LABELS = {
  primaryAcquisitionChannel: (value: PrimaryAcquisitionChannel) =>
    labelFor(PRIMARY_ACQUISITION_CHANNEL_OPTIONS, value),
  predictableReach: (value: PredictableReach) => labelFor(PREDICTABLE_REACH_OPTIONS, value),
  localAwareness: (value: LocalAwareness) => labelFor(LOCAL_AWARENESS_OPTIONS, value),
  businessGoal: (value: BusinessGoal) => labelFor(BUSINESS_GOAL_OPTIONS, value),
  urgency: (value: Urgency) => labelFor(URGENCY_OPTIONS, value),
  businessType: (value: BusinessType) => labelFor(BUSINESS_TYPE_OPTIONS, value),
};
