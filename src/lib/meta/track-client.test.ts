import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fireMetaPixelEventMock } = vi.hoisted(() => ({
  fireMetaPixelEventMock: vi.fn(),
}));

vi.mock("@/lib/meta/pixel", () => ({
  fireMetaPixelEvent: fireMetaPixelEventMock,
}));

type FakeWindow = { location: { href: string } };

function stubBrowserGlobals(options: { consent?: "granted" | "denied"; sendBeacon?: boolean } = {}) {
  const { consent = "granted", sendBeacon = false } = options;

  vi.stubGlobal("window", { location: { href: "https://aqui.network/?utm_source=test" } } as FakeWindow);
  vi.stubGlobal("document", { cookie: `aqui_consent=${consent}` });
  vi.stubGlobal("navigator", {
    sendBeacon: sendBeacon ? vi.fn(() => true) : undefined,
  });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
}

describe("trackMetaEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    fireMetaPixelEventMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa o mesmo event_id no fbq(...) e no POST para /api/meta/track", async () => {
    stubBrowserGlobals();
    const { trackMetaEvent } = await import("@/lib/meta/track-client");

    trackMetaEvent("ViewContent");
    await Promise.resolve();
    await Promise.resolve();

    expect(fireMetaPixelEventMock).toHaveBeenCalledTimes(1);
    const [eventNameArg, , eventIdArg] = fireMetaPixelEventMock.mock.calls[0] as [
      string,
      unknown,
      string,
    ];
    expect(eventNameArg).toBe("ViewContent");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.event).toBe("ViewContent");
    expect(body.eventId).toBe(eventIdArg);
    expect(body.eventSourceUrl).toBe("https://aqui.network/?utm_source=test");
  });

  it("usa sendBeacon quando disponível, sem cair para fetch", async () => {
    stubBrowserGlobals({ sendBeacon: true });
    const { trackMetaEvent } = await import("@/lib/meta/track-client");

    trackMetaEvent("InitiateCheckout");

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("não faz nada fora do browser (SSR)", async () => {
    vi.stubGlobal("window", undefined);
    const { trackMetaEvent } = await import("@/lib/meta/track-client");

    expect(() => trackMetaEvent("PageView")).not.toThrow();
    expect(fireMetaPixelEventMock).not.toHaveBeenCalled();
  });

  it("gera um event_id novo (crypto.randomUUID) a cada chamada — nunca reutiliza", async () => {
    stubBrowserGlobals();
    const { trackMetaEvent } = await import("@/lib/meta/track-client");

    trackMetaEvent("PageView");
    trackMetaEvent("PageView");
    await Promise.resolve();
    await Promise.resolve();

    const [firstId] = fireMetaPixelEventMock.mock.calls[0].slice(2);
    const [secondId] = fireMetaPixelEventMock.mock.calls[1].slice(2);
    expect(firstId).not.toBe(secondId);
  });
});
