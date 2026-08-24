import { describe, expect, it } from "vitest";
import {
  computeLandingAttributionReport,
  computeLandingJourneyReport,
  hasEnoughSample,
  MIN_SAMPLE_SIZE,
  type ExposureInput,
  type PurchaseOrderInput,
} from "@/lib/landing-attribution";
import { LandingVariant } from "@/generated/prisma/enums";

const DAY = 24 * 60 * 60 * 1000;
const BASE = new Date("2026-01-01T00:00:00Z").getTime();

function day(offset: number): Date {
  return new Date(BASE + offset * DAY);
}

function exposure(overrides: Partial<ExposureInput> & { visitorId: string; variant: LandingVariant }): ExposureInput {
  return { createdAt: day(0), ...overrides };
}

function order(overrides: Partial<PurchaseOrderInput> & { visitorId: string }): PurchaseOrderInput {
  return {
    id: `order_${Math.random()}`,
    landingVariant: null,
    price: 4900,
    createdAt: day(0),
    ...overrides,
  };
}

function countFor(counts: { variant: LandingVariant; purchases: number; revenueCents: number }[], variant: LandingVariant) {
  return counts.find((count) => count.variant === variant);
}

describe("computeLandingAttributionReport", () => {
  it("exemplo do pedido: blog (dia 1) → normal (dia 4) → sales (dia 7) → compra", () => {
    const visitorId = "v1";
    const exposures: ExposureInput[] = [
      exposure({ visitorId, variant: LandingVariant.BLOG, createdAt: day(1) }),
      exposure({ visitorId, variant: LandingVariant.NORMAL, createdAt: day(4) }),
      exposure({ visitorId, variant: LandingVariant.SALES, createdAt: day(7) }),
    ];
    const orders: PurchaseOrderInput[] = [
      order({ visitorId, landingVariant: LandingVariant.SALES, createdAt: day(7), price: 4900 }),
    ];

    const report = computeLandingAttributionReport(orders, exposures);

    expect(countFor(report.direct, LandingVariant.SALES)?.purchases).toBe(1);
    expect(countFor(report.firstTouch, LandingVariant.BLOG)?.purchases).toBe(1);
    expect(countFor(report.lastTouch, LandingVariant.SALES)?.purchases).toBe(1);

    // Assistida: as 3 variantes contam, mesmo sendo a mesma compra.
    expect(countFor(report.assisted, LandingVariant.BLOG)?.purchases).toBe(1);
    expect(countFor(report.assisted, LandingVariant.NORMAL)?.purchases).toBe(1);
    expect(countFor(report.assisted, LandingVariant.SALES)?.purchases).toBe(1);

    expect(report.totalPaidOrders).toBe(1);
  });

  it("ignora exposições que aconteceram DEPOIS da compra", () => {
    const visitorId = "v2";
    const exposures: ExposureInput[] = [
      exposure({ visitorId, variant: LandingVariant.BLOG, createdAt: day(1) }),
      exposure({ visitorId, variant: LandingVariant.SALES, createdAt: day(10) }), // depois da compra
    ];
    const orders: PurchaseOrderInput[] = [
      order({ visitorId, landingVariant: LandingVariant.BLOG, createdAt: day(2) }),
    ];

    const report = computeLandingAttributionReport(orders, exposures);

    expect(countFor(report.lastTouch, LandingVariant.BLOG)?.purchases).toBe(1);
    expect(countFor(report.lastTouch, LandingVariant.SALES)?.purchases).toBe(0);
  });

  it("compra sem nenhum evento de exposição gravado usa landingVariant da própria Order como fallback", () => {
    const visitorId = "v3";
    const orders: PurchaseOrderInput[] = [
      order({ visitorId, landingVariant: LandingVariant.NORMAL, createdAt: day(0) }),
    ];

    const report = computeLandingAttributionReport(orders, []);

    expect(countFor(report.direct, LandingVariant.NORMAL)?.purchases).toBe(1);
    expect(countFor(report.firstTouch, LandingVariant.NORMAL)?.purchases).toBe(1);
    expect(countFor(report.lastTouch, LandingVariant.NORMAL)?.purchases).toBe(1);
    expect(countFor(report.assisted, LandingVariant.NORMAL)?.purchases).toBe(1);
  });

  it("compra fora de uma sessão ativa (landingVariant null) só conta em first/last/any-touch via histórico de exposição", () => {
    const visitorId = "v4";
    const exposures: ExposureInput[] = [exposure({ visitorId, variant: LandingVariant.BLOG, createdAt: day(1) })];
    // Visitante voltou organicamente dias depois e comprou sem passar de novo por /go.
    const orders: PurchaseOrderInput[] = [
      order({ visitorId, landingVariant: null, createdAt: day(10), price: 9900 }),
    ];

    const report = computeLandingAttributionReport(orders, exposures);

    expect(report.direct.every((count) => count.purchases === 0)).toBe(true);
    expect(countFor(report.firstTouch, LandingVariant.BLOG)?.purchases).toBe(1);
    expect(countFor(report.firstTouch, LandingVariant.BLOG)?.revenueCents).toBe(9900);
    expect(countFor(report.lastTouch, LandingVariant.BLOG)?.purchases).toBe(1);
  });

  it("soma a receita corretamente por variante em first-touch quando há várias compras", () => {
    const exposures: ExposureInput[] = [
      exposure({ visitorId: "a", variant: LandingVariant.NORMAL, createdAt: day(0) }),
      exposure({ visitorId: "b", variant: LandingVariant.NORMAL, createdAt: day(0) }),
    ];
    const orders: PurchaseOrderInput[] = [
      order({ visitorId: "a", landingVariant: LandingVariant.NORMAL, createdAt: day(1), price: 3900 }),
      order({ visitorId: "b", landingVariant: LandingVariant.NORMAL, createdAt: day(1), price: 4900 }),
    ];

    const report = computeLandingAttributionReport(orders, exposures);

    expect(countFor(report.firstTouch, LandingVariant.NORMAL)?.purchases).toBe(2);
    expect(countFor(report.firstTouch, LandingVariant.NORMAL)?.revenueCents).toBe(8800);
  });
});

describe("hasEnoughSample / MIN_SAMPLE_SIZE", () => {
  it("exige pelo menos MIN_SAMPLE_SIZE compras antes de considerar os dados suficientes", () => {
    expect(hasEnoughSample(MIN_SAMPLE_SIZE - 1)).toBe(false);
    expect(hasEnoughSample(MIN_SAMPLE_SIZE)).toBe(true);
  });
});

describe("computeLandingJourneyReport", () => {
  it("colapsa repetições consecutivas da mesma variante (blog, blog, normal → blog → normal)", () => {
    const visitorId = "v1";
    const exposures: ExposureInput[] = [
      exposure({ visitorId, variant: LandingVariant.BLOG, createdAt: day(0) }),
      exposure({ visitorId, variant: LandingVariant.BLOG, createdAt: day(1) }),
      exposure({ visitorId, variant: LandingVariant.NORMAL, createdAt: day(2) }),
    ];
    const orders: PurchaseOrderInput[] = [
      order({ visitorId, landingVariant: LandingVariant.NORMAL, createdAt: day(3), price: 4900 }),
    ];

    const journeys = computeLandingJourneyReport(orders, exposures);

    expect(journeys).toHaveLength(1);
    expect(journeys[0].label).toBe("Blog → Normal");
    expect(journeys[0].purchases).toBe(1);
    expect(journeys[0].revenueCents).toBe(4900);
  });

  it("agrupa várias compras com o mesmo caminho e ordena por nº de compras", () => {
    const exposures: ExposureInput[] = [
      exposure({ visitorId: "a", variant: LandingVariant.BLOG, createdAt: day(0) }),
      exposure({ visitorId: "a", variant: LandingVariant.SALES, createdAt: day(1) }),
      exposure({ visitorId: "b", variant: LandingVariant.BLOG, createdAt: day(0) }),
      exposure({ visitorId: "b", variant: LandingVariant.SALES, createdAt: day(1) }),
      exposure({ visitorId: "c", variant: LandingVariant.NORMAL, createdAt: day(0) }),
    ];
    const orders: PurchaseOrderInput[] = [
      order({ visitorId: "a", landingVariant: LandingVariant.SALES, createdAt: day(2), price: 4900 }),
      order({ visitorId: "b", landingVariant: LandingVariant.SALES, createdAt: day(2), price: 4900 }),
      order({ visitorId: "c", landingVariant: LandingVariant.NORMAL, createdAt: day(2), price: 3900 }),
    ];

    const journeys = computeLandingJourneyReport(orders, exposures);

    expect(journeys[0].label).toBe("Blog → Sales");
    expect(journeys[0].purchases).toBe(2);
    expect(journeys[0].revenueCents).toBe(9800);
    expect(journeys[1].label).toBe("Normal");
    expect(journeys[1].purchases).toBe(1);
  });
});
