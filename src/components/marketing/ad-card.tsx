import Image from "next/image";
import {
  Comment,
  Dots,
  HeartSolid,
  LaughEmoji,
  Share,
  ThumbUp,
  ThumbUpSolid,
} from "@/components/icons";
import { formatNumber } from "@/lib/format";

export type AdExample = {
  business: string;
  location: string;
  avatar: string;
  image: string;
  overlay: string[];
  headline: string;
  cta: string;
  likes: number;
  comments: number;
};

function Reactions() {
  return (
    <span className="flex -space-x-1">
      <span className="grid size-4 place-items-center rounded-full bg-[#1877f2] ring-[1.5px] ring-white">
        <ThumbUpSolid className="size-2.5 text-white" />
      </span>
      <span className="grid size-4 place-items-center rounded-full bg-[#f3425f] ring-[1.5px] ring-white">
        <HeartSolid className="size-2.5 text-white" />
      </span>
      <LaughEmoji className="size-4 rounded-full ring-[1.5px] ring-white" />
    </span>
  );
}

export function AdCard({ ad, compact = false }: { ad: AdExample; compact?: boolean }) {
  return (
    <div className="bg-white">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-surface">
          <Image src={ad.avatar} alt="" fill sizes="32px" className="object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold leading-tight">
            {ad.business}
          </span>
          <span className="block truncate text-[10px] leading-tight text-muted">
            Patrocinado · {ad.location}
          </span>
        </span>
        <Dots className="size-4 text-muted" />
      </div>

      <div className="relative aspect-square w-full">
        <Image
          src={ad.image}
          alt=""
          fill
          sizes={compact ? "(min-width: 1024px) 25vw, 90vw" : "300px"}
          className="object-cover"
        />
        <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/55 to-transparent" />
        <p
          className={`absolute left-4 right-4 top-4 font-black uppercase leading-[1.05] tracking-[-0.02em] text-white ${
            compact ? "text-[21px]" : "text-[24px]"
          }`}
        >
          {ad.overlay.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 bg-surface px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold">{ad.location}</span>
          <span className="block truncate text-[10px] text-muted">{ad.headline}</span>
        </span>
        <span className="shrink-0 rounded-xs border border-line-strong bg-white px-2.5 py-1.5 text-[10px] font-semibold">
          {ad.cta}
        </span>
      </div>

      <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <Reactions />
          {formatNumber(ad.likes)}
        </span>
        <span>{ad.comments} comentários</span>
      </div>

      <div className="flex items-center justify-around border-t border-line px-3 py-2 text-muted">
        <span className="flex items-center gap-1.5 text-[10px] font-medium">
          <ThumbUp className="size-4" />
          Gosto
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-medium">
          <Comment className="size-4" />
          Comentar
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-medium">
          <Share className="size-4" />
          Partilhar
        </span>
      </div>
    </div>
  );
}
