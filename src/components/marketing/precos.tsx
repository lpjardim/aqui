import { PACKS } from "@/lib/packs";
import { formatNumber, formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";

export function Precos() {
  return (
    <section id="precos" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">Preços</h2>
        <p className="mt-3 max-w-md text-[16px] text-muted">
          Escolha quantas visualizações quer comprar. Pague uma vez ou todos os meses.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative flex flex-col rounded-lg border bg-white p-7 ${
                pack.featured ? "border-red-strong" : "border-line"
              }`}
            >
              {pack.featured && (
                <span className="absolute -top-3 left-7 bg-red-strong px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                  Mais comprado
                </span>
              )}

              <p className="text-[30px] font-black leading-none tracking-[-0.04em]">
                {formatNumber(pack.visualizations)}
              </p>
              <p className="mt-1.5 text-[14px] text-muted">visualizações</p>

              <div className="mt-8 space-y-1">
                <p className="text-[28px] font-black leading-none tracking-[-0.04em]">
                  {formatPrice(pack.price)}{" "}
                  <span className="text-[14px] font-medium text-muted">uma vez</span>
                </p>
                <p className="text-[16px] font-bold leading-none">
                  {formatPrice(pack.monthlyPrice)}
                  <span className="text-[13px] font-medium text-muted">/mês</span>
                </p>
              </div>
              <p className="mt-1.5 text-[13px] text-muted">IVA incluído</p>

              <ButtonLink
                href={`/pedido?pack=${pack.id}`}
                variant={pack.featured ? "primary" : "outline"}
                size="lg"
                className="mt-8 w-full"
              >
                Escolher
              </ButtonLink>
            </div>
          ))}
        </div>

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
