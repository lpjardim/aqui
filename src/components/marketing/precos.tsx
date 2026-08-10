import { getPricingContext } from "@/lib/experiments";
import { PrecosSplit } from "@/components/marketing/precos-split";
import { PrecosToggle } from "@/components/marketing/precos-toggle";

/**
 * Server Component fino: decide server-side (sem flicker) qual variante do
 * A/B test de preços mostrar — a variante já vem atribuída pelo
 * `middleware.ts` antes deste render. Heading/subtítulo/"Precisa de outro
 * volume?" são idênticos em ambas as variantes; só a zona dos cards muda.
 */
export async function Precos() {
  const { variant } = await getPricingContext();

  return (
    <section id="precos" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">Preços</h2>
        <p className="mt-3 max-w-md text-[16px] text-muted">
          Escolha quantas visualizações quer comprar — uma vez ou todos os meses.
        </p>

        {variant === "B" ? <PrecosToggle /> : <PrecosSplit />}

        <p className="mt-8 text-center text-[14px] text-muted">
          Precisa de outro volume?{" "}
          <a href="/pedido?custom=1" className="font-semibold text-ink underline underline-offset-2">
            Escolher outro volume
          </a>
        </p>
      </div>
    </section>
  );
}
