import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMetaCapiEventMock, afterCallbacks } = vi.hoisted(() => ({
  sendMetaCapiEventMock: vi.fn(async () => ({ ok: true })),
  afterCallbacks: [] as Array<Promise<unknown>>,
}));

vi.mock("@/lib/meta/capi", () => ({
  sendMetaCapiEvent: sendMetaCapiEventMock,
}));

vi.mock("@/lib/meta", () => ({
  resumeMetaCampaign: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/auth", () => ({
  createLoginLink: vi.fn(async () => "https://aqui.network/entrar?token=fake"),
}));

vi.mock("@/lib/email", () => ({
  sendLoginEmail: vi.fn(async () => {}),
  sendInternalNotification: vi.fn(async () => {}),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      // Assinatura já validada antes de chegar aqui nos testes — só
      // reconstituímos o evento a partir do corpo em bruto.
      constructEvent: (rawBody: string) => JSON.parse(rawBody),
    },
  }),
  appUrl: (path = "") => `https://aqui.network${path}`,
}));

type FakeOrder = {
  id: string;
  status: string;
  billingFrequency: "ONE_TIME" | "MONTHLY";
  visualizationsPurchased: number;
  price: number;
  userId: string;
  stripeCheckoutStatus: string;
  stripePaymentIntentId: string | null;
  stripeSessionId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  metaMarketingConsent: boolean;
  metaPurchaseEventId: string | null;
  metaFbp: string | null;
  metaFbc: string | null;
  metaClientIp: string | null;
  metaClientUserAgent: string | null;
  user: { id: string; email: string; name: string; phone: string | null };
};

function makeOrder(overrides: Partial<FakeOrder> = {}): FakeOrder {
  return {
    id: "order_1",
    status: "PENDING_PAYMENT",
    billingFrequency: "ONE_TIME",
    visualizationsPurchased: 1000,
    price: 4900,
    userId: "user_1",
    stripeCheckoutStatus: "CREATED",
    stripePaymentIntentId: null,
    stripeSessionId: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    metaMarketingConsent: true,
    metaPurchaseEventId: "meta_evt_1",
    metaFbp: "fb.1.1.1",
    metaFbc: null,
    metaClientIp: "1.2.3.4",
    metaClientUserAgent: "vitest",
    user: { id: "user_1", email: "cliente@exemplo.pt", name: "Cliente Teste", phone: null },
    ...overrides,
  };
}

let order: FakeOrder = makeOrder();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(async () => ({ ...order })),
      update: vi.fn(async ({ data }: { data: Partial<FakeOrder> }) => {
        order = { ...order, ...data };
        return { ...order };
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    deliveryCycle: {
      create: vi.fn(async () => ({ id: "cycle_1" })),
      count: vi.fn(async () => 0),
    },
    $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
  },
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

async function flushAfterCallbacks() {
  await Promise.all(afterCallbacks);
  afterCallbacks.length = 0;
}

function buildCheckoutSessionCompletedBody(sessionOverrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_test_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        payment_status: "paid",
        metadata: { orderId: "order_1" },
        client_reference_id: "order_1",
        payment_intent: "pi_123",
        customer: "cus_123",
        subscription: null,
        amount_total: 4900,
        customer_details: { address: null },
        ...sessionOverrides,
      },
    },
  });
}

function webhookRequest(body: string): Request {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "test-signature" },
    body,
  });
}

describe("POST /api/stripe/webhook — idempotência do Purchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMetaCapiEventMock.mockClear();
    afterCallbacks.length = 0;
    order = makeOrder();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("envia Purchase uma única vez, mesmo que a Stripe reenvie o mesmo evento (retry)", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const body = buildCheckoutSessionCompletedBody();

    const firstResponse = await POST(webhookRequest(body));
    await flushAfterCallbacks();

    expect(firstResponse.status).toBe(200);
    expect(sendMetaCapiEventMock).toHaveBeenCalledTimes(1);
    expect(sendMetaCapiEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "Purchase", eventId: "meta_evt_1", origin: "webhook" }),
    );
    expect(order.status).toBe("PAID");

    // Stripe reenvia o mesmo evento (ex.: não recebeu o 200 a tempo).
    const secondResponse = await POST(webhookRequest(body));
    await flushAfterCallbacks();

    expect(secondResponse.status).toBe(200);
    // Continua só 1 — a encomenda já não está PENDING_PAYMENT, `markAsPaid` devolve cedo.
    expect(sendMetaCapiEventMock).toHaveBeenCalledTimes(1);
  });

  it("envia também Subscribe (mesmo event_id) só para encomendas MONTHLY", async () => {
    order = makeOrder({ billingFrequency: "MONTHLY" });
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const body = buildCheckoutSessionCompletedBody({ subscription: "sub_123" });

    await POST(webhookRequest(body));
    await flushAfterCallbacks();

    expect(sendMetaCapiEventMock).toHaveBeenCalledTimes(2);
    expect(sendMetaCapiEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ eventName: "Purchase", eventId: "meta_evt_1" }),
    );
    expect(sendMetaCapiEventMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ eventName: "Subscribe", eventId: "meta_evt_1" }),
    );
  });

  it("nunca envia Purchase sem consentimento de marketing guardado na Order", async () => {
    order = makeOrder({ metaMarketingConsent: false });
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const body = buildCheckoutSessionCompletedBody();

    await POST(webhookRequest(body));
    await flushAfterCallbacks();

    expect(sendMetaCapiEventMock).not.toHaveBeenCalled();
  });

  it("não marca como paga nem envia Purchase antes de o pagamento estar confirmado", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const body = buildCheckoutSessionCompletedBody({ payment_status: "unpaid" });

    const response = await POST(webhookRequest(body));
    await flushAfterCallbacks();

    expect(response.status).toBe(200);
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(sendMetaCapiEventMock).not.toHaveBeenCalled();
  });

  it("usa o valor real da Stripe (amount_total), nunca o price calculado da Order", async () => {
    order = makeOrder({ price: 1 });
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const body = buildCheckoutSessionCompletedBody({ amount_total: 4900 });

    await POST(webhookRequest(body));
    await flushAfterCallbacks();

    expect(sendMetaCapiEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ customData: { value: 49, currency: "EUR" } }),
    );
  });
});
