export const MAX_ASSETS = 5;
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_MIME_TYPES.join(",");

export function isAcceptedMimeType(type: string): boolean {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(type);
}
