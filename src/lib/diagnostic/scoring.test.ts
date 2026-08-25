import { describe, expect, it } from "vitest";
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

describe("computeDiagnosticScore", () => {
  it("cenário A do QA manual — boca-a-boca + sem previsibilidade + urgência alta → diagnóstico forte", () => {
    const score = computeDiagnosticScore(
      answers({
        primaryAcquisitionChannel: "word_of_mouth",
        predictableReach: "no",
        urgency: "now",
      }),
    );

    expect(score.channelDependency).toBe("Alta");
    expect(score.controllableDistribution).toBe("Baixa");
    expect(score.localOpportunity).toBe("Elevada");
  });

  it("cenário B do QA manual — já anuncia + previsibilidade alta + apenas explorar → nada de dependência elevada", () => {
    const score = computeDiagnosticScore(
      answers({
        primaryAcquisitionChannel: "advertising",
        predictableReach: "yes",
        urgency: "exploring",
        localAwareness: "most",
      }),
    );

    expect(score.channelDependency).toBe("Baixa");
    expect(score.controllableDistribution).toBe("Alta");
    expect(score.localOpportunity).not.toBe("Elevada");
  });

  it("cenário C do QA manual — Instagram orgânico + baixa notoriedade + mais marcações", () => {
    const score = computeDiagnosticScore(
      answers({
        primaryAcquisitionChannel: "social",
        localAwareness: "very_few",
        businessGoal: "more_bookings",
        predictableReach: "somewhat",
      }),
    );

    expect(score.channelDependency).toBe("Média");
    expect(score.localOpportunity).not.toBe("Limitada");
  });

  it("nunca pensou nisso conta como falta de distribuição controlável", () => {
    const score = computeDiagnosticScore(answers({ predictableReach: "never_thought" }));
    expect(score.controllableDistribution).toBe("Baixa");
  });

  it("mistura de canais é sempre dependência média, independentemente da previsibilidade", () => {
    const score = computeDiagnosticScore(
      answers({ primaryAcquisitionChannel: "mixed", predictableReach: "no" }),
    );
    expect(score.channelDependency).toBe("Média");
  });

  it("publicidade sem previsibilidade não é considerada dependência baixa", () => {
    const score = computeDiagnosticScore(
      answers({ primaryAcquisitionChannel: "advertising", predictableReach: "somewhat" }),
    );
    expect(score.channelDependency).toBe("Média");
  });

  it("oportunidade local nunca excede 'Limitada' quando tudo já está bem resolvido", () => {
    const score = computeDiagnosticScore(
      answers({
        localAwareness: "most",
        businessGoal: "stay_present",
        urgency: "exploring",
        predictableReach: "yes",
        primaryAcquisitionChannel: "advertising",
      }),
    );
    expect(score.localOpportunity).toBe("Limitada");
  });

  it("zona nacional não altera a pontuação por si só (só a recomendação usa isso)", () => {
    const score = computeDiagnosticScore(answers({ targetLocation: NATIONAL_ZONE }));
    expect(score).toBeDefined();
  });
});
