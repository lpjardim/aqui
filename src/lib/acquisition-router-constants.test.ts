import { describe, expect, it } from "vitest";
import {
  ACQUISITION_ROUTER_CONFIG,
  parseAcquisitionRouterSession,
  parseForcedFunnelFamily,
  pickFunnelFamily,
  pickLandingVariant,
  serializeAcquisitionRouterSession,
  validateAcquisitionRouterConfig,
  weightedChoice,
  type AcquisitionRouterSessionState,
} from "@/lib/acquisition-router-constants";

describe("validateAcquisitionRouterConfig", () => {
  it("o config real (ACQUISITION_ROUTER_CONFIG) é válido", () => {
    expect(validateAcquisitionRouterConfig()).toEqual({ valid: true, errors: [] });
  });

  it("soma exata dos pesos reais das famílias e das variantes da landing é 1", () => {
    const familySum =
      ACQUISITION_ROUTER_CONFIG.families.LANDING.weight +
      ACQUISITION_ROUTER_CONFIG.families.DIAGNOSTIC.weight;
    expect(familySum).toBeCloseTo(1, 5);

    const variantSum = Object.values(ACQUISITION_ROUTER_CONFIG.families.LANDING.variants).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    expect(variantSum).toBeCloseTo(1, 5);
  });
});

describe("weightedChoice", () => {
  it("só devolve chaves presentes no objeto de pesos", () => {
    for (let i = 0; i < 200; i++) {
      const result = weightedChoice({ A: 0.5, B: 0.5 });
      expect(["A", "B"]).toContain(result);
    }
  });

  it("converge para a proporção pedida com volume suficiente", () => {
    const counts = { A: 0, B: 0, C: 0 };
    const total = 30_000;
    for (let i = 0; i < total; i++) {
      counts[weightedChoice({ A: 0.2, B: 0.3, C: 0.5 })] += 1;
    }

    expect(counts.A / total).toBeGreaterThan(0.15);
    expect(counts.A / total).toBeLessThan(0.25);
    expect(counts.B / total).toBeGreaterThan(0.25);
    expect(counts.B / total).toBeLessThan(0.35);
    expect(counts.C / total).toBeGreaterThan(0.45);
    expect(counts.C / total).toBeLessThan(0.55);
  });

  it("com uma única chave, devolve sempre essa chave", () => {
    for (let i = 0; i < 50; i++) {
      expect(weightedChoice({ ONLY: 1 })).toBe("ONLY");
    }
  });
});

describe("pickFunnelFamily", () => {
  it("só devolve LANDING ou DIAGNOSTIC", () => {
    for (let i = 0; i < 200; i++) {
      expect(["LANDING", "DIAGNOSTIC"]).toContain(pickFunnelFamily());
    }
  });

  it("converge para aproximadamente 50/50 com volume suficiente", () => {
    const counts = { LANDING: 0, DIAGNOSTIC: 0 };
    const total = 30_000;
    for (let i = 0; i < total; i++) {
      counts[pickFunnelFamily()] += 1;
    }

    expect(counts.LANDING / total).toBeGreaterThan(0.45);
    expect(counts.LANDING / total).toBeLessThan(0.55);
    expect(counts.DIAGNOSTIC / total).toBeGreaterThan(0.45);
    expect(counts.DIAGNOSTIC / total).toBeLessThan(0.55);
  });
});

describe("pickLandingVariant", () => {
  it("só devolve uma das 3 variantes conhecidas", () => {
    for (let i = 0; i < 200; i++) {
      expect(["NORMAL", "SALES", "BLOG"]).toContain(pickLandingVariant());
    }
  });

  it("converge para aproximadamente 33%/33%/34% com volume suficiente", () => {
    const counts = { NORMAL: 0, SALES: 0, BLOG: 0 };
    const total = 30_000;
    for (let i = 0; i < total; i++) {
      counts[pickLandingVariant()] += 1;
    }

    expect(counts.NORMAL / total).toBeGreaterThan(0.28);
    expect(counts.NORMAL / total).toBeLessThan(0.38);
    expect(counts.SALES / total).toBeGreaterThan(0.28);
    expect(counts.SALES / total).toBeLessThan(0.38);
    expect(counts.BLOG / total).toBeGreaterThan(0.28);
    expect(counts.BLOG / total).toBeLessThan(0.38);
  });
});

describe("parseForcedFunnelFamily", () => {
  it("mapeia os 2 valores de QA para a família correspondente", () => {
    expect(parseForcedFunnelFamily("landing")).toBe("LANDING");
    expect(parseForcedFunnelFamily("diagnostic")).toBe("DIAGNOSTIC");
  });

  it("é case-insensitive", () => {
    expect(parseForcedFunnelFamily("LANDING")).toBe("LANDING");
    expect(parseForcedFunnelFamily("Diagnostic")).toBe("DIAGNOSTIC");
  });

  it("devolve null para valores desconhecidos ou ausentes", () => {
    expect(parseForcedFunnelFamily("nao-existe")).toBeNull();
    expect(parseForcedFunnelFamily(null)).toBeNull();
    expect(parseForcedFunnelFamily("")).toBeNull();
  });
});

describe("serializeAcquisitionRouterSession / parseAcquisitionRouterSession", () => {
  it("faz round-trip preservando routerExperimentId/funnelFamily/isDebug", () => {
    const state: AcquisitionRouterSessionState = {
      routerExperimentId: "acquisition_router_v1",
      funnelFamily: "DIAGNOSTIC",
      isDebug: true,
    };
    const parsed = parseAcquisitionRouterSession(serializeAcquisitionRouterSession(state));
    expect(parsed).toEqual(state);
  });

  it("devolve null quando não há cookie", () => {
    expect(parseAcquisitionRouterSession(undefined)).toBeNull();
    expect(parseAcquisitionRouterSession(null)).toBeNull();
    expect(parseAcquisitionRouterSession("")).toBeNull();
  });

  it("nunca lança com uma cookie corrompida — devolve null", () => {
    expect(parseAcquisitionRouterSession("isto-nao-e-json-valido")).toBeNull();
    expect(
      parseAcquisitionRouterSession(encodeURIComponent(JSON.stringify({ funnelFamily: "X" }))),
    ).toBeNull();
    expect(parseAcquisitionRouterSession(encodeURIComponent(JSON.stringify([1, 2, 3])))).toBeNull();
    expect(
      parseAcquisitionRouterSession(
        encodeURIComponent(JSON.stringify({ funnelFamily: "LANDING", routerExperimentId: "" })),
      ),
    ).toBeNull();
  });

  it("isDebug fica false quando o campo está ausente/inválido na cookie", () => {
    const raw = encodeURIComponent(
      JSON.stringify({ funnelFamily: "LANDING", routerExperimentId: "acquisition_router_v1" }),
    );
    expect(parseAcquisitionRouterSession(raw)).toEqual({
      funnelFamily: "LANDING",
      routerExperimentId: "acquisition_router_v1",
      isDebug: false,
    });
  });
});
