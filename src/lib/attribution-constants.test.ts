import { describe, expect, it } from "vitest";
import {
  extractAttributionFromSearchParams,
  isPaidTouch,
  parseAttribution,
  serializeAttribution,
  type AdAttribution,
} from "@/lib/attribution-constants";

const FULL_QUERY =
  "utm_source=ig&utm_medium=paid_social&utm_campaign=Nova%20campanha%20de%20Vendas&utm_content=Persona%2001&utm_term=BOFU%20%7C%20Persona&placement=instagram_stories&campaign_id=123&adset_id=456&ad_id=789";

describe("extractAttributionFromSearchParams", () => {
  it("devolve null quando não há nenhum dos 9 parâmetros", () => {
    const params = new URLSearchParams("pack=2000&custom=1");
    expect(extractAttributionFromSearchParams(params)).toBeNull();
  });

  it("extrai todos os 9 campos, incluindo espaços/pipes/acentos já decodificados pelo URLSearchParams", () => {
    const params = new URLSearchParams(FULL_QUERY);
    const result = extractAttributionFromSearchParams(params);

    expect(result).toEqual<AdAttribution>({
      utmSource: "ig",
      utmMedium: "paid_social",
      utmCampaign: "Nova campanha de Vendas",
      utmContent: "Persona 01",
      utmTerm: "BOFU | Persona",
      placement: "instagram_stories",
      attributionCampaignId: "123",
      attributionAdsetId: "456",
      attributionAdId: "789",
    });
  });

  it("extrai mesmo que só um único parâmetro esteja presente", () => {
    const params = new URLSearchParams("utm_source=ig");
    const result = extractAttributionFromSearchParams(params);
    expect(result?.utmSource).toBe("ig");
    expect(result?.utmCampaign).toBeNull();
  });

  it("ignora parâmetros vazios ('utm_source=')", () => {
    const params = new URLSearchParams("utm_source=&utm_campaign=Vendas");
    const result = extractAttributionFromSearchParams(params);
    expect(result?.utmSource).toBeNull();
    expect(result?.utmCampaign).toBe("Vendas");
  });

  it("trunca valores absurdamente longos", () => {
    const huge = "a".repeat(1000);
    const params = new URLSearchParams(`utm_campaign=${huge}`);
    const result = extractAttributionFromSearchParams(params);
    expect(result?.utmCampaign).toHaveLength(300);
  });
});

describe("serializeAttribution / parseAttribution — round-trip", () => {
  it("faz round-trip perfeito de todos os campos, incluindo caracteres especiais", () => {
    const params = new URLSearchParams(FULL_QUERY);
    const attribution = extractAttributionFromSearchParams(params);
    const serialized = serializeAttribution(attribution!);
    const parsed = parseAttribution(serialized);

    expect(parsed).toEqual(attribution);
  });

  it("devolve null para cookie ausente", () => {
    expect(parseAttribution(undefined)).toBeNull();
    expect(parseAttribution(null)).toBeNull();
    expect(parseAttribution("")).toBeNull();
  });

  it("nunca lança em cookie corrompida/inválida — devolve null", () => {
    expect(parseAttribution("isto-nao-e-json-nem-uri-valido-%")).toBeNull();
    expect(parseAttribution(encodeURIComponent("42"))).toBeNull();
    expect(parseAttribution(encodeURIComponent(JSON.stringify(["a", "b"])))).toBeNull();
    expect(parseAttribution(encodeURIComponent(JSON.stringify({ random: "field" })))).toBeNull();
  });

  it("ignora campos com tipos inesperados dentro do JSON, sem lançar", () => {
    const malformed = encodeURIComponent(
      JSON.stringify({ utmSource: 123, utmCampaign: "Vendas", extraField: "ignorar" }),
    );
    const parsed = parseAttribution(malformed);
    expect(parsed?.utmSource).toBeNull();
    expect(parsed?.utmCampaign).toBe("Vendas");
  });
});

describe("isPaidTouch", () => {
  it("classifica como pago quando utm_medium=paid_social", () => {
    expect(isPaidTouch(new URLSearchParams("utm_medium=paid_social"))).toBe(true);
  });

  it("classifica como pago quando existe campaign_id, adset_id ou ad_id", () => {
    expect(isPaidTouch(new URLSearchParams("campaign_id=123"))).toBe(true);
    expect(isPaidTouch(new URLSearchParams("adset_id=456"))).toBe(true);
    expect(isPaidTouch(new URLSearchParams("ad_id=789"))).toBe(true);
  });

  it("classifica como pago quando existe fbclid", () => {
    expect(isPaidTouch(new URLSearchParams("fbclid=abc123"))).toBe(true);
  });

  it("NÃO classifica como pago tráfego orgânico com UTMs genéricos", () => {
    expect(isPaidTouch(new URLSearchParams("utm_source=newsletter&utm_medium=email"))).toBe(false);
    expect(isPaidTouch(new URLSearchParams("utm_source=google&utm_medium=organic"))).toBe(false);
    expect(isPaidTouch(new URLSearchParams("utm_campaign=Julho"))).toBe(false);
  });

  it("NÃO classifica como pago quando não há nenhum parâmetro", () => {
    expect(isPaidTouch(new URLSearchParams(""))).toBe(false);
  });

  it("ignora parâmetros de ID vazios ('campaign_id=')", () => {
    expect(isPaidTouch(new URLSearchParams("campaign_id=&adset_id=&ad_id="))).toBe(false);
  });
});
