import { NextResponse } from "next/server";
import { MAX_FILE_SIZE, isAcceptedMimeType } from "@/lib/assets";
import { buildAssetKey, storage } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ficheiro em falta." }, { status: 400 });
  }

  if (!isAcceptedMimeType(file.type)) {
    return NextResponse.json(
      { error: "Formato não aceite. Use JPG, PNG, WEBP ou MP4." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Ficheiro demasiado grande (máximo 25 MB)." }, { status: 400 });
  }

  const stored = await storage.put({
    key: buildAssetKey(file.type),
    body: Buffer.from(await file.arrayBuffer()),
    contentType: file.type,
  });

  return NextResponse.json({ url: stored.url, fileType: file.type });
}
