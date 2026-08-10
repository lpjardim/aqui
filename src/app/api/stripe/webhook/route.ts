import { NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createLoginLink } from "@/lib/auth";
import { sendLoginEmail } from "@/lib/email";

export const runtime = "nodejs";

const LOG_PREFIX = "[stripe:webhook]";

/** Logs só com IDs/estados — nunca segredos, tokens, emails ou outros dados pessoais. */
function log(message: string, data?: Record<string, unknown>) {
  console.log(LOG_PREFIX, message, data ? JSON.stringify(data) : "");
}

function logError(message: string, error: unknown, data?: Record<string, unknown>) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(LOG_PREFIX, message, JSON.stringify({ ...data, error: detail }));
}

/**
 * Gera o magic link e envia o email depois da resposta ao Stripe já ter sido
 * enviada (via `after`). A encomenda já está PAID nesse ponto — uma falha
 * aqui (ex.: Resend em baixo) fica registada nos logs mas não faz o Stripe
 * marcar esta entrega como falhada nem repetir o webhook indefinidamente.
 */
async function notifyPaidOrder(orderId: string, userId: string, email: string) {
  try {
    const link = await createLoginLink(userId, `/painel/campanhas/${orderId}`);
    await sendLoginEmail(email, link);
    log("magic link enviado", { orderId });
  } catch (error) {
    logError("falha ao enviar magic link", error, { orderId });
  }
}

async function markAsPaid(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId ?? session.client_reference_id;

  if (!orderId) {
    log("sessão sem orderId em metadata/client_reference_id", { sessionId: session.id });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) {
    log("encomenda não encontrada", { orderId, sessionId: session.id });
    return;
  }

  if (order.status !== "PENDING_PAYMENT") {
    log("encomenda já estava processada, ignorado", { orderId, status: order.status });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      stripePaymentIntentId: paymentIntentId,
      stripeSessionId: session.id,
    },
  });

  log("encomenda marcada como PAID", { orderId: order.id });

  after(() => notifyPaidOrder(order.id, order.userId, order.user.email));
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    log("pedido rejeitado: falta stripe-signature ou STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 400 });
  }

  // Tem de ser o corpo em bruto (string), exactamente como chegou da Stripe.
  // Nunca fazer JSON.parse/`.json()` antes disto — muda os bytes e invalida a assinatura.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    logError("assinatura inválida", error);
    return NextResponse.json({ error: "Assinatura Stripe inválida." }, { status: 400 });
  }

  log("evento recebido", { id: event.id, type: event.type });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Multibanco e MB WAY podem confirmar mais tarde, via async_payment_succeeded.
        if (session.payment_status === "paid") {
          await markAsPaid(session);
        } else {
          log("checkout.session.completed sem pagamento confirmado ainda", {
            sessionId: session.id,
            paymentStatus: session.payment_status,
          });
        }
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        await markAsPaid(event.data.object);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (paymentIntentId) {
          const result = await prisma.order.updateMany({
            where: { stripePaymentIntentId: paymentIntentId },
            data: { status: "REFUNDED" },
          });
          log("reembolso processado", { paymentIntentId, encomendasAtualizadas: result.count });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    logError("falha a processar evento", error, { id: event.id, type: event.type });
    return NextResponse.json({ error: "Falha a processar o evento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
