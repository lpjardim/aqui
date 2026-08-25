import type { ReactNode } from "react";
import {
  Battery,
  Close,
  Comment,
  Dots,
  Facebook,
  Heart,
  HeartSolid,
  Instagram,
  LaughEmoji,
  Share,
  SignalBars,
  ThumbUp,
  ThumbUpSolid,
  Wifi,
} from "@/components/icons";
import { formatNumber } from "@/lib/format";
import type { BillingFrequency } from "@/lib/pricing";
import { NATIONAL_ZONE } from "@/lib/zones";

export type PreviewAsset = {
  previewUrl: string;
  fileType: string;
};

/**
 * Mockups ilustrativos (não são a Ad Previews API da Meta) para dar ao
 * utilizador uma ideia visual do anúncio antes de avançar para o pagamento.
 * Mostra sempre o(s) ficheiro(s) reais que o utilizador enviou — imagem ou
 * vídeo — encaixados no frame do Facebook/Instagram, sem os alterar.
 */
export function AdPreviewMockups({
  assets,
  brandName,
  views,
  frequency,
  zone,
}: {
  assets: PreviewAsset[];
  brandName?: string;
  views: number;
  frequency: BillingFrequency;
  zone: string;
}) {
  if (assets.length === 0) return null;

  const [feedAsset, storyAsset = feedAsset] = assets;
  const displayName = brandName?.trim() || "A sua marca";
  const locationPhrase = zone === NATIONAL_ZONE ? "em todo o país" : `em ${zone}`;
  const campaignLine =
    frequency === "MONTHLY"
      ? `${formatNumber(views)} visualizações todos os meses ${locationPhrase}.`
      : `${formatNumber(views)} visualizações ${locationPhrase}.`;

  return (
    <div className="mt-10 rounded-md border border-line bg-surface p-5 sm:p-7">
      <h2 className="text-[17px] font-black leading-tight sm:text-[19px]">
        É assim que a sua empresa pode aparecer.
      </h2>
      <p className="mt-1.5 text-[13px] text-muted">
        O seu anúncio está quase pronto. Conclua o pagamento e nós tratamos do resto.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <MockupSlot label="Feed">
          <FeedMockup asset={feedAsset} brandName={displayName} />
        </MockupSlot>
        <MockupSlot label="Stories">
          <StoryMockup asset={storyAsset} brandName={displayName} />
        </MockupSlot>
      </div>

      <p className="mt-5 text-center text-[12px] text-muted">{campaignLine}</p>

      <p className="mt-4 text-center text-[12px] text-muted">
        Esta é uma pré-visualização. O formato pode adaptar-se ligeiramente ao Facebook, Instagram e
        respetivos posicionamentos.
      </p>

      <p className="mt-4 text-center text-[13px] font-medium">Está tudo pronto para avançar.</p>
    </div>
  );
}

/**
 * Variante usada no ecrã de preview do `/diagnostico` — nesse ponto do
 * funil ainda não há visualizações/pack escolhidos (isso só acontece no
 * ecrã de recomendação, a seguir a este), por isso recebe uma legenda já
 * pronta (`tagline`) em vez de `views`/`frequency`/`zone`. Reaproveita os
 * mesmos mockups de Feed/Stories do checkout — nunca duplica o desenho do
 * telefone/feed.
 */
export function DiagnosticAdPreviewMockups({
  assets,
  brandName,
  tagline,
}: {
  assets: PreviewAsset[];
  brandName?: string;
  tagline: string;
}) {
  if (assets.length === 0) return null;

  const [feedAsset, storyAsset = feedAsset] = assets;
  const displayName = brandName?.trim() || "O seu negócio";

  return (
    <div className="mt-8 rounded-md border border-line bg-surface p-5 sm:p-7">
      <h2 className="text-[17px] font-black leading-tight sm:text-[19px]">
        É assim que o seu negócio pode começar a aparecer a mais pessoas da sua zona.
      </h2>

      <div className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <MockupSlot label="Feed">
          <FeedMockup asset={feedAsset} brandName={displayName} />
        </MockupSlot>
        <MockupSlot label="Stories">
          <StoryMockup asset={storyAsset} brandName={displayName} />
        </MockupSlot>
      </div>

      <p className="mt-5 text-center text-[12px] text-muted">{tagline}</p>

      <p className="mt-4 text-center text-[12px] text-muted">
        Esta é uma pré-visualização. O formato pode adaptar-se ligeiramente ao Facebook, Instagram e
        respetivos posicionamentos.
      </p>
    </div>
  );
}

function MockupSlot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      {children}
      <div className="mt-3 flex items-center gap-1.5 text-muted">
        <Instagram className="size-3.5" />
        <Facebook className="size-3.5" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[220px]">
      <div className="relative aspect-[9/19] overflow-hidden rounded-[26px] border-[3px] border-ink bg-ink p-1.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]">
        <div className="relative size-full overflow-hidden rounded-[20px] bg-white">{children}</div>
      </div>
    </div>
  );
}

function StatusBar({ tone }: { tone: "dark" | "light" }) {
  const color = tone === "light" ? "text-white" : "text-ink";
  return (
    <div className={`flex items-center justify-between px-3.5 pt-2 ${color}`}>
      <span className="text-[10px] font-semibold">9:41</span>
      <div className="flex items-center gap-1">
        <SignalBars className="size-2.5" />
        <Wifi className="size-2.5" />
        <Battery className="size-3.5" />
      </div>
    </div>
  );
}

/** Reações estilo Meta (like azul + coração + risada), para dar vida ao mockup de feed. */
function Reactions() {
  return (
    <span className="flex -space-x-1">
      <span className="grid size-3.5 place-items-center rounded-full bg-[#1877f2] ring-[1.5px] ring-white">
        <ThumbUpSolid className="size-2 text-white" />
      </span>
      <span className="grid size-3.5 place-items-center rounded-full bg-[#f3425f] ring-[1.5px] ring-white">
        <HeartSolid className="size-2 text-white" />
      </span>
      <LaughEmoji className="size-3.5 rounded-full ring-[1.5px] ring-white" />
    </span>
  );
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "A";
}

/**
 * Renderiza o ficheiro real enviado pelo utilizador — imagem ou vídeo — sem
 * qualquer overlay nosso por cima: se o criativo já tiver texto embutido,
 * continua visível tal como foi enviado.
 */
function AssetMedia({ asset, className }: { asset: PreviewAsset; className: string }) {
  if (asset.fileType.startsWith("video/")) {
    return <video src={asset.previewUrl} className={className} autoPlay muted loop playsInline />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.previewUrl} alt="" className={className} />;
}

function FeedMockup({ asset, brandName }: { asset: PreviewAsset; brandName: string }) {
  return (
    <PhoneFrame>
      <StatusBar tone="dark" />

      <div className="flex items-center gap-2 px-3 pt-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-strong text-[11px] font-bold text-white">
          {initial(brandName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-semibold leading-tight text-ink">
            {brandName}
          </span>
          <span className="block text-[9px] leading-tight text-muted">Patrocinado</span>
        </span>
        <Dots className="size-3.5 text-muted" />
      </div>

      <div className="relative mt-2 aspect-square w-full overflow-hidden bg-surface">
        <AssetMedia asset={asset} className="size-full object-cover" />
      </div>

      <div className="flex items-center justify-between gap-2 bg-surface px-3 py-2">
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-semibold text-ink">{brandName}</span>
          <span className="block truncate text-[9px] text-muted">Anúncio patrocinado</span>
        </span>
        <span className="shrink-0 rounded-xs border border-line-strong bg-white px-2.5 py-1.5 text-[9px] font-semibold text-ink">
          Saber mais
        </span>
      </div>

      <div className="flex items-center justify-between px-3 pt-2 text-[9px] text-muted">
        <span className="flex items-center gap-1.5">
          <Reactions />
          214
        </span>
        <span>18 comentários</span>
      </div>

      <div className="mt-1.5 flex items-center justify-around border-t border-line px-2 pt-1.5 pb-3 text-muted">
        <span className="flex items-center gap-1 text-[9px] font-medium">
          <ThumbUp className="size-3" />
          Gosto
        </span>
        <span className="flex items-center gap-1 text-[9px] font-medium">
          <Comment className="size-3" />
          Comentar
        </span>
        <span className="flex items-center gap-1 text-[9px] font-medium">
          <Share className="size-3" />
          Partilhar
        </span>
      </div>
    </PhoneFrame>
  );
}

function StoryMockup({ asset, brandName }: { asset: PreviewAsset; brandName: string }) {
  return (
    <PhoneFrame>
      <div className="relative size-full">
        <AssetMedia asset={asset} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/40" />

        <div className="absolute inset-x-0 top-0">
          <StatusBar tone="light" />
          <div className="flex items-center gap-1 px-3 pt-2">
            <span className="h-[2px] flex-1 rounded-full bg-white/70" />
            <span className="h-[2px] flex-1 rounded-full bg-white/30" />
          </div>
          <div className="mt-2 flex items-center gap-2 px-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-red-strong text-[10px] font-bold text-white ring-1 ring-white/70">
              {initial(brandName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold leading-tight text-white">
                {brandName}
              </span>
              <span className="block text-[9px] leading-tight text-white/80">Patrocinado</span>
            </span>
            <Close className="size-3.5 shrink-0 text-white" />
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-full border border-white/50 bg-black/20 px-3 py-2 backdrop-blur-sm">
          <span className="flex-1 truncate text-[10px] text-white/90">Enviar mensagem</span>
          <Heart className="size-4 shrink-0 text-white" />
          <Share className="size-4 shrink-0 text-white" />
        </div>
      </div>
    </PhoneFrame>
  );
}
