import { describe, expect, it } from "vitest";
import { computeFunnelFamilyRates, type FunnelFamilyRawCounts } from "@/lib/acquisition-router-rates";

describe("computeFunnelFamilyRates", () => {
  it("calcula as 3 taxas corretamente com valores normais", () => {
    const counts: FunnelFamilyRawCounts = {
      visitors: 1000,
      checkoutsStarted: 200,
      ordersCreated: 150,
      paymentsCompleted: 100,
      revenueCents: 500_000,
    };

    const rates = computeFunnelFamilyRates(counts);

    expect(rates.checkoutConversionRate).toBeCloseTo(0.2, 5);
    expect(rates.purchaseConversionRate).toBeCloseTo(0.1, 5);
    expect(rates.revenuePerVisitorCents).toBeCloseTo(500, 5);
    // Contagens em bruto continuam presentes no resultado.
    expect(rates.visitors).toBe(1000);
    expect(rates.ordersCreated).toBe(150);
    expect(rates.paymentsCompleted).toBe(100);
    expect(rates.revenueCents).toBe(500_000);
  });

  it("devolve null em todas as taxas quando não há visitantes (divisão por zero)", () => {
    const counts: FunnelFamilyRawCounts = {
      visitors: 0,
      checkoutsStarted: 0,
      ordersCreated: 0,
      paymentsCompleted: 0,
      revenueCents: 0,
    };

    const rates = computeFunnelFamilyRates(counts);

    expect(rates.checkoutConversionRate).toBeNull();
    expect(rates.purchaseConversionRate).toBeNull();
    expect(rates.revenuePerVisitorCents).toBeNull();
  });

  it("nunca divide por um denominador negativo/zero mesmo com numeradores positivos", () => {
    const counts: FunnelFamilyRawCounts = {
      visitors: 0,
      checkoutsStarted: 5,
      ordersCreated: 3,
      paymentsCompleted: 2,
      revenueCents: 10_000,
    };

    const rates = computeFunnelFamilyRates(counts);

    expect(rates.checkoutConversionRate).toBeNull();
    expect(rates.purchaseConversionRate).toBeNull();
    expect(rates.revenuePerVisitorCents).toBeNull();
  });
});
