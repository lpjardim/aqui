import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { createLoginLink } from "@/lib/auth";
import { sendLoginEmail } from "@/lib/email";

export const runtime = "nodejs";

async function markAsPaid(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order || order.status !== "PENDING_PAYMENT") return;

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

  const link = await createLoginLink(order.userId, `/painel/campanhas/${order.id}`);
  await sendLoginEmail(order.user.email, link);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assinatura inválida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Multibanco e MB WAY podem confirmar mais tarde.
      if (session.payment_status === "paid") {
        await markAsPaid(session);
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
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: paymentIntentId },
          data: { status: "REFUNDED" },
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
