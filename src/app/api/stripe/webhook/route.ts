import { NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { Order, User } from "@/generated/prisma/client";
import { getStripe } from "@/lib/stripe";
import { createLoginLink } from "@/lib/auth";
import { sendLoginEmail, sendInternalNotification } from "@/lib/email";
import { resumeMetaCampaign } from "@/lib/meta";

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

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function oneMonthFromNow(from: Date): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  return next;
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

  const customerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);

  const now = new Date();

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        stripePaymentIntentId: paymentIntentId,
        stripeSessionId: session.id,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      },
    }),
    // Para ONE_TIME criamos aqui o único DeliveryCycle da encomenda. Para
    // MONTHLY, o(s) ciclo(s) são criados por `invoice.paid` (1º ciclo e
    // todas as renovações) — nunca aqui, para não duplicar.
    ...(order.billingFrequency === "ONE_TIME"
      ? [
          prisma.deliveryCycle.create({
            data: {
              orderId: order.id,
              targetViews: order.visualizationsPurchased,
              startsAt: now,
              endsAt: now,
            },
          }),
        ]
      : []),
  ]);

  log("encomenda marcada como PAID", { orderId: order.id, billingFrequency: order.billingFrequency });

  after(() => notifyPaidOrder(order.id, order.userId, order.user.email));
}

/**
 * Extrai o ID da subscrição associada a uma fatura, e a `metadata` que
 * gravámos na Subscription (`subscription_data.metadata.orderId` em
 * `/api/pedido`) — disponível como snapshot imutável na própria fatura.
 */
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  if (!details?.subscription) return null;
  return typeof details.subscription === "string" ? details.subscription : details.subscription.id;
}

function orderIdFromInvoiceMetadata(invoice: Stripe.Invoice): string | null {
  return invoice.parent?.subscription_details?.metadata?.orderId ?? null;
}

type OrderWithUser = Order & { user: User };

/**
 * Resolve a `Order` associada a uma fatura de subscrição. Tenta primeiro
 * `stripeSubscriptionId` (caso normal); se ainda não estiver gravado (corrida
 * entre `checkout.session.completed` e `invoice.paid` no primeiro ciclo),
 * usa o `metadata.orderId` gravado na própria Subscription — sempre
 * disponível na fatura, mesmo antes do checkout terminar de processar.
 */
async function resolveOrderForInvoice(
  invoice: Stripe.Invoice,
): Promise<{ order: OrderWithUser; subscriptionId: string } | null> {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return null;

  let order = await prisma.order.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    include: { user: true },
  });

  if (order) return { order, subscriptionId };

  const orderId = orderIdFromInvoiceMetadata(invoice);
  if (!orderId) return null;

  order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
  if (!order) return null;

  if (!order.stripeSubscriptionId) {
    order = await prisma.order.update({
      where: { id: order.id },
      data: { stripeSubscriptionId: subscriptionId },
      include: { user: true },
    });
  }

  return { order, subscriptionId };
}

/** Mesma lógica de `resolveOrderForInvoice`, mas a partir do objeto Subscription. */
async function resolveOrderForSubscription(
  subscription: Stripe.Subscription,
): Promise<OrderWithUser | null> {
  let order = await prisma.order.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    include: { user: true },
  });

  if (order) return order;

  const orderId = subscription.metadata?.orderId;
  if (!orderId) return null;

  order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
  if (!order) return null;

  if (!order.stripeSubscriptionId) {
    order = await prisma.order.update({
      where: { id: order.id },
      data: { stripeSubscriptionId: subscription.id },
      include: { user: true },
    });
  }

  return order;
}

/**
 * Trata cada fatura paga de uma subscrição — tanto o 1º ciclo (imediatamente
 * a seguir ao checkout) como todas as renovações mensais seguintes. Cria
 * SEMPRE um novo `DeliveryCycle` com o seu próprio alvo/entrega (nunca soma
 * ao ciclo anterior), e reutiliza a mesma `metaCampaignId` da Order.
 *
 * Idempotente por `stripeInvoiceId` (coluna única): se o Stripe reenviar o
 * mesmo evento, a segunda tentativa de `create` falha com violação de
 * unicidade e é tratada como sucesso silencioso.
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const resolved = await resolveOrderForInvoice(invoice);
  if (!resolved) {
    log("invoice.paid: encomenda não encontrada para a subscrição", { invoiceId: invoice.id });
    return;
  }
  const { order } = resolved;

  if (order.billingFrequency !== "MONTHLY") {
    log("invoice.paid para encomenda não-mensal, ignorado", { orderId: order.id, invoiceId: invoice.id });
    return;
  }

  const existingCyclesCount = await prisma.deliveryCycle.count({ where: { orderId: order.id } });

  // A janela de faturação da própria fatura (`period_start`/`period_end`)
  // é o mês exato que este pagamento cobre — usamo-la directamente como
  // janela de entrega do novo ciclo, sem necessidade de estimar.
  const startsAt = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();
  const endsAt = invoice.period_end
    ? new Date(invoice.period_end * 1000)
    : oneMonthFromNow(startsAt);

  let cycle;
  try {
    cycle = await prisma.$transaction(async (tx) => {
      const created = await tx.deliveryCycle.create({
        data: {
          orderId: order.id,
          targetViews: order.visualizationsPurchased,
          startsAt,
          endsAt,
          stripeInvoiceId: invoice.id,
        },
      });
      // Cache do ciclo atual: reinicia a 0 para o novo ciclo, nunca
      // acumulando entregas de ciclos anteriores.
      await tx.order.update({ where: { id: order.id }, data: { visualizationsDelivered: 0 } });
      return created;
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      log("invoice.paid já processado (idempotente)", { invoiceId: invoice.id });
      return;
    }
    throw error;
  }

  log("novo ciclo de entrega criado", {
    orderId: order.id,
    cycleId: cycle.id,
    renovacao: existingCyclesCount > 0,
  });

  // 1º ciclo: nada a reativar (a campanha só é associada/ativada pelo fluxo
  // normal de associação Meta).
  if (existingCyclesCount === 0) return;

  await maybeReactivateForRenewal(order, cycle.id);
}

/**
 * Reativa a campanha Meta principal da Order numa renovação — só quando o
 * ciclo anterior tiver sido pausado por NÓS por ter atingido o alvo
 * (`TARGET_REACHED`). Nunca reativa se a subscrição estiver cancelada, a
 * encomenda estiver rejeitada/reembolsada, ou se a pausa anterior tiver sido
 * por outra razão operacional (nesse caso mantemos as mãos fora da
 * campanha).
 */
async function maybeReactivateForRenewal(order: OrderWithUser, newCycleId: string): Promise<void> {
  if (!order.metaCampaignId) return;
  if (order.status === "REJECTED" || order.status === "REFUNDED") return;
  if (order.subscriptionStatus === "canceled" || order.subscriptionStatus === "unpaid") return;

  const previousCycle = await prisma.deliveryCycle.findFirst({
    where: { orderId: order.id, id: { not: newCycleId } },
    orderBy: { createdAt: "desc" },
  });

  if (previousCycle?.metaPauseReason !== "TARGET_REACHED" || !previousCycle.metaPausedAt) return;

  const result = await resumeMetaCampaign(order.metaCampaignId);

  if (result.ok) {
    await prisma.deliveryCycle.update({
      where: { id: newCycleId },
      data: { metaResumedAt: new Date() },
    });
    log("campanha Meta reativada para novo ciclo", { orderId: order.id, cycleId: newCycleId });
  } else {
    await prisma.deliveryCycle.update({
      where: { id: newCycleId },
      data: { metaPauseLastError: result.error ?? "Falha ao reativar a campanha." },
    });
    logError("falha ao reativar campanha Meta na renovação", new Error(result.error ?? "erro desconhecido"), {
      orderId: order.id,
      cycleId: newCycleId,
    });
    try {
      await sendInternalNotification(
        "Falha ao reativar campanha na renovação — Aqui.",
        [
          `Encomenda: ${order.id}`,
          `Cliente: ${order.user.companyName} (${order.user.email})`,
          `Meta Campaign ID: ${order.metaCampaignId}`,
          `Erro: ${result.error ?? "desconhecido"}`,
        ].join("\n"),
      );
    } catch (notifyError) {
      logError("falha ao enviar notificação interna de falha de reativação", notifyError, {
        orderId: order.id,
      });
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const resolved = await resolveOrderForInvoice(invoice);
  if (!resolved) {
    log("invoice.payment_failed: encomenda não encontrada para a subscrição", { invoiceId: invoice.id });
    return;
  }
  const { order } = resolved;

  await prisma.order.update({
    where: { id: order.id },
    data: { subscriptionStatus: "past_due" },
  });

  log("pagamento mensal falhou", { orderId: order.id, invoiceId: invoice.id });

  try {
    await sendInternalNotification(
      "Pagamento mensal falhou — Aqui.",
      [
        `Encomenda: ${order.id}`,
        `Cliente: ${order.user.companyName} (${order.user.email})`,
        `Fatura Stripe: ${invoice.id}`,
      ].join("\n"),
    );
  } catch (error) {
    logError("falha ao enviar notificação interna de pagamento falhado", error, { orderId: order.id });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const order = await resolveOrderForSubscription(subscription);
  if (!order) {
    log("customer.subscription.updated: encomenda não encontrada", { subscriptionId: subscription.id });
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      subscriptionStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  log("subscrição atualizada", {
    orderId: order.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

/**
 * A subscrição terminou/foi cancelada definitivamente. O ciclo atual
 * (já pago) continua a entregar normalmente até ao alvo — só deixa de haver
 * renovação seguinte, por isso não tocamos em `DeliveryCycle` nem na Meta.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const order = await resolveOrderForSubscription(subscription);
  if (!order) {
    log("customer.subscription.deleted: encomenda não encontrada", { subscriptionId: subscription.id });
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { subscriptionStatus: "canceled" },
  });

  log("subscrição cancelada/terminada", { orderId: order.id });
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
      case "invoice.paid": {
        await handleInvoicePaid(event.data.object);
        break;
      }
      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(event.data.object);
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object);
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
