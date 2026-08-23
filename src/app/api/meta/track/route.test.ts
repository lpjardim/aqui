import { beforeEach, describe, expect, it, vi } from "vitest";

const { hasMarketingConsentMock, sendMetaCapiEventMock } = vi.hoisted(() => ({
  hasMarketingConsentMock: vi.fn(async () => true),
  sendMetaCapiEventMock: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/consent", () => ({
  hasMarketingConsent: () => hasMarketingConsentMock(),
}));

vi.mock("@/lib/meta/capi", () => ({
  sendMetaCapiEvent: sendMetaCapiEventMock,
}));

function request(body: unknown, cookie?: string): Request {
  return new Request("http://localhost/api/meta/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
      "user-agent": "vitest-agent",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/meta/track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasMarketingConsentMock.mockResolvedValue(true);
    sendMetaCapiEventMock.mockResolvedValue({ ok: true });
  });

  it("devolve 204 e não chama a CAPI sem consentimento de marketing", async () => {
    hasMarketingConsentMock.mockResolvedValue(false);
    const { POST } = await import("@/app/api/meta/track/route");

    const response = await POST(
      request({ event: "PageView", eventId: "id-1", eventSourceUrl: "https://aqui.network/" }),
    );

    expect(response.status).toBe(204);
    expect(sendMetaCapiEventMock).not.toHaveBeenCalled();
  });

  it("devolve 400 com payload inválido", async () => {
    const { POST } = await import("@/app/api/meta/track/route");

    const response = await POST(request({ event: "NotAnEvent", eventId: "", eventSourceUrl: "not-a-url" }));

    expect(response.status).toBe(400);
    expect(sendMetaCapiEventMock).not.toHaveBeenCalled();
  });

  it.each(["PageView", "ViewContent", "InitiateCheckout"] as const)(
    "aceita o evento standard %s e envia à CAPI com origin pixel-relay",
    async (event) => {
      const { POST } = await import("@/app/api/meta/track/route");

      const response = await POST(
        request({ event, eventId: "id-2", eventSourceUrl: "https://aqui.network/" }),
      );

      expect(response.status).toBe(200);
      expect(sendMetaCapiEventMock).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: event, eventId: "id-2", origin: "pixel-relay" }),
      );
    },
  );

  it("rejeita eventos que não fazem parte dos 3 aceites (ex.: Purchase, que só vem do webhook)", async () => {
    const { POST } = await import("@/app/api/meta/track/route");

    const response = await POST(
      request({ event: "Purchase", eventId: "id-3", eventSourceUrl: "https://aqui.network/" }),
    );

    expect(response.status).toBe(400);
  });

  it("lê fbp/_fbc da própria request (cookies), nunca do corpo", async () => {
    const { POST } = await import("@/app/api/meta/track/route");

    await POST(
      request(
        { event: "ViewContent", eventId: "id-4", eventSourceUrl: "https://aqui.network/" },
        "_fbp=fb.1.1.1; _fbc=fb.1.2.2",
      ),
    );

    expect(sendMetaCapiEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userData: expect.objectContaining({ fbp: "fb.1.1.1", fbc: "fb.1.2.2" }),
      }),
    );
  });

  it("usa _fbc_pending como fallback quando ainda não existe _fbc real", async () => {
    const { POST } = await import("@/app/api/meta/track/route");

    await POST(
      request(
        { event: "InitiateCheckout", eventId: "id-5", eventSourceUrl: "https://aqui.network/pedido" },
        "_fbp=fb.1.1.1; _fbc_pending=fb.1.9.9",
      ),
    );

    expect(sendMetaCapiEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userData: expect.objectContaining({ fbc: "fb.1.9.9" }),
      }),
    );
  });
});
