import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";

/** Frase destacada, tipo pull-quote — para as ideias mais importantes do artigo. */
export function KeyLine({ children }: { children: ReactNode }) {
  return (
    <p className="my-10 border-l-[3px] border-red-strong pl-5 text-[21px] font-bold leading-snug tracking-[-0.01em] sm:text-[24px]">
      {children}
    </p>
  );
}

/** Caixa de enquadramento conceptual (ex: Google vs. publicidade). */
export function InsightBox({ children }: { children: ReactNode }) {
  return (
    <div className="my-10 rounded-lg bg-surface p-6 sm:p-7">
      <p className="text-[16px] font-semibold leading-relaxed sm:text-[17px]">{children}</p>
    </div>
  );
}

/** Caixa de dado/facto, com o número em destaque. */
export function StatBox({ value, children }: { value: string; children: ReactNode }) {
  return (
    <div className="my-8 flex flex-col gap-4 rounded-lg border border-line p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-7">
      <p className="shrink-0 text-[40px] font-black leading-none text-red-strong sm:text-[48px]">
        {value}
      </p>
      <p className="text-[15px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

/** Sugestão prática genuína, sem ligação direta a vender nada. */
export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 rounded-lg border border-line-strong border-dashed p-5 sm:p-6">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-soft">
        Sugestão prática
      </p>
      <p className="text-[15px] leading-relaxed">{children}</p>
    </div>
  );
}

/** CTA contextual, só depois de a marca já ter sido apresentada com contexto. */
export function ContextualCta({
  heading,
  subtext,
}: {
  heading: string;
  subtext: string;
}) {
  return (
    <div className="my-10 rounded-xl border border-line bg-surface p-7 text-center sm:p-9">
      <p className="text-[19px] font-bold leading-snug sm:text-[21px]">{heading}</p>
      <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-muted">{subtext}</p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/#precos" size="lg" className="w-full sm:w-auto">
          Ver campanhas disponíveis
        </ButtonLink>
        <ButtonLink href="/#como-funciona" variant="outline" size="lg" className="w-full sm:w-auto">
          Ver como funciona
        </ButtonLink>
      </div>
    </div>
  );
}

/** Bloco final de "Em resumo", com lista de bullets. */
export function TakeawayBox({ items, footer }: { items: ReactNode[]; footer: ReactNode }) {
  return (
    <div className="my-8 rounded-xl border border-line p-6 sm:p-8">
      <ul className="space-y-3.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 text-[15px] leading-relaxed sm:text-[16px]">
            <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-red-strong" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-line pt-5 text-[15px] font-semibold sm:text-[16px]">
        {footer}
      </p>
    </div>
  );
}
