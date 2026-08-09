export const MAX_ASSETS = 5;
export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = Math.round(MAX_FILE_SIZE / (1024 * 1024));

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
] as const;

export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

export const ACCEPT_ATTRIBUTE = ACCEPTED_MIME_TYPES.join(",");

export function isAcceptedMimeType(type: string): type is AcceptedMimeType {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(type);
}

const EXTENSION_BY_MIME: Record<AcceptedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

/**
 * Gera um pathname único para o asset (ex.: `assets/<uuid>.jpg`).
 *
 * Corre tanto no browser (antes do upload directo para o Blob) como no
 * servidor (driver de disco local), por isso usa apenas `crypto.randomUUID`,
 * disponível em ambos os ambientes.
 */
export function buildAssetPathname(contentType: string): string {
  const extension = isAcceptedMimeType(contentType) ? EXTENSION_BY_MIME[contentType] : "bin";
  return `assets/${crypto.randomUUID()}.${extension}`;
}
