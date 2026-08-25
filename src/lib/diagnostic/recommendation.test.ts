import { describe, expect, it } from "vitest";
import { computeRecommendation } from "@/lib/diagnostic/recommendation";
import { computeDiagnosticScore } from "@/lib/diagnostic/scoring";
import type { DiagnosticAnswers } from "@/lib/diagnostic/questions";
import { NATIONAL_ZONE } from "@/lib/zones";

function answers(overrides: Partial<DiagnosticAnswers> = {}): DiagnosticAnswers {
  return {
    primaryAcquisitionChannel: "word_of_mouth",
    predictableReach: "somewhat",
    localAwareness: "some",
    businessGoal: "more_customers",
    urgency: "one_to_three_months",
    targetLocation: "Lisboa",
    ...overrides,
  };
}

function recommendationFor(overrides: Partial<DiagnosticAnswers> = {}) {
  const a = answers(overrides);
  return computeRecommendation(a, computeDiagnosticScore(a));
}

describe("computeRecommendation", () => {
  it("recomenda Essencial quando o utilizador está só a explorar, independentemente do resto", () => {
    const recommendation = recommendationFor({
      urgency: "exploring",
      primaryAcquisitionChannel: "word_of_mouth",
      predictableReach: "no",
    });
    expect(recommendation.tier).toBe("essencial");
    expect(recommendation.packId).toBe("p2k");
  });

  it("cenário A do QA manual — boca-a-boca + sem previsibilidade + urgência alta → plano coerente (Crescimento)", () => {
    const recommendation = recommendationFor({
      primaryAcquisitionChannel: "word_of_mouth",
      predictableReach: "no",
      urgency: "now",
      targetLocation: "Porto",
    });
    expect(recommendation.tier).toBe("crescimento");
    expect(recommendation.packId).toBe("p20k");
  });

  it("cenário B do QA manual — já anuncia + previsibilidade alta + apenas explorar → Essencial, nunca Escala", () => {
    const recommendation = recommendationFor({
      primaryAcquisitionChannel: "advertising",
      predictableReach: "yes",
      urgency: "exploring",
    });
    expect(recommendation.tier).toBe("essencial");
  });

  it("só recomenda Escala com sinal claro: alcance nacional + urgência imediata", () => {
    const recommendation = recommendationFor({
      targetLocation: NATIONAL_ZONE,
      urgency: "now",
      primaryAcquisitionChannel: "word_of_mouth",
      predictableReach: "no",
    });
    expect(recommendation.tier).toBe("escala");
    expect(recommendation.packId).toBe("p200k");
  });

  it("nunca recomenda Escala só por urgência, sem alcance nacional", () => {
    const recommendation = recommendationFor({
      targetLocation: "Braga",
      urgency: "now",
      primaryAcquisitionChannel: "word_of_mouth",
      predictableReach: "no",
    });
    expect(recommendation.tier).not.toBe("escala");
  });

  it("nunca recomenda Escala só por alcance nacional, sem urgência", () => {
    const recommendation = recommendationFor({
      targetLocation: NATIONAL_ZONE,
      urgency: "one_to_three_months",
      primaryAcquisitionChannel: "advertising",
      predictableReach: "yes",
    });
    expect(recommendation.tier).not.toBe("escala");
  });

  it("presença regular → frequência mensal", () => {
    const recommendation = recommendationFor({ businessGoal: "stay_present", urgency: "now" });
    expect(recommendation.billingFrequency).toBe("MONTHLY");
  });

  it("promoção pontual → pagamento único", () => {
    const recommendation = recommendationFor({ businessGoal: "promote_offer", urgency: "now" });
    expect(recommendation.billingFrequency).toBe("ONE_TIME");
  });

  it("lançamento de produto → pagamento único", () => {
    const recommendation = recommendationFor({ businessGoal: "launch_product" });
    expect(recommendation.billingFrequency).toBe("ONE_TIME");
  });

  it("só a explorar, sem objetivo pontual → pagamento único (menor compromisso)", () => {
    const recommendation = recommendationFor({ businessGoal: "more_customers", urgency: "exploring" });
    expect(recommendation.billingFrequency).toBe("ONE_TIME");
  });

  it("as razões refletem sempre as respostas reais", () => {
    const recommendation = recommendationFor({
      businessGoal: "more_bookings",
      urgency: "now",
      primaryAcquisitionChannel: "word_of_mouth",
    });
    expect(recommendation.reasons.join(" ")).toContain("marcações");
    expect(recommendation.reasons.join(" ")).toContain("recomendações");
  });

  it("o id da recomendação é determinístico e inclui a versão do modelo", () => {
    const recommendation = recommendationFor({ urgency: "exploring" });
    expect(recommendation.id).toBe("p2k_ONE_TIME_v1");
  });
});
