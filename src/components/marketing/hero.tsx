import Image from "next/image";
import { CheckCircle } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { getHeroContext } from "@/lib/hero-experiment";
import { HeroTracking } from "@/components/marketing/hero-tracking";
import { HeroPrimaryCta } from "@/components/marketing/hero-primary-cta";

const GUARANTEES = ["Sem chamadas", "Visualizações garantidas", "Comprovativo da Meta"];

/**
 * A/B test independente do teste de preços — só a headline muda entre
 * variantes (ver `src/lib/hero-experiment.ts`). Server Component: a
 * variante já vem atribuída pelo `middleware.ts` antes deste render, sem
 * flicker nem troca depois de montar.
 */
export async function Hero() {
  const { variant } = await getHeroContext();

  return (
    <section className="overflow-x-clip border-b border-line">
      <HeroTracking />
      <div className="container-page grid items-center gap-11 py-12 md:grid-cols-2 md:gap-8 md:py-[68px]">
        <div>
          <h1 className="text-[38px] font-black leading-[1.02] sm:text-[52px] lg:text-[58px]">
            {variant === "B" ? (
              <>
                Faça mais pessoas
                <br />
                <span className="text-red-strong">
                  da sua zona conhecerem
                  <br />o seu negócio.
                </span>
              </>
            ) : (
              <>
                Ponha o seu negócio
                <br />
                <span className="text-red-strong">
                  à frente de mais pessoas
                  <br />
                  da sua zona.
                </span>
              </>
            )}
          </h1>

          <p className="mt-[22px] max-w-md text-[16px] leading-relaxed text-muted sm:text-[17px]">
            Publicidade no Instagram e Facebook sem ter de perceber de anúncios. Escolha a zona,
            envie as suas fotos e nós tratamos do resto.
          </p>

          <div className="mt-[30px] flex flex-col gap-3 sm:flex-row">
            <HeroPrimaryCta />
            <ButtonLink href="#exemplos" variant="outline" size="lg" className="w-full sm:w-auto">
              Ver exemplos
            </ButtonLink>
          </div>

          <p className="mt-4 text-[13px] font-semibold text-muted">
            2.000 visualizações garantidas por 49€.
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
            <Image
              src="/anuncios/hero-mockup.webp"
              alt="Exemplo de anúncio no Facebook e Instagram para um café local"
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

      <div className="border-t border-line">
        <ul className="container-page grid gap-4 py-5 sm:grid-cols-3">
          {GUARANTEES.map((item) => (
            <li key={item} className="flex items-center justify-center gap-2 text-[14px]">
              <CheckCircle className="size-5 text-red-strong" />
              <span className="font-medium">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
