import { randomUUID } from "node:crypto";
import { localStorageDriver } from "./local";
import { vercelBlobDriver } from "./vercel-blob";
import type { StorageDriver } from "./types";

export type { StorageDriver, StoredFile } from "./types";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

export function buildAssetKey(contentType: string): string {
  const extension = EXTENSIONS[contentType] ?? "bin";
  return `assets/${randomUUID()}.${extension}`;
}

export function buildProofKey(orderId: string): string {
  return `comprovativos/${orderId}/${randomUUID()}.pdf`;
}

export const storage: StorageDriver =
  process.env.STORAGE_DRIVER === "vercel-blob" ? vercelBlobDriver : localStorageDriver;
