import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

/**
 * Hero desta página é independente do Hero da home (`src/components/marketing/hero.tsx`)
 * e não participa nos testes A/B do Hero/Preços da home — headline fixa, sem variantes.
 * O chip de zona é ilustrativo (distrito), nunca um raio em km — a segmentação real só
 * existe ao nível de distrito ou Portugal inteiro (ver `src/lib/zones.ts`).
 */
export function Hero() {
  return (
    <section className="overflow-x-clip border-b border-line">
      <div className="container-page grid items-center gap-11 py-12 md:grid-cols-2 md:gap-8 md:py-[68px]">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-red-strong">
            Antes de ser escolhido, tem de ser conhecido
          </p>

          <h1 className="mt-3 text-[38px] font-black leading-[1.02] sm:text-[52px] lg:text-[56px]">
            Deixe de depender
            <br />
            apenas de quem já
            <br />
            <span className="text-red-strong">conhece o seu negócio.</span>
          </h1>

          <p className="mt-[22px] max-w-md text-[16px] leading-relaxed text-muted sm:text-[17px]">
            Chegue a mais pessoas da sua zona através de publicidade no Instagram e Facebook, sem
            gerir anúncios nem falar com uma agência.
          </p>

          <div className="mt-[30px] flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#precos" size="lg" className="w-full sm:w-auto">
              Escolher campanha
            </ButtonLink>
            <ButtonLink
              href="#como-funciona"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Ver como funciona
            </ButtonLink>
          </div>

          <p className="mt-4 text-[13px] font-semibold text-muted">
            Desde 39€/mês. Sem reuniões.
          </p>
        </div>

        <div className="order-last md:order-none">
          <div className="relative mx-auto w-[270px] sm:w-[320px]">
            <span
              aria-hidden
              className="absolute -right-[38px] top-[12%] size-8 border-t-[6px] border-r-[6px] border-red/25 sm:-right-[52px] sm:size-11 sm:border-t-[9px] sm:border-r-[9px]"
            />
            <span
              aria-hidden
              className="absolute -left-[38px] bottom-[10%] size-8 border-b-[6px] border-l-[6px] border-red/25 sm:-left-[52px] sm:size-11 sm:border-b-[9px] sm:border-l-[9px]"
            />

            <span className="absolute -top-3 left-3 z-10 flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1 text-[11px] font-semibold text-ink shadow-sm">
              <span className="size-1.5 rounded-full bg-red-strong" aria-hidden />
              Distrito de Braga
            </span>
            <span className="absolute -bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1 text-[11px] font-semibold text-ink shadow-sm">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
              Campanha ativa
            </span>

            <Image
              src="/anuncios/hero-mockup.webp"
              alt="Exemplo de anúncio no Facebook e Instagram para um negócio local"
              width={1000}
              height={1774}
              quality={95}
              priority
              sizes="(min-width: 640px) 320px, 270px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
