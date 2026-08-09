import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Serve os assets privados do Blob ao painel de admin. O Blob Store fica
 * privado (`access: "private"`); só quem autentica aqui como admin consegue
 * ler o conteúdo — a URL guardada na base de dados não é acessível directamente.
 */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Sem autorização." }, { status: 401 });
  }

  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL em falta." }, { status: 400 });
  }

  const result = await get(url, { access: "private" });

  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json({ error: "Ficheiro não encontrado." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
    },
  });
}
