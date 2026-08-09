import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ACCEPTED_MIME_TYPES, MAX_ASSETS, MAX_FILE_SIZE } from "@/lib/assets";

export const runtime = "nodejs";

type ClientPayload = { count?: number };

/**
 * Emite tokens de upload directo para o Blob (o ficheiro vai do browser
 * direto para o Vercel Blob, sem passar pelo body desta função). Usado
 * apenas quando STORAGE_DRIVER = "vercel-blob".
 *
 * O BLOB_READ_WRITE_TOKEN nunca é enviado ao cliente: fica no servidor e é
 * usado só para assinar o token de curta duração que o `handleUpload` gera.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith("assets/")) {
          throw new Error("Caminho de ficheiro inválido.");
        }

        let count = 0;
        if (clientPayload) {
          try {
            count = (JSON.parse(clientPayload) as ClientPayload).count ?? 0;
          } catch {
            throw new Error("Dados de upload inválidos.");
          }
        }

        if (count < 1 || count > MAX_ASSETS) {
          throw new Error(`Pode enviar no máximo ${MAX_ASSETS} ficheiros por pedido.`);
        }

        return {
          allowedContentTypes: [...ACCEPTED_MIME_TYPES],
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // O registo do asset é feito quando a encomenda é criada em /api/pedido.
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
