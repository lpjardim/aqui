import { describe, expect, it } from "vitest";
import {
  computeDiagnosticHeroVariantRates,
  type DiagnosticHeroVariantRawCounts,
} from "@/lib/diagnostic-hero-rates";

function counts(overrides: Partial<DiagnosticHeroVariantRawCounts> = {}): DiagnosticHeroVariantRawCounts {
  return {
    visitors: 0,
    ctaClicks: 0,
    starts: 0,
    completed: 0,
    previewStarted: 0,
    previewCompleted: 0,
    checkoutStarted: 0,
    ordersCreated: 0,
    paymentsCompleted: 0,
    revenueCents: 0,
    ...overrides,
  };
}

describe("computeDiagnosticHeroVariantRates", () => {
  it("devolve null em todas as taxas quando não há visitantes", () => {
    const rates = computeDiagnosticHeroVariantRates(counts());

    expect(rates.ctaClickRate).toBeNull();
    expect(rates.startRate).toBeNull();
    expect(rates.purchaseRate).toBeNull();
    expect(rates.revenuePerVisitorCents).toBeNull();
  });

  it("calcula a Diagnostic Start Rate — a métrica principal do teste", () => {
    const rates = computeDiagnosticHeroVariantRates(counts({ visitors: 200, starts: 60 }));
    expect(rates.startRate).toBeCloseTo(0.3);
  });

  it("calcula a taxa de clique no CTA (visitante → clique)", () => {
    const rates = computeDiagnosticHeroVariantRates(counts({ visitors: 200, ctaClicks: 50 }));
    expect(rates.ctaClickRate).toBeCloseTo(0.25);
  });

  it("calcula as taxas de qualidade do funil (concluído/preview/checkout)", () => {
    const rates = computeDiagnosticHeroVariantRates(
      counts({ starts: 100, completed: 40, previewStarted: 30, checkoutStarted: 20 }),
    );

    expect(rates.completionRate).toBeCloseTo(0.4);
    expect(rates.previewRate).toBeCloseTo(0.75);
    expect(rates.checkoutRate).toBeCloseTo(0.5);
  });

  it("calcula a Purchase CR e a receita por visitante — nunca declarar vencedor só pelo clique", () => {
    const rates = computeDiagnosticHeroVariantRates(
      counts({ visitors: 500, paymentsCompleted: 25, revenueCents: 500_000 }),
    );

    expect(rates.purchaseRate).toBeCloseTo(0.05);
    expect(rates.revenuePerVisitorCents).toBeCloseTo(1000);
  });

  it("nunca divide por zero mesmo com contagens inconsistentes", () => {
    const rates = computeDiagnosticHeroVariantRates(counts({ visitors: 0, paymentsCompleted: 5 }));
    expect(rates.purchaseRate).toBeNull();
    expect(rates.revenuePerVisitorCents).toBeNull();
  });

  it("preserva as contagens em bruto no resultado", () => {
    const rates = computeDiagnosticHeroVariantRates(counts({ visitors: 10, starts: 4 }));
    expect(rates.visitors).toBe(10);
    expect(rates.starts).toBe(4);
  });
});
