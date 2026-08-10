import { prisma } from "@/lib/prisma";
import { sendInternalNotification } from "@/lib/email";
import type { Order, User } from "@/generated/prisma/client";

/**
 * Ponto de integração com a Meta Marketing API (Ads Insights).
 *
 * Ainda NÃO implementado: requer OAuth/credenciais Meta (System User token
 * ou Business Login), fora do âmbito desta tarefa. Quando existir, substituir
 * este stub por um pedido real à Graph API, por exemplo:
 *
 *   GET /{metaAdId}/insights?fields=impressions
 *
 * e mapear o campo relevante (impressions/reach/video_views, a decidir
 * consoante o objetivo de campanha) para o número de visualizações entregues.
 */
export async function fetchMetaDeliveredViews(metaAdId: string): Promise<number> {
  void metaAdId;
  throw new Error(
    "Integração com a Meta Marketing API ainda não implementada (faltam credenciais/OAuth).",
  );
}

/**
 * Aplica um novo valor de visualizações entregues a uma encomenda: regista o
 * histórico (CampaignUpdate) e, se o alvo for atingido pela primeira vez,
 * guarda `targetReachedAt` e envia uma notificação interna por email.
 *
 * Não pausa nem altera o `status` da campanha automaticamente — isso
 * continua a ser uma decisão manual da equipa.
 *
 * Pensada para ser chamada tanto por uma futura sincronização automática
 * (`syncActiveCampaigns`) como por qualquer atualização manual futura.
 */
export async function applyDeliveredViews(orderId: string, delivered: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) return null;

  const value = Math.min(Math.max(Math.round(delivered), 0), order.visualizationsPurchased);
  const justReachedTarget =
    !order.targetReachedAt && value >= order.visualizationsPurchased && order.visualizationsPurchased > 0;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.order.update({
      where: { id: orderId },
      data: {
        visualizationsDelivered: value,
        ...(justReachedTarget ? { targetReachedAt: new Date() } : {}),
      },
    });
    await tx.campaignUpdate.create({
      data: { orderId, visualizationsDelivered: value },
    });
    return next;
  });

  if (justReachedTarget) {
    await notifyTargetReached(order.user, updated);
  }

  return updated;
}

async function notifyTargetReached(user: User, order: Order): Promise<void> {
  try {
    await sendInternalNotification(
      `Alvo atingido — ${user.companyName}`,
      [
        `A campanha de ${user.companyName} (${user.email}) atingiu o número de visualizações compradas.`,
        "",
        `Zona: ${order.zone}`,
        `Compradas: ${order.visualizationsPurchased}`,
        `Entregues: ${order.visualizationsDelivered}`,
        order.metaAdId ? `Meta Ad ID: ${order.metaAdId}` : null,
        "",
        "A campanha NÃO foi pausada automaticamente — confirmar próximos passos manualmente no /admin.",
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    );
  } catch (error) {
    console.error("[meta] falha ao enviar notificação interna de alvo atingido", error);
  }
}

/**
 * Pensado como ponto de entrada para um futuro job/cron: percorre campanhas
 * ativas com `metaAdId` definido, consulta a Meta e aplica o valor devolvido.
 * Hoje falha propositadamente em `fetchMetaDeliveredViews` (sem credenciais).
 */
export async function syncActiveCampaigns(): Promise<
  { orderId: string; ok: boolean; error?: string }[]
> {
  const orders = await prisma.order.findMany({
    where: { status: "ACTIVE", metaAdId: { not: null } },
  });

  const results: { orderId: string; ok: boolean; error?: string }[] = [];

  for (const order of orders) {
    try {
      const delivered = await fetchMetaDeliveredViews(order.metaAdId!);
      await applyDeliveredViews(order.id, delivered);
      results.push({ orderId: order.id, ok: true });
    } catch (error) {
      console.error("[meta] falha ao sincronizar encomenda", order.id, error);
      results.push({
        orderId: order.id,
        ok: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  return results;
}
