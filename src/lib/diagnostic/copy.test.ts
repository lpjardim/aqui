import { describe, expect, it } from "vitest";
import { buildDiagnosticDimensions, buildMainConclusion } from "@/lib/diagnostic/copy";
import { computeDiagnosticScore } from "@/lib/diagnostic/scoring";
import type { DiagnosticAnswers } from "@/lib/diagnostic/questions";

function answers(overrides: Partial<DiagnosticAnswers> = {}): DiagnosticAnswers {
  return {
    primaryAcquisitionChannel: "advertising",
    predictableReach: "yes",
    localAwareness: "most",
    businessGoal: "stay_present",
    urgency: "exploring",
    targetLocation: "Lisboa",
    ...overrides,
  };
}

/** Palavras/expressões que nunca podem aparecer no texto mostrado ao
 * utilizador desta página — isto é um funil que quer levar a uma compra,
 * nunca lhe pode dizer (mesmo que indiretamente) que não vale a pena agir. */
const DISCOURAGING_PATTERNS = [/\blimitad[ao]s?\b/i, /não vale a pena/i, /não precisa/i, /não há motivo/i];

function expectNeverDiscouraging(text: string) {
  for (const pattern of DISCOURAGING_PATTERNS) {
    expect(text).not.toMatch(pattern);
  }
}

describe("buildDiagnosticDimensions — nunca desmotiva a compra", () => {
  it("quando a oportunidade local interna é 'Limitada', a palavra mostrada nunca é essa", () => {
    const a = answers({
      localAwareness: "most",
      businessGoal: "stay_present",
      urgency: "exploring",
      predictableReach: "yes",
      primaryAcquisitionChannel: "advertising",
    });
    const score = computeDiagnosticScore(a);
    expect(score.localOpportunity).toBe("Limitada");

    const dimensions = buildDiagnosticDimensions(a, score);
    const localOpportunity = dimensions.find((d) => d.title === "Oportunidade local");
    expect(localOpportunity).toBeDefined();

    expectNeverDiscouraging(localOpportunity!.level);
    expectNeverDiscouraging(localOpportunity!.description);
  });

  it("nenhuma combinação de respostas produz uma frase desmotivadora em nenhuma das 3 dimensões", () => {
    const channels: DiagnosticAnswers["primaryAcquisitionChannel"][] = [
      "word_of_mouth",
      "google",
      "social",
      "advertising",
      "foot_traffic",
      "mixed",
    ];
    const reaches: DiagnosticAnswers["predictableReach"][] = ["yes", "somewhat", "no", "never_thought"];
    const awarenesses: DiagnosticAnswers["localAwareness"][] = ["most", "some", "very_few", "no_idea"];
    const goals: DiagnosticAnswers["businessGoal"][] = [
      "more_customers",
      "more_bookings",
      "promote_offer",
      "launch_product",
      "brand_awareness",
      "stay_present",
    ];
    const urgencies: DiagnosticAnswers["urgency"][] = ["now", "one_to_three_months", "exploring"];

    for (const primaryAcquisitionChannel of channels) {
      for (const predictableReach of reaches) {
        for (const localAwareness of awarenesses) {
          for (const businessGoal of goals) {
            for (const urgency of urgencies) {
              const a = answers({
                primaryAcquisitionChannel,
                predictableReach,
                localAwareness,
                businessGoal,
                urgency,
              });
              const score = computeDiagnosticScore(a);
              const dimensions = buildDiagnosticDimensions(a, score);

              for (const dimension of dimensions) {
                expectNeverDiscouraging(dimension.level);
                expectNeverDiscouraging(dimension.description);
              }

              const mainConclusion = buildMainConclusion(score);
              if (mainConclusion) expectNeverDiscouraging(mainConclusion);
            }
          }
        }
      }
    }
  });
});
