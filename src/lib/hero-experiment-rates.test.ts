import { describe, expect, it } from "vitest";
import { computeHeroVariantRates, type HeroVariantRawCounts } from "@/lib/hero-experiment-rates";

function counts(overrides: Partial<HeroVariantRawCounts> = {}): HeroVariantRawCounts {
  return {
    visitors: 0,
    ctaClicks: 0,
    checkoutsStarted: 0,
    paymentClicks: 0,
    stripeSessionsCreated: 0,
    ordersCreated: 0,
    paymentsCompleted: 0,
    ...overrides,
  };
}

describe("computeHeroVariantRates", () => {
  it("devolve null em todas as taxas quando não há visitantes", () => {
    const rates = computeHeroVariantRates(counts());

    expect(rates.ctaClickRate).toBeNull();
    expect(rates.checkoutConversionRate).toBeNull();
    expect(rates.purchaseConversionRate).toBeNull();
  });

  it("calcula a taxa de clique no CTA e de conversão para /pedido", () => {
    const rates = computeHeroVariantRates(
      counts({ visitors: 200, ctaClicks: 40, checkoutsStarted: 30 }),
    );

    expect(rates.ctaClickRate).toBeCloseTo(0.2);
    expect(rates.checkoutConversionRate).toBeCloseTo(0.15);
  });

  it("calcula as taxas do funil de pagamento (checkout → clique → sessão → pagamento)", () => {
    const rates = computeHeroVariantRates(
      counts({
        checkoutsStarted: 100,
        paymentClicks: 60,
        stripeSessionsCreated: 50,
        paymentsCompleted: 20,
      }),
    );

    expect(rates.checkoutToPaymentClickRate).toBeCloseTo(0.6);
    expect(rates.paymentClickToSessionRate).toBeCloseTo(50 / 60);
    expect(rates.sessionToPaymentRate).toBeCloseTo(0.4);
  });

  it("calcula a taxa visitante → pagamento — a métrica principal do teste", () => {
    const rates = computeHeroVariantRates(counts({ visitors: 200, paymentsCompleted: 10 }));
    expect(rates.purchaseConversionRate).toBeCloseTo(0.05);
  });

  it("nunca divide por zero mesmo com contagens inconsistentes", () => {
    const rates = computeHeroVariantRates(counts({ visitors: 0, paymentsCompleted: 5 }));
    expect(rates.purchaseConversionRate).toBeNull();
  });

  it("preserva as contagens em bruto no resultado", () => {
    const rates = computeHeroVariantRates(counts({ visitors: 10, ctaClicks: 4 }));
    expect(rates.visitors).toBe(10);
    expect(rates.ctaClicks).toBe(4);
  });
});
