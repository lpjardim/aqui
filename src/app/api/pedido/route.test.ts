import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdAttribution } from "@/lib/attribution-constants";
import { EMPTY_ATTRIBUTION } from "@/lib/attribution-constants";

const {
  afterCallbacks,
  getStoredAttributionMock,
  getLastPaidTouchAttributionMock,
  checkoutSessionsCreateMock,
  isStripeConfiguredMock,
} = vi.hoisted(() => ({
  afterCallbacks: [] as Array<Promise<unknown>>,
  getStoredAttributionMock: vi.fn<() => Promise<AdAttribution>>(),
  getLastPaidTouchAttributionMock: vi.fn<() => Promise<AdAttribution>>(),
  checkoutSessionsCreateMock: vi.fn(
    async (_params: { metadata: Record<string, string> }) => ({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/cs_test_1",
    }),
  ),
  isStripeConfiguredMock: vi.fn(() => false),
}));

vi.mock("@/lib/attribution", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/attribution")>();
  return {
    ...actual,
    getStoredAttribution: getStoredAttributionMock,
    getLastPaidTouchAttribution: getLastPaidTouchAttributionMock,
  };
});

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: checkoutSessionsCreateMock } } }),
  isStripeConfigured: isStripeConfiguredMock,
  appUrl: (path = "") => `https://aqui.network${path}`,
}));

vi.mock("@/lib/auth", () => ({
  createLoginLink: vi.fn(async () => "https://aqui.network/entrar?token=fake"),
}));

vi.mock("@/lib/email", () => ({
  sendLoginEmail: vi.fn(async () => {}),
}));

vi.mock("@/lib/experiments", () => ({
  getPricingContext: vi.fn(async () => ({ variant: "A", visitorId: "vid_1", isDebug: false })),
  recordExperimentEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/hero-experiment", () => ({
  getHeroContext: vi.fn(async () => ({ variant: "A", visitorId: "vid_1", isDebug: false })),
  recordHeroExperimentEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/consent", () => ({
  hasMarketingConsent: vi.fn(async () => false),
}));

vi.mock("@/lib/packs", () => ({
  getPackByVisualizations: vi.fn(() => null),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (callback: () => unknown) => {
      afterCallbacks.push(Promise.resolve().then(callback));
    },
  };
});

type CreatedOrder = Record<string, unknown>;
let lastOrderCreateData: CreatedOrder | null = null;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: vi.fn(async () => ({ id: "user_1", email: "cliente@exemplo.pt" })),
    },
    order: {
      create: vi.fn(async ({ data }: { data: CreatedOrder }) => {
        lastOrderCreateData = data;
        return { id: "order_1", ...data };
      }),
      update: vi.fn(async ({ data }: { data: CreatedOrder }) => ({ id: "order_1", ...data })),
    },
    deliveryCycle: {
      create: vi.fn(async () => ({ id: "cycle_1" })),
    },
    $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
  },
}));

async function flushAfterCallbacks() {
  await Promise.all(afterCallbacks);
  afterCallbacks.length = 0;
}

function buildOrderInput(overrides: Record<string, unknown> = {}) {
  return {
    zone: "Portugal — Nacional",
    views: 5000,
    billingFrequency: "ONE_TIME",
    assets: [{ url: "https://files.example/a.png", fileType: "image/png" }],
    name: "Cliente Teste",
    companyName: "Empresa Teste",
    email: "cliente@exemplo.pt",
    phone: "+351912345678",
    ...overrides,
  };
}

function pedidoRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/pedido", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const FULL_ATTRIBUTION: AdAttribution = {
  utmSource: "ig",
  utmMedium: "paid_social",
  utmCampaign: "Nova campanha de Vendas",
  utmContent: "Persona 01",
  utmTerm: "BOFU | Persona",
  placement: "instagram_stories",
  attributionCampaignId: "123",
  attributionAdsetId: "456",
  attributionAdId: "789",
};

const LAST_PAID_TOUCH_B: AdAttribution = {
  utmSource: "ig",
  utmMedium: "paid_social",
  utmCampaign: "CampanhaB",
  utmContent: "Hormozi03",
  utmTerm: "BOFU | Hormozi",
  placement: "instagram_stories",
  attributionCampaignId: "444",
  attributionAdsetId: "555",
  attributionAdId: "666",
};

describe("POST /api/pedido — atribuição de marketing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    lastOrderCreateData = null;
    isStripeConfiguredMock.mockReturnValue(false);
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    vi.stubEnv("NODE_ENV", "test");
  });

  it("grava o snapshot de atribuição na Order quando a cookie tem os 9 campos", async () => {
    getStoredAttributionMock.mockResolvedValue(FULL_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    const response = await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(response.status).toBe(200);
    expect(lastOrderCreateData).toMatchObject(FULL_ATTRIBUTION);
  });

  it("cria a Order normalmente (todos os campos de atribuição null) quando não há cookie", async () => {
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    const response = await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(response.status).toBe(200);
    expect(lastOrderCreateData).toMatchObject(EMPTY_ATTRIBUTION);
  });

  it("preserva caracteres especiais (acentos, pipes, espaços) exatamente como vieram da cookie", async () => {
    const withSpecialChars: AdAttribution = {
      ...EMPTY_ATTRIBUTION,
      utmCampaign: "Promoção Verão ☀️",
      utmTerm: "BOFU | Retenção",
    };
    getStoredAttributionMock.mockResolvedValue(withSpecialChars);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(lastOrderCreateData?.utmCampaign).toBe("Promoção Verão ☀️");
    expect(lastOrderCreateData?.utmTerm).toBe("BOFU | Retenção");
  });

  it("nunca lê UTMs do body do pedido — mesmo que o cliente tente enviá-los, são ignorados", async () => {
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput({ utmSource: "forjado-pelo-cliente" })));
    await flushAfterCallbacks();

    expect(lastOrderCreateData?.utmSource).toBeNull();
  });

  it("envia meta_campaign_id/utm_source/utm_campaign para a metadata da Stripe Checkout Session", async () => {
    isStripeConfiguredMock.mockReturnValue(true);
    getStoredAttributionMock.mockResolvedValue(FULL_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          meta_campaign_id: "123",
          meta_adset_id: "456",
          meta_ad_id: "789",
          utm_source: "ig",
          utm_campaign: "Nova campanha de Vendas",
        }),
      }),
    );
  });

  it("não inclui chaves de atribuição vazias na metadata da Stripe", async () => {
    isStripeConfiguredMock.mockReturnValue(true);
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    const call = checkoutSessionsCreateMock.mock.calls[0]?.[0];
    expect(call?.metadata).toEqual({ orderId: "order_1" });
  });
});

describe("POST /api/pedido — last paid touch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    lastOrderCreateData = null;
    isStripeConfiguredMock.mockReturnValue(false);
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    vi.stubEnv("NODE_ENV", "test");
  });

  it("F. grava first-touch e last-paid-touch como dois snapshots independentes na Order", async () => {
    getStoredAttributionMock.mockResolvedValue(FULL_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(LAST_PAID_TOUCH_B);
    const { POST } = await import("@/app/api/pedido/route");

    const response = await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(response.status).toBe(200);
    // First-touch (campanha A) preservado nos campos originais.
    expect(lastOrderCreateData).toMatchObject(FULL_ATTRIBUTION);
    // Last paid touch (campanha B) gravado nos campos lastPaid*, sem
    // sobrepor nem ser sobreposto pelos campos first-touch.
    expect(lastOrderCreateData).toMatchObject({
      lastPaidUtmSource: "ig",
      lastPaidUtmMedium: "paid_social",
      lastPaidUtmCampaign: "CampanhaB",
      lastPaidUtmContent: "Hormozi03",
      lastPaidUtmTerm: "BOFU | Hormozi",
      lastPaidPlacement: "instagram_stories",
      lastPaidCampaignId: "444",
      lastPaidAdsetId: "555",
      lastPaidAdId: "666",
    });
  });

  it("Cenário A: primeira e única entrada paga — first touch e last paid touch iguais", async () => {
    getStoredAttributionMock.mockResolvedValue(FULL_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(FULL_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(lastOrderCreateData?.utmCampaign).toBe("Nova campanha de Vendas");
    expect(lastOrderCreateData?.lastPaidUtmCampaign).toBe("Nova campanha de Vendas");
  });

  it("Cenário D: entrada orgânica sem paid attribution seguida de entrada paga — first touch segue a semântica atual, last paid touch fica preenchido", async () => {
    // First-touch nunca chega a ser escrito pela cookie (entrada orgânica não
    // grava `aqui_attribution` por não ter nenhum dos 9 parâmetros) — aqui
    // simulamos isso devolvendo tudo null, exatamente como
    // `getStoredAttribution()` devolveria nesse caso.
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(LAST_PAID_TOUCH_B);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(lastOrderCreateData).toMatchObject(EMPTY_ATTRIBUTION);
    expect(lastOrderCreateData?.lastPaidUtmCampaign).toBe("CampanhaB");
  });

  it("G. cookie de last-paid-touch corrompida não quebra a criação da Order (fica tudo null)", async () => {
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    const response = await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(response.status).toBe(200);
    expect(lastOrderCreateData?.lastPaidUtmSource).toBeNull();
    expect(lastOrderCreateData?.lastPaidCampaignId).toBeNull();
  });

  it("H. preserva caracteres especiais no last-paid-touch (ex.: 'BOFU | Hormozi')", async () => {
    getLastPaidTouchAttributionMock.mockResolvedValue({
      ...EMPTY_ATTRIBUTION,
      utmTerm: "BOFU | Hormozi",
      utmCampaign: "Promoção Verão ☀️",
    });
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(lastOrderCreateData?.lastPaidUtmTerm).toBe("BOFU | Hormozi");
    expect(lastOrderCreateData?.lastPaidUtmCampaign).toBe("Promoção Verão ☀️");
  });

  it("I. Orders sem nenhum last paid touch (compatibilidade com o comportamento anterior) ficam com todos os campos lastPaid* null", async () => {
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(lastOrderCreateData).toMatchObject({
      lastPaidUtmSource: null,
      lastPaidUtmMedium: null,
      lastPaidUtmCampaign: null,
      lastPaidUtmContent: null,
      lastPaidUtmTerm: null,
      lastPaidPlacement: null,
      lastPaidCampaignId: null,
      lastPaidAdsetId: null,
      lastPaidAdId: null,
    });
  });

  it("envia last_paid_campaign_id/adset_id/ad_id/utm_source/utm_campaign para a metadata da Stripe, junto com a metadata first-touch", async () => {
    isStripeConfiguredMock.mockReturnValue(true);
    getStoredAttributionMock.mockResolvedValue(FULL_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(LAST_PAID_TOUCH_B);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          meta_campaign_id: "123",
          utm_source: "ig",
          utm_campaign: "Nova campanha de Vendas",
          last_paid_campaign_id: "444",
          last_paid_adset_id: "555",
          last_paid_ad_id: "666",
          last_paid_utm_source: "ig",
          last_paid_utm_campaign: "CampanhaB",
        }),
      }),
    );
  });

  it("não inclui chaves last_paid_* vazias na metadata da Stripe quando não há last paid touch", async () => {
    isStripeConfiguredMock.mockReturnValue(true);
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    getLastPaidTouchAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    const { POST } = await import("@/app/api/pedido/route");

    await POST(pedidoRequest(buildOrderInput()));
    await flushAfterCallbacks();

    const call = checkoutSessionsCreateMock.mock.calls[0]?.[0];
    expect(call?.metadata).toEqual({ orderId: "order_1" });
  });
});
