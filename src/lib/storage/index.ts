import { buildAssetPathname } from "@/lib/assets";
import { localStorageDriver } from "./local";
import { vercelBlobDriver } from "./vercel-blob";
import type { StorageDriver } from "./types";

export type { StorageDriver, StoredFile } from "./types";

export function buildAssetKey(contentType: string): string {
  return buildAssetPathname(contentType);
}

export function buildProofKey(orderId: string): string {
  return `comprovativos/${orderId}/${crypto.randomUUID()}.pdf`;
}

export const storage: StorageDriver =
  process.env.STORAGE_DRIVER === "vercel-blob" ? vercelBlobDriver : localStorageDriver;
