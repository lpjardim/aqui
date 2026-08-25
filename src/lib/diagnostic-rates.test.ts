import { describe, expect, it } from "vitest";
import {
  aggregateDiagnosticSegment,
  computeDiagnosticFunnelRates,
  type DiagnosticFunnelRawCounts,
} from "@/lib/diagnostic-rates";

function counts(overrides: Partial<DiagnosticFunnelRawCounts> = {}): DiagnosticFunnelRawCounts {
  return {
    visitors: 0,
    starts: 0,
    completed: 0,
    resultViewed: 0,
    previewStarted: 0,
    previewCompleted: 0,
    recommendationViewed: 0,
    recommendedPlanClicked: 0,
    checkoutStarted: 0,
    paymentClicks: 0,
    stripeSessionsCreated: 0,
    ordersCreated: 0,
    paymentsCompleted: 0,
    revenueCents: 0,
    ...overrides,
  };
}

describe("computeDiagnosticFunnelRates", () => {
  it("devolve null em todas as taxas quando não há nenhum início", () => {
    const rates = computeDiagnosticFunnelRates(counts());

    expect(rates.startToCompletedRate).toBeNull();
    expect(rates.purchaseConversionRate).toBeNull();
    expect(rates.revenuePerStartCents).toBeNull();
  });

  it("calcula a taxa início → concluído", () => {
    const rates = computeDiagnosticFunnelRates(counts({ starts: 200, completed: 120 }));
    expect(rates.startToCompletedRate).toBeCloseTo(0.6);
  });

  it("calcula as taxas do funil pós-diagnóstico (resultado → preview → recomendação → checkout)", () => {
    const rates = computeDiagnosticFunnelRates(
      counts({
        resultViewed: 100,
        previewStarted: 80,
        previewCompleted: 70,
        recommendationViewed: 65,
        recommendedPlanClicked: 40,
        checkoutStarted: 35,
      }),
    );

    expect(rates.resultToPreviewRate).toBeCloseTo(0.8);
    expect(rates.previewToRecommendationRate).toBeCloseTo(65 / 70);
    expect(rates.recommendationToPlanClickRate).toBeCloseTo(40 / 65);
    expect(rates.planClickToCheckoutRate).toBeCloseTo(35 / 40);
  });

  it("calcula a taxa de pagamento (checkout → clique → sessão → pagamento)", () => {
    const rates = computeDiagnosticFunnelRates(
      counts({
        checkoutStarted: 100,
        paymentClicks: 60,
        stripeSessionsCreated: 50,
        paymentsCompleted: 20,
      }),
    );

    expect(rates.checkoutToPaymentClickRate).toBeCloseTo(0.6);
    expect(rates.paymentClickToSessionRate).toBeCloseTo(50 / 60);
    expect(rates.sessionToPaymentRate).toBeCloseTo(0.4);
  });

  it("calcula a conversão principal (início → pagamento) e a receita por início/concluído", () => {
    const rates = computeDiagnosticFunnelRates(
      counts({ starts: 200, completed: 150, paymentsCompleted: 10, revenueCents: 500_000 }),
    );

    expect(rates.purchaseConversionRate).toBeCloseTo(0.05);
    expect(rates.revenuePerStartCents).toBeCloseTo(2500);
    expect(rates.revenuePerCompletedCents).toBeCloseTo(500_000 / 150);
  });

  it("nunca divide por zero mesmo com contagens inconsistentes", () => {
    const rates = computeDiagnosticFunnelRates(
      counts({ starts: 0, completed: 0, paymentsCompleted: 5, revenueCents: 1000 }),
    );
    expect(rates.purchaseConversionRate).toBeNull();
    expect(rates.revenuePerStartCents).toBeNull();
    expect(rates.revenuePerCompletedCents).toBeNull();
  });

  it("preserva as contagens em bruto no resultado", () => {
    const rates = computeDiagnosticFunnelRates(counts({ starts: 10, completed: 8 }));
    expect(rates.starts).toBe(10);
    expect(rates.completed).toBe(8);
  });
});

type FakeOrder = { price: number; channel?: string | null };

describe("aggregateDiagnosticSegment", () => {
  it("agrupa compras por valor e soma a receita de cada grupo", () => {
    const orders: FakeOrder[] = [
      { price: 39_000, channel: "word_of_mouth" },
      { price: 29_000, channel: "word_of_mouth" },
      { price: 249_000, channel: "advertising" },
    ];

    const result = aggregateDiagnosticSegment(
      orders,
      (order) => order.channel ?? null,
      (value) => value,
    );

    const wordOfMouth = result.find((entry) => entry.value === "word_of_mouth");
    const advertising = result.find((entry) => entry.value === "advertising");

    expect(wordOfMouth).toMatchObject({ purchases: 2, revenueCents: 68_000 });
    expect(advertising).toMatchObject({ purchases: 1, revenueCents: 249_000 });
  });

  it("ignora encomendas sem valor para esta dimensão", () => {
    const orders: FakeOrder[] = [
      { price: 39_000, channel: null },
      { price: 29_000, channel: "google" },
    ];

    const result = aggregateDiagnosticSegment(
      orders,
      (order) => order.channel ?? null,
      (value) => value,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ value: "google", purchases: 1 });
  });

  it("ordena por número de compras, do maior para o menor", () => {
    const orders: FakeOrder[] = [
      { price: 1, channel: "a" },
      { price: 1, channel: "b" },
      { price: 1, channel: "b" },
      { price: 1, channel: "b" },
    ];

    const result = aggregateDiagnosticSegment(
      orders,
      (order) => order.channel ?? null,
      (value) => value,
    );

    expect(result[0].value).toBe("b");
    expect(result[0].purchases).toBe(3);
  });

  it("usa a função de label para o texto exibido, mantendo o valor original", () => {
    const orders: FakeOrder[] = [{ price: 1, channel: "now" }];

    const result = aggregateDiagnosticSegment(
      orders,
      (order) => order.channel ?? null,
      (value) => `Label(${value})`,
    );

    expect(result[0]).toMatchObject({ value: "now", label: "Label(now)" });
  });

  it("devolve uma lista vazia quando não há nenhuma compra", () => {
    const result = aggregateDiagnosticSegment<FakeOrder>(
      [],
      (order) => order.channel ?? null,
      (value) => value,
    );
    expect(result).toEqual([]);
  });
});
