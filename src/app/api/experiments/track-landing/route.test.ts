import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingEventType, LandingVariant } from "@/generated/prisma/enums";

const {
  getLandingContextMock,
  recordLandingExperimentEventMock,
  getAcquisitionRouterContextMock,
  recordAcquisitionRouterAssignmentMock,
} = vi.hoisted(() => ({
  getLandingContextMock: vi.fn(),
  recordLandingExperimentEventMock: vi.fn(async () => {}),
  getAcquisitionRouterContextMock: vi.fn(),
  recordAcquisitionRouterAssignmentMock: vi.fn(async () => {}),
}));

vi.mock("@/lib/landing-experiment", () => ({
  getLandingContext: getLandingContextMock,
  recordLandingExperimentEvent: recordLandingExperimentEventMock,
}));

vi.mock("@/lib/acquisition-router", () => ({
  getAcquisitionRouterContext: getAcquisitionRouterContextMock,
  recordAcquisitionRouterAssignment: recordAcquisitionRouterAssignmentMock,
}));

function request(body: unknown): Request {
  return new Request("http://localhost/api/experiments/track-landing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const activeContext = {
  variant: LandingVariant.SALES,
  visitorId: "vid_1",
  sessionId: "sid_1",
  experimentVisitId: "visit_1",
  isDebug: false,
  session: {
    variant: LandingVariant.SALES,
    visitId: "visit_1",
    isDebug: false,
    attribution: {
      utmSource: "ig",
      utmMedium: "paid_social",
      utmCampaign: "campanha-a",
      utmContent: null,
      utmTerm: null,
      placement: null,
      attributionCampaignId: null,
      attributionAdsetId: null,
      attributionAdId: null,
    },
    fbclid: "fbclid-123",
  },
};

const inactiveContext = {
  variant: null,
  visitorId: "vid_1",
  sessionId: "sid_1",
  experimentVisitId: null,
  isDebug: false,
  session: null,
};

const noRouterContext = {
  funnelFamily: null,
  routerExperimentId: null,
  visitorId: "vid_1",
  sessionId: "sid_1",
  isDebug: false,
};

describe("POST /api/experiments/track-landing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLandingContextMock.mockResolvedValue(activeContext);
    getAcquisitionRouterContextMock.mockResolvedValue(noRouterContext);
  });

  it("devolve 400 para um evento desconhecido", async () => {
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    const response = await POST(request({ event: "not_a_real_event" }));

    expect(response.status).toBe(400);
    expect(recordLandingExperimentEventMock).not.toHaveBeenCalled();
  });

  it("não grava nada quando não há sessão de landing ativa, mas devolve 200", async () => {
    getLandingContextMock.mockResolvedValue(inactiveContext);
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    const response = await POST(request({ event: "experiment_exposure" }));
    const body = (await response.json()) as { ok: boolean; skipped?: boolean };

    expect(response.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(recordLandingExperimentEventMock).not.toHaveBeenCalled();
  });

  it("grava experiment_exposure com a atribuição vinda da própria sessão (nunca do body)", async () => {
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    await POST(request({ event: "experiment_exposure", metadata: { landingPath: "/anunciar" } }));

    expect(recordLandingExperimentEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: LandingEventType.EXPOSURE,
        context: activeContext,
        metadata: expect.objectContaining({
          landingPath: "/anunciar",
          utmSource: "ig",
          utmCampaign: "campanha-a",
          fbclid: "fbclid-123",
        }),
      }),
    );
  });

  it.each([
    ["pricing_view", LandingEventType.PRICING_VIEW],
    ["cta_clicked", LandingEventType.CTA_CLICKED],
    ["plan_selected", LandingEventType.PLAN_SELECTED],
    ["checkout_started", LandingEventType.CHECKOUT_STARTED],
    ["payment_clicked", LandingEventType.PAYMENT_CLICKED],
  ] as const)("mapeia o evento %s para %s e não injeta dados de atribuição", async (event, eventType) => {
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    await POST(request({ event, metadata: { plan: "p2k" } }));

    expect(recordLandingExperimentEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType,
        metadata: { plan: "p2k" },
      }),
    );
  });

  it("nunca confia na variante/visitante vindos do corpo do pedido", async () => {
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    await POST(
      request({
        event: "cta_clicked",
        variant: "BLOG",
        visitorId: "attacker-controlled",
      }),
    );

    expect(recordLandingExperimentEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ context: activeContext }),
    );
  });
});

describe("POST /api/experiments/track-landing — mirror do acquisition_router_assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLandingContextMock.mockResolvedValue(activeContext);
    getAcquisitionRouterContextMock.mockResolvedValue(noRouterContext);
  });

  it("grava acquisition_router_assignment quando a sessão do router indica família LANDING", async () => {
    getAcquisitionRouterContextMock.mockResolvedValue({
      funnelFamily: "LANDING",
      routerExperimentId: "acquisition_router_v1",
      visitorId: "vid_1",
      sessionId: "sid_1",
      isDebug: false,
    });
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    await POST(request({ event: "experiment_exposure" }));

    expect(recordAcquisitionRouterAssignmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routerContext: expect.objectContaining({ funnelFamily: "LANDING" }),
        landingVariant: activeContext.variant,
      }),
    );
  });

  it("não grava acquisition_router_assignment quando a sessão do router é ausente (visita direta, fora de /go)", async () => {
    getAcquisitionRouterContextMock.mockResolvedValue(noRouterContext);
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    await POST(request({ event: "experiment_exposure" }));

    expect(recordAcquisitionRouterAssignmentMock).not.toHaveBeenCalled();
  });

  it("não grava acquisition_router_assignment quando a família do router é DIAGNOSTIC (nunca deveria acontecer, mas nunca duplica)", async () => {
    getAcquisitionRouterContextMock.mockResolvedValue({
      funnelFamily: "DIAGNOSTIC",
      routerExperimentId: "acquisition_router_v1",
      visitorId: "vid_1",
      sessionId: "sid_1",
      isDebug: false,
    });
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    await POST(request({ event: "experiment_exposure" }));

    expect(recordAcquisitionRouterAssignmentMock).not.toHaveBeenCalled();
  });

  it("não grava acquisition_router_assignment para eventos que não sejam experiment_exposure", async () => {
    getAcquisitionRouterContextMock.mockResolvedValue({
      funnelFamily: "LANDING",
      routerExperimentId: "acquisition_router_v1",
      visitorId: "vid_1",
      sessionId: "sid_1",
      isDebug: false,
    });
    const { POST } = await import("@/app/api/experiments/track-landing/route");

    await POST(request({ event: "cta_clicked" }));

    expect(recordAcquisitionRouterAssignmentMock).not.toHaveBeenCalled();
  });
});
