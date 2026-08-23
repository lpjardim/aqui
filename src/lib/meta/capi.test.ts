import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendMetaCapiEvent } from "@/lib/meta/capi";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sendMetaCapiEvent", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "pixel_123";
    process.env.META_CAPI_ACCESS_TOKEN = "token_123";
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ events_received: 1 })));
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("envia event_name, event_id, action_source e user_data no payload", async () => {
    const result = await sendMetaCapiEvent({
      eventName: "ViewContent",
      eventId: "evt-1",
      eventSourceUrl: "https://aqui.network/",
      actionSource: "website",
      userData: { fbp: "fb.1.111.222", clientIpAddress: "1.2.3.4" },
    });

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);

    expect(body.data).toHaveLength(1);
    const [event] = body.data;
    expect(event.event_name).toBe("ViewContent");
    expect(event.event_id).toBe("evt-1");
    expect(event.event_source_url).toBe("https://aqui.network/");
    expect(event.action_source).toBe("website");
    expect(event.user_data.fbp).toBe("fb.1.111.222");
    expect(event.user_data.client_ip_address).toBe("1.2.3.4");
    // Nunca deve ir hashed — fbp/fbc/ip/user-agent nunca são hashed.
    expect(event.user_data.em).toBeUndefined();
    // O access token nunca vai no corpo do evento propriamente dito.
    expect(event.access_token).toBeUndefined();
    expect(body.access_token).toBe("token_123");
  });

  it("hashea email/telefone/external_id/nome quando presentes", async () => {
    await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId: "evt-2",
      eventSourceUrl: "https://aqui.network/checkout/sucesso",
      actionSource: "website",
      userData: {
        email: "Cliente@Exemplo.pt",
        phone: "912345678",
        externalId: "user_1",
        fullName: "Ana Silva",
      },
      customData: { value: 49, currency: "EUR" },
    });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    const [event] = body.data;

    expect(event.user_data.em).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/)]);
    expect(event.user_data.ph).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/)]);
    expect(event.user_data.external_id).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/)]);
    expect(event.user_data.fn).toEqual([expect.stringMatching(/^[a-f0-9]{64}$/)]);
    expect(event.custom_data).toEqual({ value: 49, currency: "EUR" });
  });

  it("nunca lança e devolve ok:false quando não está configurado", async () => {
    delete process.env.META_CAPI_ACCESS_TOKEN;

    const result = await sendMetaCapiEvent({
      eventName: "PageView",
      eventId: "evt-3",
      eventSourceUrl: "https://aqui.network/",
      actionSource: "website",
      userData: {},
    });

    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("nunca lança quando o fetch falha (erro de rede)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const result = await sendMetaCapiEvent({
      eventName: "InitiateCheckout",
      eventId: "evt-4",
      eventSourceUrl: "https://aqui.network/pedido",
      actionSource: "website",
      userData: {},
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("network down");
  });

  it("nunca lança quando a Meta responde com erro", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: { message: "bad token" } }, 401)));

    const result = await sendMetaCapiEvent({
      eventName: "Purchase",
      eventId: "evt-5",
      eventSourceUrl: "https://aqui.network/checkout/sucesso",
      actionSource: "website",
      userData: {},
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("bad token");
  });
});
