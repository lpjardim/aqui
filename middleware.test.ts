import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";
import {
  ATTRIBUTION_COOKIE,
  LAST_PAID_ATTRIBUTION_COOKIE,
  parseAttribution,
  serializeAttribution,
} from "@/lib/attribution-constants";

function makeRequest(url: string, cookieHeader?: string): NextRequest {
  return new NextRequest(new URL(url, "https://aqui.example"), {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

describe("middleware — captura de atribuição (aqui_attribution)", () => {
  it("não escreve a cookie quando não há nenhum parâmetro de atribuição na URL", () => {
    const response = middleware(makeRequest("/?pack=2000"));
    expect(response.cookies.get(ATTRIBUTION_COOKIE)).toBeUndefined();
  });

  it("escreve a cookie quando há pelo menos um parâmetro de atribuição", () => {
    const response = middleware(
      makeRequest(
        "/?utm_source=ig&utm_medium=paid_social&utm_campaign=Nova%20campanha%20de%20Vendas&utm_content=Persona%2001&utm_term=BOFU%20%7C%20Persona&placement=instagram_stories&campaign_id=123&adset_id=456&ad_id=789",
      ),
    );
    const cookie = response.cookies.get(ATTRIBUTION_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 90);

    const parsed = parseAttribution(cookie?.value);
    expect(parsed).toEqual({
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

  it("escreve a cookie mesmo com um único parâmetro presente (ex.: só utm_source)", () => {
    const response = middleware(makeRequest("/?utm_source=google"));
    const cookie = response.cookies.get(ATTRIBUTION_COOKIE);
    expect(parseAttribution(cookie?.value)?.utmSource).toBe("google");
  });

  it("first-touch: não sobrescreve a cookie existente mesmo com novos UTMs na URL", () => {
    const original = serializeAttribution({
      utmSource: "ig",
      utmMedium: "paid_social",
      utmCampaign: "Campanha Original",
      utmContent: null,
      utmTerm: null,
      placement: null,
      attributionCampaignId: null,
      attributionAdsetId: null,
      attributionAdId: null,
    });

    const response = middleware(
      makeRequest(
        "/?utm_source=facebook&utm_campaign=Campanha Nova",
        `${ATTRIBUTION_COOKIE}=${original}`,
      ),
    );

    // Nenhuma nova cookie deve ser escrita na resposta — a existente já
    // "ganhou" (first-touch).
    expect(response.cookies.get(ATTRIBUTION_COOKIE)).toBeUndefined();
  });

  it("não mexe em nada quando a navegação é interna (sem parâmetros nenhuns) e já existe cookie", () => {
    const original = serializeAttribution({
      utmSource: "ig",
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      placement: null,
      attributionCampaignId: null,
      attributionAdsetId: null,
      attributionAdId: null,
    });

    const response = middleware(makeRequest("/pedido", `${ATTRIBUTION_COOKIE}=${original}`));
    expect(response.cookies.get(ATTRIBUTION_COOKIE)).toBeUndefined();
  });
});

describe("middleware — last paid touch (aqui_last_paid_attribution)", () => {
  it("A. primeira entrada paga: grava last-paid-touch igual ao first-touch", () => {
    const response = middleware(
      makeRequest(
        "/?utm_source=ig&utm_medium=paid_social&utm_campaign=CampanhaA&utm_content=Persona01&utm_term=BOFU%20%7C%20Persona&campaign_id=111&adset_id=222&ad_id=333",
      ),
    );

    const firstTouch = parseAttribution(response.cookies.get(ATTRIBUTION_COOKIE)?.value);
    const lastPaid = parseAttribution(response.cookies.get(LAST_PAID_ATTRIBUTION_COOKIE)?.value);
    expect(firstTouch).toEqual(lastPaid);
    expect(lastPaid?.attributionAdId).toBe("333");
  });

  it("B. segunda entrada paga: sobrescreve last-paid-touch mesmo já existindo first-touch e last-paid anteriores", () => {
    const firstTouchCookie = serializeAttribution({
      utmSource: "ig",
      utmMedium: "paid_social",
      utmCampaign: "CampanhaA",
      utmContent: "Persona01",
      utmTerm: "BOFU | Persona",
      placement: null,
      attributionCampaignId: "111",
      attributionAdsetId: "222",
      attributionAdId: "333",
    });
    const lastPaidCookie = serializeAttribution({
      utmSource: "ig",
      utmMedium: "paid_social",
      utmCampaign: "CampanhaA",
      utmContent: "Persona01",
      utmTerm: "BOFU | Persona",
      placement: null,
      attributionCampaignId: "111",
      attributionAdsetId: "222",
      attributionAdId: "333",
    });

    const response = middleware(
      makeRequest(
        "/?utm_source=ig&utm_medium=paid_social&utm_campaign=CampanhaB&utm_content=Hormozi03&utm_term=BOFU%20%7C%20Hormozi&campaign_id=444&adset_id=555&ad_id=666",
        `${ATTRIBUTION_COOKIE}=${firstTouchCookie}; ${LAST_PAID_ATTRIBUTION_COOKIE}=${lastPaidCookie}`,
      ),
    );

    // First-touch continua intacto (nenhuma nova cookie escrita para ele).
    expect(response.cookies.get(ATTRIBUTION_COOKIE)).toBeUndefined();

    // Last-paid-touch é reescrito com a campanha B.
    const lastPaid = parseAttribution(response.cookies.get(LAST_PAID_ATTRIBUTION_COOKIE)?.value);
    expect(lastPaid?.utmCampaign).toBe("CampanhaB");
    expect(lastPaid?.attributionAdId).toBe("666");
  });

  it("C. navegação interna (sem parâmetros nenhuns) não altera o last-paid-touch", () => {
    const response = middleware(makeRequest("/pedido"));
    expect(response.cookies.get(LAST_PAID_ATTRIBUTION_COOKIE)).toBeUndefined();
  });

  it("D. visita direta posterior não apaga nem sobrescreve o last-paid-touch existente", () => {
    const lastPaidCookie = serializeAttribution({
      utmSource: "ig",
      utmMedium: "paid_social",
      utmCampaign: "CampanhaA",
      utmContent: null,
      utmTerm: null,
      placement: null,
      attributionCampaignId: "111",
      attributionAdsetId: null,
      attributionAdId: null,
    });

    const response = middleware(
      makeRequest("/pedido", `${LAST_PAID_ATTRIBUTION_COOKIE}=${lastPaidCookie}`),
    );

    // Nenhuma nova cookie é escrita — a existente permanece intocada no browser.
    expect(response.cookies.get(LAST_PAID_ATTRIBUTION_COOKIE)).toBeUndefined();
  });

  it("E. tráfego orgânico com UTM genérico (sem paid_social/IDs/fbclid) não é classificado como paid touch", () => {
    const response = middleware(makeRequest("/?utm_source=newsletter&utm_medium=email&utm_campaign=Julho"));

    // First-touch grava normalmente (é só UTMs, sem exigência de "pago").
    expect(response.cookies.get(ATTRIBUTION_COOKIE)).toBeDefined();
    // Last-paid-touch NÃO grava — não há evidência de campanha paga.
    expect(response.cookies.get(LAST_PAID_ATTRIBUTION_COOKIE)).toBeUndefined();
  });

  it("grava last-paid-touch quando só há fbclid + UTMs (sem paid_social nem IDs)", () => {
    const response = middleware(makeRequest("/?utm_source=ig&fbclid=abc123"));
    const lastPaid = parseAttribution(response.cookies.get(LAST_PAID_ATTRIBUTION_COOKIE)?.value);
    expect(lastPaid?.utmSource).toBe("ig");
  });

  it("não classifica como paid touch quando só campaign_id/adset_id/ad_id vêm vazios", () => {
    const response = middleware(makeRequest("/?utm_source=parceiro&campaign_id=&adset_id=&ad_id="));
    expect(response.cookies.get(LAST_PAID_ATTRIBUTION_COOKIE)).toBeUndefined();
  });

  it("a cookie de last-paid-touch é httpOnly, sameSite=lax e com janela de 90 dias", () => {
    const response = middleware(makeRequest("/?utm_medium=paid_social&campaign_id=1"));
    const cookie = response.cookies.get(LAST_PAID_ATTRIBUTION_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 90);
  });
});
