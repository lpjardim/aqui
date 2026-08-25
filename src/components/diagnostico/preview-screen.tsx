"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Close, Plus } from "@/components/icons";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  buildAssetPathname,
  isAcceptedMimeType,
} from "@/lib/assets";
import { DiagnosticAdPreviewMockups } from "@/components/pedido/ad-preview-mockups";
import { trackDiagnosticEvent } from "@/lib/diagnostic-tracking";
import { suggestPreviewHeadline } from "@/lib/diagnostic/copy";
import type { BusinessGoal } from "@/lib/diagnostic/questions";

type AssetStatus = "uploading" | "done" | "error";

type PreviewAssetState = {
  file: File;
  previewUrl: string;
  fileType: string;
  status: AssetStatus;
  progress: number;
  error?: string;
  url?: string;
};

export type PreviewData = {
  businessName: string;
  headline: string;
  link: string;
  asset: { url: string; fileType: string } | null;
};

/**
 * Upload de um único ficheiro — versão simplificada de `uploadFile` em
 * `order-form.tsx` (aqui só é preciso 1 ficheiro, não até 5), mas usa o
 * mesmo storage/driver e a mesma validação de `src/lib/assets.ts`.
 */
async function uploadSingleFile(
  file: File,
  onProgress: (percentage: number) => void,
  signal: AbortSignal,
): Promise<{ url: string }> {
  if (process.env.NEXT_PUBLIC_STORAGE_DRIVER === "vercel-blob") {
    const { upload } = await import("@vercel/blob/client");
    const pathname = buildAssetPathname(file.type);

    const blob = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/blob/upload",
      contentType: file.type,
      clientPayload: JSON.stringify({ count: 1 }),
      abortSignal: signal,
      onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
    });

    return { url: blob.url };
  }

  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/uploads", { method: "POST", body, signal });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Falha no upload.");
  }

  onProgress(100);
  return { url: data.url as string };
}

export function PreviewScreen({
  diagnosticId,
  businessGoal,
  zone,
  onBack,
  onContinue,
}: {
  diagnosticId: string;
  businessGoal: BusinessGoal;
  zone: string;
  onBack: () => void;
  onContinue: (data: PreviewData) => void;
}) {
  useEffect(() => {
    trackDiagnosticEvent("preview_started", diagnosticId);
    // Só reportar uma vez, na chegada a este ecrã.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [businessName, setBusinessName] = useState("");
  const [headline, setHeadline] = useState("");
  const [link, setLink] = useState("");
  const [asset, setAsset] = useState<PreviewAssetState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortController = useRef<AbortController | null>(null);

  const runUpload = useCallback((file: File) => {
    const controller = new AbortController();
    abortController.current = controller;

    uploadSingleFile(
      file,
      (progress) => setAsset((current) => (current ? { ...current, progress } : current)),
      controller.signal,
    )
      .then(({ url }) => {
        setAsset((current) =>
          current ? { ...current, status: "done", progress: 100, url } : current,
        );
      })
      .catch((uploadError) => {
        if (controller.signal.aborted) return;
        setAsset((current) =>
          current
            ? {
                ...current,
                status: "error",
                error: uploadError instanceof Error ? uploadError.message : "Falha no upload.",
              }
            : current,
        );
      });
  }, []);

  function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);

    if (!isAcceptedMimeType(file.type)) {
      setError("Formato não aceite. Use JPG, PNG, WEBP ou MP4.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`Ficheiro demasiado grande (máximo ${MAX_FILE_SIZE_MB} MB).`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (asset) URL.revokeObjectURL(asset.previewUrl);

    const nextAsset: PreviewAssetState = {
      file,
      previewUrl: URL.createObjectURL(file),
      fileType: file.type,
      status: "uploading",
      progress: 0,
    };
    setAsset(nextAsset);
    runUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAsset() {
    abortController.current?.abort();
    if (asset) URL.revokeObjectURL(asset.previewUrl);
    setAsset(null);
  }

  function fillSuggestedHeadline() {
    setHeadline(suggestPreviewHeadline({ businessName, businessGoal, zone }));
  }

  function handleContinue() {
    if (businessName.trim().length < 2) {
      setError("Indique o nome do seu negócio.");
      return;
    }
    if (asset?.status === "uploading") {
      setError("Aguarde a conclusão do envio.");
      return;
    }

    trackDiagnosticEvent("preview_completed", diagnosticId, {
      hasAsset: asset?.status === "done",
      hasCustomHeadline: headline.trim().length > 0,
    });

    onContinue({
      businessName: businessName.trim(),
      headline: headline.trim(),
      link: link.trim(),
      asset:
        asset?.status === "done" && asset.url ? { url: asset.url, fileType: asset.fileType } : null,
    });
  }

  const previewAssetsForMockup =
    asset?.status === "done" && asset.url
      ? [{ previewUrl: asset.previewUrl, fileType: asset.fileType }]
      : [];

  return (
    <section>
      <h1 className="text-[26px] font-black leading-tight sm:text-[32px]">
        Veja como o seu negócio pode aparecer
      </h1>
      <p className="mt-3 text-[15px] text-muted">
        Preencha estes dados e mostramos-lhe uma pré-visualização real do anúncio.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <label className="block text-[13px] font-semibold" htmlFor="business-name">
            Nome do negócio
          </label>
          <input
            id="business-name"
            type="text"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Ex.: Café Central"
            className="mt-2 h-13 w-full rounded-md border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold">Foto ou vídeo (opcional)</label>
          <p className="mt-1 text-[13px] text-muted">
            Torna a pré-visualização real. Pode continuar sem enviar nada.
          </p>

          <div className="mt-3">
            {asset ? (
              <div className="relative aspect-square w-32 overflow-hidden rounded-md border border-line bg-surface">
                {asset.fileType.startsWith("video/") ? (
                  <video src={asset.previewUrl} className="size-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.previewUrl} alt="" className="size-full object-cover" />
                )}
                {asset.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/55 text-[12px] font-bold text-white">
                    {asset.progress}%
                  </div>
                )}
                {asset.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-strong/85 p-1 text-center text-[11px] text-white">
                    {asset.error}
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeAsset}
                  aria-label="Remover ficheiro"
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/80 text-white hover:bg-ink"
                >
                  <Close className="size-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="grid aspect-square w-32 place-items-center rounded-md border border-dashed border-line-strong text-muted transition-colors hover:border-ink hover:text-ink"
              >
                <Plus className="size-6" />
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(event) => handleFile(event.target.files)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-[13px] font-semibold" htmlFor="headline">
              Texto do anúncio
            </label>
            <button
              type="button"
              onClick={fillSuggestedHeadline}
              className="text-[12px] font-semibold text-red-strong underline underline-offset-2"
            >
              Sugira o texto por mim
            </button>
          </div>
          <textarea
            id="headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            rows={2}
            placeholder="Ex.: Café Central está em Lisboa. Venha conhecer."
            className="mt-2 w-full resize-none rounded-md border border-line-strong bg-white px-4 py-3 text-[15px] outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="block text-[13px] font-semibold" htmlFor="link">
            Link (Instagram, site — ou deixe em branco)
          </label>
          <input
            id="link"
            type="text"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="instagram.com/o-seu-negocio"
            className="mt-2 h-13 w-full rounded-md border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-ink"
          />
        </div>
      </div>

      {previewAssetsForMockup.length > 0 ? (
        <DiagnosticAdPreviewMockups
          assets={previewAssetsForMockup}
          brandName={businessName}
          tagline={headline || "O seu texto aparece aqui."}
        />
      ) : (
        <p className="mt-8 rounded-md border border-line bg-surface p-5 text-center text-[13px] text-muted">
          Envie uma foto ou vídeo para ver uma pré-visualização real do anúncio.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-md bg-red-strong/[0.06] px-4 py-3 text-[14px] text-red-strong"
        >
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button variant="ghost" size="lg" onClick={onBack}>
          Voltar
        </Button>
        <Button size="lg" className="sm:min-w-44" onClick={handleContinue}>
          Continuar
        </Button>
      </div>
    </section>
  );
}
