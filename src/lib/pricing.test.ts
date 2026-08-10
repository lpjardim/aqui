import { describe, expect, it } from "vitest";
import { MAX_VIEWS, MIN_VIEWS, calculatePrice, clampViews } from "@/lib/pricing";

describe("calculatePrice — pontos âncora", () => {
  it("2.000 visualizações", () => {
    expect(calculatePrice(2_000, "ONE_TIME")).toBe(4_900);
    expect(calculatePrice(2_000, "MONTHLY")).toBe(3_900);
  });

  it("20.000 visualizações", () => {
    expect(calculatePrice(20_000, "ONE_TIME")).toBe(39_000);
    expect(calculatePrice(20_000, "MONTHLY")).toBe(29_000);
  });

  it("200.000 visualizações", () => {
    expect(calculatePrice(200_000, "ONE_TIME")).toBe(299_000);
    expect(calculatePrice(200_000, "MONTHLY")).toBe(249_000);
  });
});

describe("calculatePrice — volumes personalizados", () => {
  const cases: Array<[number, "ONE_TIME" | "MONTHLY", number]> = [
    [5_000, "ONE_TIME", 10_600],
    [5_000, "MONTHLY", 8_100],
    [10_000, "ONE_TIME", 20_100],
    [10_000, "MONTHLY", 15_100],
    [50_000, "ONE_TIME", 82_300],
    [50_000, "MONTHLY", 65_700],
    [100_000, "ONE_TIME", 154_600],
    [100_000, "MONTHLY", 126_800],
  ];

  it.each(cases)("%i visualizações (%s) = %i cêntimos", (views, frequency, expected) => {
    expect(calculatePrice(views, frequency)).toBe(expected);
  });
});

describe("calculatePrice — propriedades gerais", () => {
  const sampleViews = [2_000, 3_000, 5_000, 8_000, 10_000, 15_000, 19_000, 20_000, 21_000, 50_000, 100_000, 150_000, 200_000];

  it("aumenta sempre (não estritamente decresce) com o volume, para cada frequência", () => {
    for (const frequency of ["ONE_TIME", "MONTHLY"] as const) {
      let previous = -Infinity;
      for (const views of sampleViews) {
        const price = calculatePrice(views, frequency);
        expect(price).toBeGreaterThanOrEqual(previous);
        previous = price;
      }
    }
  });

  it("o preço mensal é sempre inferior ao preço avulso, para o mesmo volume", () => {
    for (const views of sampleViews) {
      expect(calculatePrice(views, "MONTHLY")).toBeLessThan(calculatePrice(views, "ONE_TIME"));
    }
  });

  it("não há salto anómalo em torno dos 20.000 (continuidade entre troços)", () => {
    for (const frequency of ["ONE_TIME", "MONTHLY"] as const) {
      const below = calculatePrice(19_000, frequency);
      const at = calculatePrice(20_000, frequency);
      const above = calculatePrice(21_000, frequency);
      expect(at).toBeGreaterThan(below);
      expect(above).toBeGreaterThan(at);
      // O salto entre 19k→20k e 20k→21k deve ter magnitude semelhante
      // (mesma inclinação aproximada), não uma descontinuidade brusca.
      const stepBefore = at - below;
      const stepAfter = above - at;
      expect(Math.abs(stepAfter - stepBefore)).toBeLessThan(Math.max(stepBefore, stepAfter));
    }
  });
});

describe("clampViews / calculatePrice — limites", () => {
  it("nunca aceita menos que 2.000", () => {
    expect(clampViews(0)).toBe(MIN_VIEWS);
    expect(clampViews(-500)).toBe(MIN_VIEWS);
    expect(clampViews(1_000)).toBe(MIN_VIEWS);
    expect(calculatePrice(500, "ONE_TIME")).toBe(calculatePrice(MIN_VIEWS, "ONE_TIME"));
  });

  it("nunca aceita mais que 200.000", () => {
    expect(clampViews(500_000)).toBe(MAX_VIEWS);
    expect(clampViews(1_000_000)).toBe(MAX_VIEWS);
    expect(calculatePrice(1_000_000, "MONTHLY")).toBe(calculatePrice(MAX_VIEWS, "MONTHLY"));
  });

  it("arredonda para o incremento de 1.000 mais próximo", () => {
    expect(clampViews(5_400)).toBe(5_000);
    expect(clampViews(5_600)).toBe(6_000);
  });
});
