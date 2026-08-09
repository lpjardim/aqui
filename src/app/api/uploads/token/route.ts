import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/assets";

export const runtime = "nodejs";

/**
 * Usado apenas quando STORAGE_DRIVER = "vercel-blob": o browser envia o
 * ficheiro directamente para o Blob, evitando o limite de tamanho dos pedidos.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [...ACCEPTED_MIME_TYPES],
        maximumSizeInBytes: MAX_FILE_SIZE,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // O registo do asset é feito quando a encomenda é criada.
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha no upload." },
      { status: 400 },
    );
  }
}
