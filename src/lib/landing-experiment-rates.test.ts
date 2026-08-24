import { describe, expect, it } from "vitest";
import { computeLandingVariantRates, type LandingVariantRawCounts } from "@/lib/landing-experiment-rates";

function counts(overrides: Partial<LandingVariantRawCounts> = {}): LandingVariantRawCounts {
  return {
    visitors: 0,
    sessions: 0,
    ctaClicks: 0,
    checkoutsStarted: 0,
    paymentClicks: 0,
    stripeSessionsCreated: 0,
    ordersCreated: 0,
    paymentsCompleted: 0,
    revenueCents: 0,
    ...overrides,
  };
}

describe("computeLandingVariantRates", () => {
  it("devolve null em todas as taxas quando não há visitantes/sessões", () => {
    const rates = computeLandingVariantRates(counts());

    expect(rates.ctaClickRate).toBeNull();
    expect(rates.checkoutConversionRate).toBeNull();
    expect(rates.purchaseConversionRate).toBeNull();
    expect(rates.revenuePerVisitorCents).toBeNull();
    expect(rates.revenuePerSessionCents).toBeNull();
  });

  it("calcula a taxa de clique no CTA e de conversão para /pedido", () => {
    const rates = computeLandingVariantRates(
      counts({ visitors: 200, ctaClicks: 40, checkoutsStarted: 30 }),
    );

    expect(rates.ctaClickRate).toBeCloseTo(0.2);
    expect(rates.checkoutConversionRate).toBeCloseTo(0.15);
  });

  it("calcula as taxas do funil de pagamento (checkout → clique → sessão → pagamento)", () => {
    const rates = computeLandingVariantRates(
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
    const rates = computeLandingVariantRates(counts({ visitors: 200, paymentsCompleted: 10 }));
    expect(rates.purchaseConversionRate).toBeCloseTo(0.05);
  });

  it("calcula receita por visitante e por sessão — a outra métrica principal", () => {
    const rates = computeLandingVariantRates(
      counts({ visitors: 100, sessions: 120, revenueCents: 500000 }),
    );

    expect(rates.revenuePerVisitorCents).toBeCloseTo(5000);
    expect(rates.revenuePerSessionCents).toBeCloseTo(500000 / 120);
  });

  it("nunca divide por zero mesmo com contagens inconsistentes", () => {
    const rates = computeLandingVariantRates(
      counts({ visitors: 0, sessions: 0, paymentsCompleted: 5, revenueCents: 1000 }),
    );
    expect(rates.purchaseConversionRate).toBeNull();
    expect(rates.revenuePerVisitorCents).toBeNull();
    expect(rates.revenuePerSessionCents).toBeNull();
  });

  it("preserva as contagens em bruto no resultado", () => {
    const rates = computeLandingVariantRates(counts({ visitors: 10, sessions: 12, ctaClicks: 4 }));
    expect(rates.visitors).toBe(10);
    expect(rates.sessions).toBe(12);
    expect(rates.ctaClicks).toBe(4);
  });
});
