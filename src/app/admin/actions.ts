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

export async function updateDelivered(formData: FormData) {
  await assertAdmin();

  const orderId = String(formData.get("orderId"));
  const delivered = Number(formData.get("delivered"));

  if (!Number.isFinite(delivered) || delivered < 0) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const value = Math.min(delivered, order.visualizationsPurchased);

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { visualizationsDelivered: value },
    }),
    prisma.campaignUpdate.create({
      data: { orderId, visualizationsDelivered: value },
    }),
  ]);

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
