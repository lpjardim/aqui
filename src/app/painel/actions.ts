"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export type CancelRenewalState = { error: string | null; message: string | null };

/**
 * "Cancelar renovação" — nunca corta a entrega já paga: o ciclo atual
 * continua normalmente até ao alvo. Só marca `cancel_at_period_end=true` na
 * Stripe (e espelha na Order), para simplesmente não haver renovação no mês
 * seguinte.
 */
export async function cancelRenewal(
  _previous: CancelRenewalState,
  formData: FormData,
): Promise<CancelRenewalState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });

  if (!order) {
    return { error: "Campanha não encontrada.", message: null };
  }

  if (order.billingFrequency !== "MONTHLY" || !order.stripeSubscriptionId) {
    return { error: "Esta campanha não tem uma renovação mensal ativa.", message: null };
  }

  if (order.cancelAtPeriodEnd) {
    return { error: null, message: "A renovação já estava cancelada." };
  }

  try {
    if (isStripeConfigured()) {
      await getStripe().subscriptions.update(order.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Não foi possível cancelar a renovação.",
      message: null,
    };
  }

  await prisma.order.update({ where: { id: order.id }, data: { cancelAtPeriodEnd: true } });
  revalidatePath(`/painel/campanhas/${order.id}`);

  return {
    error: null,
    message: "Renovação cancelada. O ciclo atual continua a decorrer normalmente.",
  };
}
