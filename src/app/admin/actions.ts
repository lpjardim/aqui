"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  checkAdminPassword,
  createAdminSession,
  destroyAdminSession,
  isAdmin,
} from "@/lib/auth";
import { buildProofKey, storage } from "@/lib/storage";
import {
  associateOrderWithCampaign,
  findMetaCampaignsByExactName,
  syncActiveCampaigns,
  type MetaCampaignMatch,
} from "@/lib/meta";
import { getExpectedMetaCampaignName } from "@/lib/orders";
import type { OrderStatus } from "@/generated/prisma/enums";

const STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PAID",
  "IN_REVIEW",
  "ACTIVE",
  "COMPLETED",
  "REJECTED",
  "REFUNDED",
];

export type AdminLoginState = { error: string | null };

export async function adminLogin(
  _previous: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const password = String(formData.get("password") ?? "");

  if (!checkAdminPassword(password)) {
    return { error: "Password incorreta." };
  }

  await createAdminSession();
  revalidatePath("/admin");
  return { error: null };
}

export async function adminLogout() {
  await destroyAdminSession();
  revalidatePath("/admin");
}

async function assertAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Sem autorização.");
  }
}

export async function updateStatus(formData: FormData) {
  await assertAdmin();

  const orderId = String(formData.get("orderId"));
  const status = String(formData.get("status")) as OrderStatus;

  if (!STATUSES.includes(status)) return;

  await prisma.order.update({ where: { id: orderId }, data: { status } });
  revalidatePath("/admin");
}

export type AssociateMetaState = {
  status: "idle" | "associated" | "not_found" | "multiple" | "error";
  message: string | null;
  matches: MetaCampaignMatch[];
};

/**
 * Tenta encontrar, pelo nome esperado (`getExpectedMetaCampaignName`), a
 * campanha Meta correspondente a esta encomenda e associá-la automaticamente.
 * Só associa quando há exatamente 1 correspondência exata — 0 ou várias
 * ficam para decisão manual (ver `confirmMetaCampaign`).
 */
export async function associateMetaCampaign(
  _previous: AssociateMetaState,
  formData: FormData,
): Promise<AssociateMetaState> {
  await assertAdmin();

  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) {
    return { status: "error", message: "Encomenda não encontrada.", matches: [] };
  }

  try {
    const expectedName = getExpectedMetaCampaignName(order);
    const matches = await findMetaCampaignsByExactName(expectedName);

    if (matches.length === 0) {
      return { status: "not_found", message: "Campanha ainda não encontrada na Meta.", matches: [] };
    }

    if (matches.length > 1) {
      return {
        status: "multiple",
        message: `Foram encontradas ${matches.length} campanhas com este nome exato. Escolha manualmente:`,
        matches,
      };
    }

    await associateOrderWithCampaign(order.id, matches[0].id);
    revalidatePath("/admin");
    return { status: "associated", message: "Campanha associada com sucesso.", matches: [] };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Erro desconhecido ao associar.",
      matches: [],
    };
  }
}

/** Associação manual quando `associateMetaCampaign` encontrou mais de 1 correspondência. */
export async function confirmMetaCampaign(formData: FormData) {
  await assertAdmin();

  const orderId = String(formData.get("orderId") ?? "");
  const campaignId = String(formData.get("campaignId") ?? "");
  if (!orderId || !campaignId) return;

  await associateOrderWithCampaign(orderId, campaignId);
  revalidatePath("/admin");
}

export async function markCompleted(formData: FormData) {
  await assertAdmin();

  const orderId = String(formData.get("orderId"));
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
        visualizationsDelivered: order.visualizationsPurchased,
      },
    }),
    prisma.campaignUpdate.create({
      data: { orderId, visualizationsDelivered: order.visualizationsPurchased },
    }),
  ]);

  revalidatePath("/admin");
}

export type MetaSyncState = { message: string | null; error: string | null };

export async function syncMetaNow(
  _previous: MetaSyncState,
  _formData: FormData,
): Promise<MetaSyncState> {
  await assertAdmin();

  try {
    const results = await syncActiveCampaigns();
    revalidatePath("/admin");

    if (results.length === 0) {
      return { message: "Sem encomendas elegíveis para sincronizar.", error: null };
    }

    const ok = results.filter((result) => result.ok).length;
    const failed = results.length - ok;

    return {
      message: `Sincronização concluída: ${ok} atualizada(s), ${failed} com falha.`,
      error:
        failed > 0
          ? "Algumas encomendas falharam — ver logs do servidor para detalhe."
          : null,
    };
  } catch (error) {
    return {
      message: null,
      error: error instanceof Error ? error.message : "Erro desconhecido ao sincronizar.",
    };
  }
}

export type DeleteOrderState = { error: string | null };

/**
 * Elimina definitivamente uma encomenda — só permitido para encomendas em
 * "Aguarda pagamento" (testes ou pedidos nunca pagos). Encomendas pagas,
 * ativas, concluídas ou reembolsadas nunca podem ser eliminadas por aqui.
 *
 * Asset e CampaignUpdate são apagados automaticamente pela BD
 * (onDelete: Cascade no schema), garantindo integridade referencial.
 */
export async function deleteOrder(
  _previous: DeleteOrderState,
  formData: FormData,
): Promise<DeleteOrderState> {
  await assertAdmin();

  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    return { error: "Encomenda inválida." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) {
    return { error: "Encomenda não encontrada." };
  }

  if (order.status !== "PENDING_PAYMENT") {
    return {
      error:
        'Só é possível eliminar encomendas em estado "Aguarda pagamento". Esta já avançou no fluxo.',
    };
  }

  // `deleteMany` com o estado no `where` torna a verificação e a eliminação
  // atómicas: se o estado tiver mudado entre a leitura acima e esta escrita,
  // nada é apagado.
  const result = await prisma.order.deleteMany({
    where: { id: orderId, status: "PENDING_PAYMENT" },
  });

  if (result.count === 0) {
    return { error: "A encomenda já não está elegível para eliminação. Recarregue a página." };
  }

  revalidatePath("/admin");
  return { error: null };
}

export async function uploadProof(formData: FormData) {
  await assertAdmin();

  const orderId = String(formData.get("orderId"));
  const file = formData.get("proof");

  if (!(file instanceof File) || file.size === 0) return;

  const stored = await storage.put({
    key: buildProofKey(orderId),
    body: Buffer.from(await file.arrayBuffer()),
    contentType: file.type || "application/pdf",
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { proofUrl: stored.url },
  });

  revalidatePath("/admin");
}
