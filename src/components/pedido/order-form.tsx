"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, Close, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { PACKS, getPack, type PackId } from "@/lib/packs";
import { formatNumber, formatPrice } from "@/lib/format";
import { NATIONAL_ZONE, ZONES } from "@/lib/zones";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ASSETS,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  buildAssetPathname,
  isAcceptedMimeType,
} from "@/lib/assets";
import { track } from "@/lib/analytics";

const TOTAL_STEPS = 5;

type AssetStatus = "uploading" | "done" | "error";

type AssetItem = {
  id: string;
  file: File;
  previewUrl: string;
  fileType: string;
  status: AssetStatus;
  progress: number;
  error?: string;
  url?: string;
  pathname?: string;
};

const STEP_TITLES = [
  "Onde quer aparecer?",
  "Envie as suas fotos ou vídeos",
  "Quantas visualizações quer?",
  "Os seus dados",
  "Resumo",
];

/**
 * `position` é o número de ordem deste ficheiro dentro do pedido (1..MAX_ASSETS).
 * É enviado ao `handleUpload` como validação adicional do lado do servidor.
 */
async function uploadFile(
  file: File,
  position: number,
  onProgress: (percentage: number) => void,
  signal: AbortSignal,
): Promise<{ url: string; pathname: string }> {
  if (process.env.NEXT_PUBLIC_STORAGE_DRIVER === "vercel-blob") {
    const { upload } = await import("@vercel/blob/client");
    const pathname = buildAssetPathname(file.type);

    // O ficheiro vai directamente do browser para o Blob Store (privado);
    // nunca passa pelo body desta função Vercel.
    const blob = await upload(pathname, file, {
      access: "private",
      handleUploadUrl: "/api/blob/upload",
      contentType: file.type,
      clientPayload: JSON.stringify({ count: position }),
      abortSignal: signal,
      onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
    });

    return { url: blob.url, pathname: blob.pathname };
  }

  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/uploads", { method: "POST", body, signal });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Falha no upload.");
  }

  onProgress(100);
  return { url: data.url as string, pathname: (data.pathname as string | undefined) ?? "" };
}

export function OrderForm({ initialPack }: { initialPack: PackId | null }) {
  const [step, setStep] = useState(1);
  const [zone, setZone] = useState("");
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [packId, setPackId] = useState<PackId | null>(initialPack);
  const [contact, setContact] = useState({ name: "", companyName: "", email: "", phone: "" });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef(new Map<string, AbortController>());
  const pack = useMemo(() => getPack(packId), [packId]);

  const doneAssets = useMemo(() => assets.filter((asset) => asset.status === "done"), [assets]);
  const hasPendingUploads = useMemo(
    () => assets.some((asset) => asset.status === "uploading"),
    [assets],
  );

  const runUpload = useCallback((item: AssetItem, position: number) => {
    const controller = new AbortController();
    abortControllers.current.set(item.id, controller);

    uploadFile(
      item.file,
      position,
      (percentage) => {
        setAssets((current) =>
          current.map((asset) => (asset.id === item.id ? { ...asset, progress: percentage } : asset)),
        );
      },
      controller.signal,
    )
      .then(({ url, pathname }) => {
        setAssets((current) =>
          current.map((asset) =>
            asset.id === item.id
              ? { ...asset, status: "done", progress: 100, url, pathname }
              : asset,
          ),
        );
      })
      .catch((uploadError) => {
        if (controller.signal.aborted) return;
        setAssets((current) =>
          current.map((asset) =>
            asset.id === item.id
              ? {
                  ...asset,
                  status: "error",
                  error: uploadError instanceof Error ? uploadError.message : "Falha no upload.",
                }
              : asset,
          ),
        );
      })
      .finally(() => {
        abortControllers.current.delete(item.id);
      });
  }, []);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      setError(null);

      const room = MAX_ASSETS - assets.length;
      const incoming = Array.from(fileList).slice(0, room);

      if (incoming.length === 0) {
        setError(`Pode enviar no máximo ${MAX_ASSETS} ficheiros.`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const invalidType = incoming.find((file) => !isAcceptedMimeType(file.type));
      if (invalidType) {
        setError(`"${invalidType.name}" não é um formato aceite. Use JPG, PNG, WEBP ou MP4.`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const tooLarge = incoming.find((file) => file.size > MAX_FILE_SIZE);
      if (tooLarge) {
        setError(`"${tooLarge.name}" é demasiado grande (máximo ${MAX_FILE_SIZE_MB} MB).`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const startPosition = assets.length;
      const items: AssetItem[] = incoming.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        fileType: file.type,
        status: "uploading",
        progress: 0,
      }));

      setAssets((current) => [...current, ...items]);
      items.forEach((item, index) => runUpload(item, startPosition + index + 1));

      if (inputRef.current) inputRef.current.value = "";
    },
    [assets.length, runUpload],
  );

  function removeAsset(id: string) {
    abortControllers.current.get(id)?.abort();
    abortControllers.current.delete(id);

    setAssets((current) => {
      const target = current.find((asset) => asset.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((asset) => asset.id !== id);
    });
  }

  function retryAsset(id: string) {
    const target = assets.find((asset) => asset.id === id);
    if (!target) return;

    setAssets((current) =>
      current.map((asset) =>
        asset.id === id ? { ...asset, status: "uploading", progress: 0, error: undefined } : asset,
      ),
    );
    runUpload(target, assets.indexOf(target) + 1);
  }

  function validateStep(): string | null {
    if (step === 1 && !zone) return "Escolha a zona onde quer aparecer.";
    if (step === 2 && doneAssets.length === 0) return "Envie pelo menos uma foto ou vídeo.";
    if (step === 2 && hasPendingUploads) return "Aguarde a conclusão dos uploads.";
    if (step === 3 && !packId) return "Escolha as visualizações que quer comprar.";
    if (step === 4) {
      if (contact.name.trim().length < 2) return "Indique o seu nome.";
      if (contact.companyName.trim().length < 2) return "Indique o nome da empresa.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) return "Email inválido.";
      if (contact.phone.trim().length < 6) return "Indique um telefone válido.";
    }
    return null;
  }

  function next() {
    const validation = validateStep();
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    track({ name: "pedido_passo_concluido", step });
    setStep((current) => Math.min(TOTAL_STEPS, current + 1));
  }

  function back() {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  async function submit() {
    if (!pack) return;
    if (hasPendingUploads) {
      setError("Aguarde a conclusão dos uploads.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone,
          packId: pack.id,
          // Só pathname/url/tipo do ficheiro chegam ao pedido — nada de blob
          // metadata extra nem o conteúdo do ficheiro em si.
          assets: doneAssets.map(({ url, fileType }) => ({ url, fileType })),
          ...contact,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível continuar para o pagamento.");
      }

      window.location.href = data.url;
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Não foi possível continuar.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>
          Passo {step} de {TOTAL_STEPS}
        </span>
        <span>{STEP_TITLES[step - 1]}</span>
      </div>
      <div className="mt-3 h-1 w-full bg-line">
        <div
          className="h-1 bg-red-strong transition-all"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="mt-8">
        {step === 1 && (
          <section>
            <h1 className="text-[26px] font-black leading-tight sm:text-[32px]">
              Onde quer aparecer?
            </h1>
            <p className="mt-3 text-[15px] text-muted">
              O seu anúncio é mostrado a pessoas nesta zona.
            </p>

            <label className="mt-8 block text-[13px] font-semibold" htmlFor="zona">
              Zona
            </label>
            <select
              id="zona"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              className="mt-2 h-13 w-full rounded-md border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-ink"
            >
              <option value="" disabled>
                Escolher zona
              </option>
              {ZONES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {zone === NATIONAL_ZONE && (
              <p className="mt-3 text-[13px] text-muted">
                O anúncio é mostrado em todo o país.
              </p>
            )}
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-[26px] font-black leading-tight sm:text-[32px]">
              Envie as suas fotos ou vídeos
            </h1>
            <p className="mt-3 text-[15px] text-muted">
              Até {MAX_ASSETS} ficheiros. JPG, PNG, WEBP ou MP4. Nós tratamos do texto.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className={`relative aspect-square overflow-hidden rounded-md border bg-surface ${
                    asset.status === "error" ? "border-red-strong" : "border-line"
                  }`}
                >
                  {asset.fileType.startsWith("video/") ? (
                    <video
                      src={asset.previewUrl}
                      className="size-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.previewUrl}
                      alt={asset.file.name}
                      className="size-full object-cover"
                    />
                  )}

                  {asset.status === "uploading" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-ink/55 text-white">
                      <span className="text-[13px] font-bold tabular-nums">
                        {asset.progress}%
                      </span>
                      <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/30">
                        <div
                          className="h-full bg-white transition-all"
                          style={{ width: `${asset.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {asset.status === "error" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-red-strong/85 p-1.5 text-center text-white">
                      <span className="text-[11px] font-medium leading-tight">
                        {asset.error ?? "Falha no upload."}
                      </span>
                      <button
                        type="button"
                        onClick={() => retryAsset(asset.id)}
                        className="text-[11px] font-semibold underline underline-offset-2"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeAsset(asset.id)}
                    aria-label={`Remover ${asset.file.name}`}
                    className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-ink/80 text-white transition-colors hover:bg-ink"
                  >
                    <Close className="size-3" />
                  </button>
                </div>
              ))}

              {assets.length < MAX_ASSETS && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="grid aspect-square place-items-center rounded-md border border-dashed border-line-strong text-muted transition-colors hover:border-ink hover:text-ink"
                >
                  <Plus className="size-6" />
                </button>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />

            <p className="mt-4 text-[13px] text-muted">
              {doneAssets.length} de {MAX_ASSETS} ficheiros
              {hasPendingUploads ? " · a enviar…" : ""}
            </p>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="text-[26px] font-black leading-tight sm:text-[32px]">
              Quantas visualizações quer?
            </h1>
            <p className="mt-3 text-[15px] text-muted">
              Cada visualização é uma vez que o seu anúncio foi mostrado a alguém.
            </p>

            <div className="mt-8 space-y-3">
              {PACKS.map((option) => {
                const selected = packId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPackId(option.id)}
                    className={`flex w-full items-center justify-between rounded-md border p-5 text-left transition-colors ${
                      selected ? "border-red-strong bg-red-strong/[0.03]" : "border-line hover:border-line-strong"
                    }`}
                  >
                    <span>
                      <span className="block text-[20px] font-black tracking-[-0.03em]">
                        {formatNumber(option.visualizations)}
                      </span>
                      <span className="block text-[13px] text-muted">
                        visualizações{option.featured ? " · mais comprado" : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-[18px] font-bold">{formatPrice(option.price)}</span>
                      <span
                        className={`grid size-5 place-items-center rounded-full border ${
                          selected ? "border-red-strong bg-red-strong text-white" : "border-line-strong"
                        }`}
                      >
                        {selected && <Check className="size-3" />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h1 className="text-[26px] font-black leading-tight sm:text-[32px]">Os seus dados</h1>
            <p className="mt-3 text-[15px] text-muted">
              Usamos estes dados para o contactar sobre a sua campanha.
            </p>

            <div className="mt-8 space-y-4">
              {(
                [
                  { key: "name", label: "Nome", type: "text", autoComplete: "name" },
                  {
                    key: "companyName",
                    label: "Empresa",
                    type: "text",
                    autoComplete: "organization",
                  },
                  { key: "email", label: "Email", type: "email", autoComplete: "email" },
                  { key: "phone", label: "Telefone", type: "tel", autoComplete: "tel" },
                ] as const
              ).map((field) => (
                <div key={field.key}>
                  <label className="block text-[13px] font-semibold" htmlFor={field.key}>
                    {field.label}
                  </label>
                  <input
                    id={field.key}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    value={contact[field.key]}
                    onChange={(event) =>
                      setContact((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="mt-2 h-13 w-full rounded-md border border-line-strong bg-white px-4 text-[16px] outline-none focus:border-ink"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {step === 5 && pack && (
          <section>
            <h1 className="text-[26px] font-black leading-tight sm:text-[32px]">
              Resumo da campanha
            </h1>

            <dl className="mt-8 border-t border-line">
              <SummaryRow label="Zona" value={zone} />
              <SummaryRow label="Ficheiros enviados" value={`${doneAssets.length}`} />
              <SummaryRow
                label="Visualizações"
                value={formatNumber(pack.visualizations)}
              />
            </dl>

            <div className="mt-6 flex items-end justify-between">
              <span className="text-[14px] text-muted">Total</span>
              <span className="text-[32px] font-black tracking-[-0.04em]">
                {formatPrice(pack.price)}
              </span>
            </div>
            <p className="mt-1 text-right text-[12px] text-muted">IVA incluído</p>

            <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
              {doneAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="size-16 shrink-0 overflow-hidden rounded-sm border border-line bg-surface"
                >
                  {asset.fileType.startsWith("video/") ? (
                    <video src={asset.previewUrl} className="size-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.previewUrl} alt="" className="size-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-red-strong/[0.06] px-4 py-3 text-[14px] text-red-strong">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 1 ? (
          <Button variant="ghost" size="lg" onClick={back} disabled={submitting}>
            Voltar
          </Button>
        ) : (
          <span />
        )}

        {step < TOTAL_STEPS ? (
          <Button size="lg" onClick={next} disabled={hasPendingUploads} className="sm:min-w-44">
            Continuar
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={submit}
            disabled={submitting || hasPendingUploads}
            className="sm:min-w-64"
          >
            {submitting ? "A preparar pagamento…" : "Continuar para pagamento"}
          </Button>
        )}
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-muted">
        Ao continuar, aceita os nossos{" "}
        <a href="/termos" className="underline">
          Termos e Condições
        </a>
        .
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-4">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="text-[15px] font-semibold">{value}</dd>
    </div>
  );
}
