import { beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnosticEventType } from "@/generated/prisma/enums";
import type { AdAttribution } from "@/lib/attribution-constants";
import { EMPTY_ATTRIBUTION } from "@/lib/attribution-constants";

const {
  getDiagnosticVisitorContextMock,
  recordDiagnosticEventMock,
  getStoredAttributionMock,
  getAcquisitionRouterContextMock,
  recordAcquisitionRouterAssignmentMock,
} = vi.hoisted(() => ({
  getDiagnosticVisitorContextMock: vi.fn(),
  recordDiagnosticEventMock: vi.fn(async () => {}),
  getStoredAttributionMock: vi.fn<() => Promise<AdAttribution>>(),
  getAcquisitionRouterContextMock: vi.fn(),
  recordAcquisitionRouterAssignmentMock: vi.fn(async () => {}),
}));

vi.mock("@/lib/diagnostic-context", () => ({
  getDiagnosticVisitorContext: getDiagnosticVisitorContextMock,
  recordDiagnosticEvent: recordDiagnosticEventMock,
}));

vi.mock("@/lib/attribution", () => ({
  getStoredAttribution: getStoredAttributionMock,
}));

vi.mock("@/lib/acquisition-router", () => ({
  getAcquisitionRouterContext: getAcquisitionRouterContextMock,
  recordAcquisitionRouterAssignment: recordAcquisitionRouterAssignmentMock,
}));

function request(body: unknown): Request {
  return new Request("http://localhost/api/experiments/track-diagnostic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = { visitorId: "vid_1", sessionId: "sid_1", heroVariant: "PAIN" as const, isDebug: false };

const noRouterContext = {
  funnelFamily: null,
  routerExperimentId: null,
  visitorId: "vid_1",
  sessionId: "sid_1",
  isDebug: false,
};

describe("POST /api/experiments/track-diagnostic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDiagnosticVisitorContextMock.mockResolvedValue(context);
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    getAcquisitionRouterContextMock.mockResolvedValue(noRouterContext);
  });

  it("devolve 400 para um evento desconhecido", async () => {
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    const response = await POST(request({ event: "not_a_real_event", diagnosticId: "diag_1" }));

    expect(response.status).toBe(400);
    expect(recordDiagnosticEventMock).not.toHaveBeenCalled();
  });

  it("devolve 400 quando não há diagnosticId, mesmo com um evento válido", async () => {
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    const response = await POST(request({ event: "diagnostic_started" }));

    expect(response.status).toBe(400);
    expect(recordDiagnosticEventMock).not.toHaveBeenCalled();
  });

  it.each([
    ["diagnostic_hero_cta_clicked", DiagnosticEventType.HERO_CTA_CLICKED],
    ["diagnostic_started", DiagnosticEventType.STARTED],
    ["diagnostic_question_answered", DiagnosticEventType.QUESTION_ANSWERED],
    ["diagnostic_completed", DiagnosticEventType.COMPLETED],
    ["diagnostic_result_viewed", DiagnosticEventType.RESULT_VIEWED],
    ["preview_started", DiagnosticEventType.PREVIEW_STARTED],
    ["preview_completed", DiagnosticEventType.PREVIEW_COMPLETED],
    ["recommendation_viewed", DiagnosticEventType.RECOMMENDATION_VIEWED],
    ["recommended_plan_clicked", DiagnosticEventType.RECOMMENDED_PLAN_CLICKED],
    ["checkout_started", DiagnosticEventType.CHECKOUT_STARTED],
    ["payment_clicked", DiagnosticEventType.PAYMENT_CLICKED],
  ] as const)("mapeia o evento %s para %s", async (event, eventType) => {
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    await POST(request({ event, diagnosticId: "diag_1", metadata: { step: 2 } }));

    expect(recordDiagnosticEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType,
        diagnosticId: "diag_1",
        context,
        metadata: { step: 2 },
      }),
    );
  });

  it("mapeia diagnostic_hero_view para HERO_VIEWED e enriquece a metadata com experiment_id + UTMs (da cookie, nunca do body)", async () => {
    const attribution: AdAttribution = {
      ...EMPTY_ATTRIBUTION,
      utmSource: "ig",
      utmMedium: "paid_social",
      utmCampaign: "CampanhaX",
    };
    getStoredAttributionMock.mockResolvedValue(attribution);
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    await POST(
      request({
        event: "diagnostic_hero_view",
        diagnosticId: "diag_1",
        metadata: { heroVariant: "PAIN", referrer: "https://exemplo.pt", utmSource: "forjado" },
      }),
    );

    expect(recordDiagnosticEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: DiagnosticEventType.HERO_VIEWED,
        diagnosticId: "diag_1",
        context,
        metadata: expect.objectContaining({
          heroVariant: "PAIN",
          referrer: "https://exemplo.pt",
          experimentId: "diagnostic_hero_v1",
          utmSource: "ig",
          utmMedium: "paid_social",
          utmCampaign: "CampanhaX",
        }),
      }),
    );
  });

  it("nunca enriquece a metadata com UTMs para outros eventos além de diagnostic_hero_view", async () => {
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    await POST(request({ event: "diagnostic_started", diagnosticId: "diag_1", metadata: {} }));

    expect(getStoredAttributionMock).not.toHaveBeenCalled();
  });

  it("nunca confia em visitorId/sessionId vindos do corpo do pedido", async () => {
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    await POST(
      request({
        event: "diagnostic_started",
        diagnosticId: "diag_1",
        visitorId: "attacker-controlled",
        sessionId: "attacker-controlled",
      }),
    );

    expect(recordDiagnosticEventMock).toHaveBeenCalledWith(expect.objectContaining({ context }));
  });
});

describe("POST /api/experiments/track-diagnostic — mirror do acquisition_router_assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDiagnosticVisitorContextMock.mockResolvedValue(context);
    getStoredAttributionMock.mockResolvedValue(EMPTY_ATTRIBUTION);
    getAcquisitionRouterContextMock.mockResolvedValue(noRouterContext);
  });

  it("grava acquisition_router_assignment quando a sessão do router indica família DIAGNOSTIC", async () => {
    getAcquisitionRouterContextMock.mockResolvedValue({
      funnelFamily: "DIAGNOSTIC",
      routerExperimentId: "acquisition_router_v1",
      visitorId: "vid_1",
      sessionId: "sid_1",
      isDebug: false,
    });
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    await POST(request({ event: "diagnostic_hero_view", diagnosticId: "diag_1" }));

    expect(recordAcquisitionRouterAssignmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routerContext: expect.objectContaining({ funnelFamily: "DIAGNOSTIC" }),
      }),
    );
  });

  it("não grava acquisition_router_assignment quando a sessão do router é ausente (visita direta a /diagnostico)", async () => {
    getAcquisitionRouterContextMock.mockResolvedValue(noRouterContext);
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    await POST(request({ event: "diagnostic_hero_view", diagnosticId: "diag_1" }));

    expect(recordAcquisitionRouterAssignmentMock).not.toHaveBeenCalled();
  });

  it("não grava acquisition_router_assignment quando a família do router é LANDING (nunca deveria acontecer, mas nunca duplica)", async () => {
    getAcquisitionRouterContextMock.mockResolvedValue({
      funnelFamily: "LANDING",
      routerExperimentId: "acquisition_router_v1",
      visitorId: "vid_1",
      sessionId: "sid_1",
      isDebug: false,
    });
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    await POST(request({ event: "diagnostic_hero_view", diagnosticId: "diag_1" }));

    expect(recordAcquisitionRouterAssignmentMock).not.toHaveBeenCalled();
  });

  it("não grava acquisition_router_assignment para eventos que não sejam diagnostic_hero_view", async () => {
    getAcquisitionRouterContextMock.mockResolvedValue({
      funnelFamily: "DIAGNOSTIC",
      routerExperimentId: "acquisition_router_v1",
      visitorId: "vid_1",
      sessionId: "sid_1",
      isDebug: false,
    });
    const { POST } = await import("@/app/api/experiments/track-diagnostic/route");

    await POST(request({ event: "diagnostic_started", diagnosticId: "diag_1" }));

    expect(recordAcquisitionRouterAssignmentMock).not.toHaveBeenCalled();
  });
});
