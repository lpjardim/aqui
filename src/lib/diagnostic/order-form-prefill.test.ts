import { describe, expect, it } from "vitest";
import {
  computeInitialOrderFormStep,
  isPrefilledFromDiagnostic,
  type OrderFormPrefillInput,
} from "@/lib/diagnostic/order-form-prefill";

function completeInput(overrides: Partial<OrderFormPrefillInput> = {}): OrderFormPrefillInput {
  return {
    diagnosticId: "diag-1",
    initialZone: "Lisboa",
    initialViews: 20_000,
    initialFrequency: "MONTHLY",
    initialAssetsCount: 1,
    ...overrides,
  };
}

describe("isPrefilledFromDiagnostic / computeInitialOrderFormStep", () => {
  it("é pré-preenchido e salta para o passo 5 quando zona + volume + frequência + 1 ficheiro estão presentes", () => {
    const input = completeInput();
    expect(isPrefilledFromDiagnostic(input)).toBe(true);
    expect(computeInitialOrderFormStep(input)).toBe(5);
  });

  it("checkout normal (sem diagnosticId) continua sempre a começar no passo 1", () => {
    const input = completeInput({ diagnosticId: null });
    expect(isPrefilledFromDiagnostic(input)).toBe(false);
    expect(computeInitialOrderFormStep(input)).toBe(1);
  });

  it("sem zona não é considerado pré-preenchido", () => {
    const input = completeInput({ initialZone: null });
    expect(computeInitialOrderFormStep(input)).toBe(1);
  });

  it("sem visualizações/pack escolhido não é considerado pré-preenchido", () => {
    const input = completeInput({ initialViews: null });
    expect(computeInitialOrderFormStep(input)).toBe(1);
  });

  it("sem frequência de faturação não é considerado pré-preenchido", () => {
    const input = completeInput({ initialFrequency: null });
    expect(computeInitialOrderFormStep(input)).toBe(1);
  });

  it("sem nenhum ficheiro (0 assets) não é considerado pré-preenchido", () => {
    const input = completeInput({ initialAssetsCount: 0 });
    expect(computeInitialOrderFormStep(input)).toBe(1);
  });

  it("dados parcialmente incompletos (só zona + frequência) continuam no passo 1", () => {
    const input = completeInput({ initialViews: null, initialAssetsCount: 0 });
    expect(isPrefilledFromDiagnostic(input)).toBe(false);
    expect(computeInitialOrderFormStep(input)).toBe(1);
  });
});
