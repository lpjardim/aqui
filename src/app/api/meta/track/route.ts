import { NextResponse } from "next/server";
import { z } from "zod";
import { hasMarketingConsent } from "@/lib/consent";
import { sendMetaCapiEvent } from "@/lib/meta/capi";
import { clientIp, readCookie } from "@/lib/meta/request-context";

export const runtime = "nodejs";

/**
 * Endpoint interno chamado pelo browser logo a seguir a disparar o Pixel,
 * para enviar o mesmo evento também via Conversions API (redundância contra
 * bloqueadores de anúncios / Safari ITP) — usado só para `ViewContent` e
 * `InitiateCheckout`, os únicos eventos que partem diretamente de uma ação
 * do visitante sem já existir uma Order/pagamento confirmado.
 *
 * Nunca confia em IP/user-agent/fbp/fbc vindos do corpo do pedido — lê-os
 * sempre desta própria request (única forma de garantir que correspondem a
 * quem realmente fez o pedido).
 */
const bodySchema = z.object({
  event: z.enum(["ViewContent", "InitiateCheckout"]),
  eventId: z.string().min(1).max(200),
  eventSourceUrl: z.string().url(),
});

export async function POST(request: Request) {
  if (!(await hasMarketingConsent())) {
    return NextResponse.json({ skipped: "sem consentimento" }, { status: 204 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { event, eventId, eventSourceUrl } = parsed.data;

  const fbp = readCookie(request, "_fbp");
  const fbc = readCookie(request, "_fbc") ?? readCookie(request, "_fbc_pending");

  const result = await sendMetaCapiEvent({
    eventName: event,
    eventId,
    eventSourceUrl,
    actionSource: "website",
    userData: {
      fbp,
      fbc,
      clientIpAddress: clientIp(request),
      clientUserAgent: request.headers.get("user-agent"),
    },
  });

  return NextResponse.json({ ok: result.ok });
}
