import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";

/** Serve ficheiros do driver de disco local (desenvolvimento). */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const file = await storage.read(key.join("/"));

  if (!file) {
    return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
