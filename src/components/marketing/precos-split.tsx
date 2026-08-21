"use client";

import { useEffect } from "react";
import { PACKS } from "@/lib/packs";
import { formatNumber, formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { trackExperimentEvent } from "@/lib/experiment-tracking";
import { trackMetaEvent } from "@/lib/meta/track-client";

/**
 * Variante A do A/B test de preços — design "split": cada card mostra as
 * duas colunas Uma vez | Mensal lado a lado, com "OU" a dividir. A
 * frequência só é escolhida no checkout (passo 4); o CTA aqui só decide o
 * volume. Heading/subtítulo/"Precisa de outro volume?" vivem em
 * `precos.tsx`, idênticos em ambas as variantes.
 */
export function PrecosSplit() {
  useEffect(() => {
    trackExperimentEvent("pricing_exposed", { layout: "split" });
    trackMetaEvent("ViewContent");
  }, []);

  return (
    <div className="mt-10 grid gap-5 md:grid-cols-3">
      {PACKS.map((pack) => {
        const savings = pack.price - pack.monthlyPrice;

        return (
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

            {/* Duas colunas — Uma vez | Mensal — com "OU" centrado na divisória. */}
            <div className="relative mt-7 flex flex-col overflow-hidden rounded-md border border-line sm:flex-row">
              <div className="flex flex-1 flex-col gap-1 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                  Uma vez
                </span>
                <p className="text-[22px] font-black leading-none tracking-[-0.03em]">
                  {formatPrice(pack.price)}
                </p>
                <p className="text-[12px] text-muted">
                  {pack.id === "p2k" ? "Pagamento único · sem compromisso" : "pagamento único"}
                </p>
              </div>

              <div className="relative flex h-px w-full items-center justify-center bg-line sm:h-auto sm:w-px sm:self-stretch">
                <span className="absolute left-1/2 top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-[10px] font-bold text-muted-soft">
                  OU
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-1 bg-red-strong/5 p-4">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-red-strong">
                  Mensal
                  <span className="rounded-full bg-red-strong px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-white">
                    Melhor valor
                  </span>
                </span>
                <p className="text-[24px] font-black leading-none tracking-[-0.03em] text-red-strong">
                  {formatPrice(pack.monthlyPrice)}
                  <span className="text-[12px] font-semibold text-red-strong/70">/mês</span>
                </p>
                <p className="text-[12px] text-muted">todos os meses</p>
                <p className="text-[12px] font-semibold text-ink">
                  Poupa {formatPrice(savings)}/mês
                </p>
              </div>
            </div>
            <p className="mt-2 text-center text-[12px] text-muted">
              IVA incluído em ambas as opções
            </p>

            <ButtonLink
              href={`/pedido?pack=${pack.id}`}
              variant={pack.featured ? "primary" : "outline"}
              size="lg"
              className="mt-6 w-full"
              onClick={() =>
                trackExperimentEvent("pricing_cta_clicked", {
                  packId: pack.id,
                  volume: pack.visualizations,
                  layout: "split",
                })
              }
            >
              Escolher
            </ButtonLink>
          </div>
        );
      })}
    </div>
  );
}
