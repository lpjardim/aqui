import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";
import {
  ATTRIBUTION_COOKIE,
  LAST_PAID_ATTRIBUTION_COOKIE,
  parseAttribution,
  serializeAttribution,
} from "@/lib/attribution-constants";
import {
  LANDING_ROUTES,
  LANDING_SESSION_COOKIE,
  parseLandingSession,
  serializeLandingSession,
} from "@/lib/landing-experiment-constants";

const DEFAULT_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

function makeRequest(
  url: string,
  cookieHeader?: string,
  extraHeaders?: Record<string, string>,
): NextRequest {
  return new NextRequest(new URL(url, "https://aqui.example"), {
    headers: {
      "user-agent": DEFAULT_BROWSER_USER_AGENT,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...extraHeaders,
    },
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

describe("middleware — /go (experimento landing_page_v1)", () => {
  it("redireciona sempre para uma das 3 rotas conhecidas, nunca renderiza /go em si", () => {
    const response = middleware(makeRequest("/go"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(Object.values(LANDING_ROUTES)).toContain(location.pathname);
  });

  it("nunca cacheia a resposta do redirect (Cache-Control: no-store)", () => {
    const response = middleware(makeRequest("/go"));
    expect(response.headers.get("Cache-Control")).toBe("no-store, private");
  });

  it("escreve a cookie landing_session sem maxAge/expires (cookie de sessão, nunca sticky)", () => {
    const response = middleware(makeRequest("/go"));
    const cookie = response.cookies.get(LANDING_SESSION_COOKIE);
    expect(cookie).toBeDefined();
    expect(cookie?.maxAge).toBeUndefined();
    expect(cookie?.expires).toBeUndefined();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });

  it("distribui aproximadamente 33/33/34% entre as 3 variantes ao longo de muitos pedidos", () => {
    const counts: Record<string, number> = { NORMAL: 0, SALES: 0, BLOG: 0 };
    const ITERATIONS = 3000;

    for (let i = 0; i < ITERATIONS; i++) {
      const response = middleware(makeRequest("/go"));
      const session = parseLandingSession(response.cookies.get(LANDING_SESSION_COOKIE)?.value);
      expect(session).not.toBeNull();
      counts[session!.variant] += 1;
    }

    for (const variant of Object.keys(counts)) {
      const share = counts[variant] / ITERATIONS;
      expect(share).toBeGreaterThan(0.28);
      expect(share).toBeLessThan(0.38);
    }
  });

  it("mantém a mesma variante em pedidos repetidos dentro da mesma sessão, mas gera um novo experiment_visit_id", () => {
    const first = middleware(makeRequest("/go"));
    const firstSession = parseLandingSession(first.cookies.get(LANDING_SESSION_COOKIE)?.value)!;

    const second = middleware(
      makeRequest("/go", `${LANDING_SESSION_COOKIE}=${serializeLandingSession(firstSession)}`),
    );
    const secondSession = parseLandingSession(second.cookies.get(LANDING_SESSION_COOKIE)?.value)!;

    expect(secondSession.variant).toBe(firstSession.variant);
    expect(secondSession.visitId).not.toBe(firstSession.visitId);
  });

  it("?variant= força a variante pedida e marca isDebug=true, sem contaminar o sorteio real", () => {
    const response = middleware(makeRequest("/go?variant=sales"));
    const session = parseLandingSession(response.cookies.get(LANDING_SESSION_COOKIE)?.value);

    expect(session?.variant).toBe("SALES");
    expect(session?.isDebug).toBe(true);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe(LANDING_ROUTES.SALES);
  });

  it("preserva todos os UTMs/fbclid da URL original no redirect (exceto o próprio ?variant=)", () => {
    const response = middleware(
      makeRequest(
        "/go?variant=blog&utm_source=ig&utm_medium=paid_social&utm_campaign=CampanhaA&fbclid=abc123",
      ),
    );
    const location = new URL(response.headers.get("location") ?? "");

    expect(location.pathname).toBe(LANDING_ROUTES.BLOG);
    expect(location.searchParams.get("utm_source")).toBe("ig");
    expect(location.searchParams.get("utm_medium")).toBe("paid_social");
    expect(location.searchParams.get("utm_campaign")).toBe("CampanhaA");
    expect(location.searchParams.get("fbclid")).toBe("abc123");
    expect(location.searchParams.has("variant")).toBe(false);
  });

  it("guarda a atribuição desta entrada na própria cookie landing_session", () => {
    const response = middleware(
      makeRequest("/go?variant=normal&utm_source=ig&utm_campaign=CampanhaA&fbclid=abc123"),
    );
    const session = parseLandingSession(response.cookies.get(LANDING_SESSION_COOKIE)?.value);

    expect(session?.attribution.utmSource).toBe("ig");
    expect(session?.attribution.utmCampaign).toBe("CampanhaA");
    expect(session?.fbclid).toBe("abc123");
  });

  it("bots/crawlers conhecidos são redirecionados sem receber cookie de sessão nenhuma", () => {
    const response = middleware(
      makeRequest("/go?utm_source=ig", undefined, { "user-agent": "facebookexternalhit/1.1" }),
    );

    expect(response.status).toBe(307);
    expect(response.cookies.get(LANDING_SESSION_COOKIE)).toBeUndefined();
  });

  it("um user-agent normal (browser) nunca é tratado como bot", () => {
    const response = middleware(
      makeRequest("/go", undefined, {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      }),
    );

    expect(response.cookies.get(LANDING_SESSION_COOKIE)).toBeDefined();
  });

  it("uma rota normal (fora de /go) nunca escreve a cookie landing_session", () => {
    const response = middleware(makeRequest("/"));
    expect(response.cookies.get(LANDING_SESSION_COOKIE)).toBeUndefined();
  });
});
