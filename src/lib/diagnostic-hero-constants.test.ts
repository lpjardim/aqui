import { describe, expect, it } from "vitest";
import {
  DIAGNOSTIC_HERO_VARIANTS,
  parseDiagnosticHeroSession,
  parseForcedDiagnosticHeroVariant,
  randomDiagnosticHeroVariant,
  serializeDiagnosticHeroSession,
  type DiagnosticHeroSessionState,
} from "@/lib/diagnostic-hero-constants";

describe("parseForcedDiagnosticHeroVariant", () => {
  it("mapeia os 3 valores de QA para a variante correspondente", () => {
    expect(parseForcedDiagnosticHeroVariant("pain")).toBe("PAIN");
    expect(parseForcedDiagnosticHeroVariant("word_of_mouth")).toBe("WORD_OF_MOUTH");
    expect(parseForcedDiagnosticHeroVariant("growth")).toBe("GROWTH");
  });

  it("é case-insensitive", () => {
    expect(parseForcedDiagnosticHeroVariant("PAIN")).toBe("PAIN");
    expect(parseForcedDiagnosticHeroVariant("Growth")).toBe("GROWTH");
  });

  it("devolve null para valores desconhecidos ou ausentes", () => {
    expect(parseForcedDiagnosticHeroVariant("nao-existe")).toBeNull();
    expect(parseForcedDiagnosticHeroVariant(null)).toBeNull();
    expect(parseForcedDiagnosticHeroVariant("")).toBeNull();
  });
});

describe("randomDiagnosticHeroVariant", () => {
  it("só devolve uma das 3 variantes conhecidas", () => {
    for (let i = 0; i < 200; i++) {
      expect(DIAGNOSTIC_HERO_VARIANTS).toContain(randomDiagnosticHeroVariant());
    }
  });

  it("converge para aproximadamente 33%/33%/34% com volume suficiente", () => {
    const counts = { PAIN: 0, WORD_OF_MOUTH: 0, GROWTH: 0 };
    const total = 30_000;
    for (let i = 0; i < total; i++) {
      counts[randomDiagnosticHeroVariant()] += 1;
    }

    expect(counts.PAIN / total).toBeGreaterThan(0.28);
    expect(counts.PAIN / total).toBeLessThan(0.38);
    expect(counts.WORD_OF_MOUTH / total).toBeGreaterThan(0.28);
    expect(counts.WORD_OF_MOUTH / total).toBeLessThan(0.38);
    expect(counts.GROWTH / total).toBeGreaterThan(0.28);
    expect(counts.GROWTH / total).toBeLessThan(0.38);
  });
});

describe("serializeDiagnosticHeroSession / parseDiagnosticHeroSession", () => {
  it("faz round-trip preservando variante e isDebug", () => {
    const state: DiagnosticHeroSessionState = { variant: "GROWTH", isDebug: true };
    const parsed = parseDiagnosticHeroSession(serializeDiagnosticHeroSession(state));
    expect(parsed).toEqual(state);
  });

  it("devolve null quando não há cookie", () => {
    expect(parseDiagnosticHeroSession(undefined)).toBeNull();
    expect(parseDiagnosticHeroSession(null)).toBeNull();
    expect(parseDiagnosticHeroSession("")).toBeNull();
  });

  it("nunca lança com uma cookie corrompida — devolve null", () => {
    expect(parseDiagnosticHeroSession("isto-nao-e-json-valido")).toBeNull();
    expect(parseDiagnosticHeroSession(encodeURIComponent(JSON.stringify({ variant: "X" })))).toBeNull();
    expect(parseDiagnosticHeroSession(encodeURIComponent(JSON.stringify([1, 2, 3])))).toBeNull();
  });

  it("isDebug fica false quando o campo está ausente/inválido na cookie", () => {
    const raw = encodeURIComponent(JSON.stringify({ variant: "PAIN" }));
    expect(parseDiagnosticHeroSession(raw)).toEqual({ variant: "PAIN", isDebug: false });
  });
});
