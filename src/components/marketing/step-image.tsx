import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

/**
 * As imagens dos passos são colocadas em `public/como-funciona/`.
 * Enquanto não existirem, é mostrado um espaço reservado com a mesma proporção.
 */
export function StepImage({ src, alt }: { src: string; alt: string }) {
  const exists = existsSync(path.join(process.cwd(), "public", src));

  if (!exists) {
    return (
      <div className="grid aspect-4/3 w-full place-items-center rounded-md border border-dashed border-line-strong bg-surface">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted">Imagem</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-4/3 w-full overflow-hidden rounded-md border border-line bg-white">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 90vw"
        className="object-contain p-4"
      />
    </div>
  );
}
