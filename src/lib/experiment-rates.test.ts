import { describe, expect, it } from "vitest";
import { computeVariantRates, type VariantRawCounts } from "@/lib/experiment-rates";

function counts(overrides: Partial<VariantRawCounts> = {}): VariantRawCounts {
  return {
    visitors: 0,
    ctaClicks: 0,
    checkoutsStarted: 0,
    ordersCreated: 0,
    paymentsCompleted: 0,
    oneTimePurchases: 0,
    monthlyPurchases: 0,
    revenueCents: 0,
    ...overrides,
  };
}

describe("computeVariantRates", () => {
  it("devolve null em todas as taxas quando não há visitantes", () => {
    const rates = computeVariantRates(counts());

    expect(rates.checkoutConversionRate).toBeNull();
    expect(rates.purchaseConversionRate).toBeNull();
    expect(rates.revenuePerVisitorCents).toBeNull();
  });

  it("calcula a taxa de conversão de checkout e de compra", () => {
    const rates = computeVariantRates(
      counts({ visitors: 200, checkoutsStarted: 50, paymentsCompleted: 20 }),
    );

    expect(rates.checkoutConversionRate).toBeCloseTo(0.25);
    expect(rates.purchaseConversionRate).toBeCloseTo(0.1);
  });

  it("calcula a receita por visitante — a métrica principal", () => {
    const rates = computeVariantRates(counts({ visitors: 100, revenueCents: 500_00 }));

    expect(rates.revenuePerVisitorCents).toBeCloseTo(500);
  });

  it("devolve null na adoção mensal sem nenhuma compra", () => {
    const rates = computeVariantRates(counts());
    expect(rates.monthlyAdoptionRate).toBeNull();
  });

  it("calcula a % de compradores que escolhem mensal", () => {
    const rates = computeVariantRates(
      counts({ oneTimePurchases: 3, monthlyPurchases: 1 }),
    );

    expect(rates.monthlyAdoptionRate).toBeCloseTo(0.25);
  });

  it("nunca divide por zero mesmo com contagens inconsistentes", () => {
    const rates = computeVariantRates(counts({ visitors: 0, paymentsCompleted: 5 }));
    expect(rates.purchaseConversionRate).toBeNull();
  });

  it("preserva as contagens em bruto no resultado", () => {
    const rates = computeVariantRates(counts({ visitors: 10, ctaClicks: 4 }));
    expect(rates.visitors).toBe(10);
    expect(rates.ctaClicks).toBe(4);
  });
});
