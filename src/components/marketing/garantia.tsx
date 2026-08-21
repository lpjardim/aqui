import { Shield } from "@/components/icons";

/**
 * Risk reversal da oferta — secção própria, imediatamente a seguir aos
 * preços. Reutiliza o vermelho de destaque já usado em badges/CTAs do
 * design system, sem introduzir nenhuma cor ou padrão novo.
 */
export function Garantia() {
  return (
    <section id="garantia" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl rounded-lg border-2 border-red-strong bg-red-strong/[0.03] p-8 text-center sm:p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-strong/10 text-red-strong">
            <Shield className="size-7" />
          </div>

          <h2 className="mt-5 text-[28px] font-black leading-tight sm:text-[34px]">
            As visualizações são garantidas.
          </h2>

          <p className="mt-4 text-[16px] leading-relaxed text-ink">
            Se comprar 2.000 visualizações, entregamos 2.000.
          </p>
          <p className="mt-2 text-[16px] leading-relaxed text-ink">
            Se a campanha não atingir o número contratado, continuamos a promovê-la sem custo até
            atingir.
          </p>

          <p className="mt-5 text-[14px] font-semibold text-red-strong">
            Só termina quando as visualizações contratadas forem entregues.
          </p>
        </div>
      </div>
    </section>
  );
}
