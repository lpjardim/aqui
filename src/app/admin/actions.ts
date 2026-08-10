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
import { syncActiveCampaigns } from "@/lib/meta";
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

export async function updateMeta(formData: FormData) {
  await assertAdmin();

  const orderId = String(formData.get("orderId"));

  const toNullable = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value.length > 0 ? value : null;
  };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      metaCampaignId: toNullable("metaCampaignId"),
      metaAdSetId: toNullable("metaAdSetId"),
      metaAdId: toNullable("metaAdId"),
      metaAdUrl: toNullable("metaAdUrl"),
    },
  });

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
