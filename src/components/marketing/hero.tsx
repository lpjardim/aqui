import Image from "next/image";
import { CheckCircle } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

const GUARANTEES = ["Sem chamadas", "Preços claros", "Comprovativo no final"];

export function Hero() {
  return (
    <section className="overflow-x-clip border-b border-line">
      <div className="container-page grid items-center gap-11 py-12 md:grid-cols-2 md:gap-8 md:py-[68px]">
        <div>
          <h1 className="text-[38px] font-black leading-[1.02] sm:text-[52px] lg:text-[58px]">
            A sua empresa.
            <br />
            <span className="text-red-strong">
              À frente de pessoas
              <br />
              da sua zona.
            </span>
          </h1>

          <p className="mt-[22px] max-w-md text-[16px] leading-relaxed text-muted sm:text-[17px]">
            Apareça no Instagram e Facebook para pessoas da sua zona. Simples de comprar, fácil de
            acompanhar.
          </p>

          <div className="mt-[30px] flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="#precos" size="lg" className="w-full sm:w-auto">
              Ver preços
            </ButtonLink>
            <ButtonLink href="#exemplos" variant="outline" size="lg" className="w-full sm:w-auto">
              Ver exemplos
            </ButtonLink>
          </div>
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
