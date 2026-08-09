import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageDriver, StoredFile } from "./types";

const ROOT = path.join(process.cwd(), "storage");
const META_SUFFIX = ".meta";

function resolve(key: string): string {
  const target = path.join(ROOT, key);
  if (!target.startsWith(ROOT + path.sep)) {
    throw new Error("Caminho de ficheiro inválido.");
  }
  return target;
}

async function readStreamToBuffer(filePath: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of createReadStream(filePath)) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export const localStorageDriver: StorageDriver = {
  async put({ key, body, contentType }): Promise<StoredFile> {
    const target = resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    await writeFile(`${target}${META_SUFFIX}`, contentType, "utf8");
    return {
      key,
      url: `/api/ficheiros/${key}`,
      contentType,
    };
  },

  async remove(key) {
    const target = resolve(key);
    await rm(target, { force: true });
    await rm(`${target}${META_SUFFIX}`, { force: true });
  },

  async read(key) {
    const target = resolve(key);
    try {
      await stat(target);
    } catch {
      return null;
    }
    const body = await readStreamToBuffer(target);
    let contentType = "application/octet-stream";
    try {
      contentType = (await readStreamToBuffer(`${target}${META_SUFFIX}`)).toString("utf8");
    } catch {
      // sem metadados, fica o tipo genérico
    }
    return { body, contentType };
  },
};
