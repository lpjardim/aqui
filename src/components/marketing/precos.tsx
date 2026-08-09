import { PACKS } from "@/lib/packs";
import { formatNumber, formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";

export function Precos() {
  return (
    <section id="precos" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">Preços</h2>
        <p className="mt-3 max-w-md text-[16px] text-muted">
          Escolha quantas visualizações quer comprar. Sem mensalidades.
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

              <p className="mt-8 text-[34px] font-black leading-none tracking-[-0.04em]">
                {formatPrice(pack.price)}
              </p>
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
      </div>
    </section>
  );
}
