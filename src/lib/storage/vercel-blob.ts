import { del, put } from "@vercel/blob";
import type { StorageDriver, StoredFile } from "./types";

export const vercelBlobDriver: StorageDriver = {
  async put({ key, body, contentType }): Promise<StoredFile> {
    const blob = await put(key, body, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return { key, url: blob.url, contentType };
  },

  async remove(key) {
    await del(key);
  },

  async read() {
    return null;
  },
};
