"use client";

import { useEffect, useState } from "react";
import { PACKS } from "@/lib/packs";
import { formatNumber, formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { trackExperimentEvent } from "@/lib/experiment-tracking";
import { trackLandingExperimentEvent } from "@/lib/landing-experiment-tracking";
import type { BillingFrequency } from "@/lib/pricing";

/**
 * Variante B do A/B test de preços — design "toggle": um interruptor
 * Uma vez / Mensal acima dos 3 cards decide qual preço fica em destaque
 * ("hero") em cada card; o outro preço fica sempre visível como secundário
 * (nunca escondido). O CTA "Escolher" leva o volume E a frequência
 * escolhida no toggle para o checkout. Heading/subtítulo/"Precisa de outro
 * volume?" vivem em `precos.tsx`, idênticos em ambas as variantes.
 *
 * O `ViewContent` da Meta já não dispara aqui — vive em
 * `meta-landing-view.tsx`, montado no topo da home (ver esse ficheiro).
 */
export function PrecosToggle() {
  const [frequency, setFrequency] = useState<BillingFrequency>("MONTHLY");

  useEffect(() => {
    // Só no mount — a mudança de toggle é reportada separadamente abaixo.
    trackExperimentEvent("pricing_exposed", { layout: "toggle", frequency: "MONTHLY" });
    trackLandingExperimentEvent("pricing_view", { landingPath: "/", layout: "toggle" });
  }, []);

  function selectFrequency(next: BillingFrequency) {
    if (next === frequency) return;
    setFrequency(next);
    trackExperimentEvent("pricing_toggle_changed", { frequency: next });
  }

  return (
    <div>
      <div className="mt-10 flex justify-center">
        <div className="inline-flex rounded-full border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => selectFrequency("ONE_TIME")}
            className={`rounded-full px-5 py-2 text-[14px] font-semibold transition-colors ${
              frequency === "ONE_TIME" ? "bg-white text-ink shadow-sm" : "text-muted"
            }`}
          >
            Uma vez
          </button>
          <button
            type="button"
            onClick={() => selectFrequency("MONTHLY")}
            className={`rounded-full px-5 py-2 text-[14px] font-semibold transition-colors ${
              frequency === "MONTHLY" ? "bg-red-strong text-white shadow-sm" : "text-muted"
            }`}
          >
            Mensal
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {PACKS.map((pack) => {
          const savings = pack.price - pack.monthlyPrice;
          const isMonthly = frequency === "MONTHLY";

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

              <div className="mt-7">
                {isMonthly ? (
                  <>
                    <p className="text-[36px] font-black leading-none tracking-[-0.04em] text-red-strong">
                      {formatPrice(pack.monthlyPrice)}
                      <span className="text-[14px] font-semibold text-red-strong/70">/mês</span>
                    </p>
                    <p className="mt-1.5 text-[13px] font-semibold text-ink">
                      Poupa {formatPrice(savings)}/mês
                    </p>
                    <p className="mt-2 text-[13px] text-muted">
                      ou {formatPrice(pack.price)} uma vez
                      {pack.id === "p2k" ? " · sem compromisso" : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[36px] font-black leading-none tracking-[-0.04em]">
                      {formatPrice(pack.price)}
                    </p>
                    <p className="mt-1.5 text-[13px] text-muted">
                      {pack.id === "p2k" ? "Pagamento único · sem compromisso" : "pagamento único"}
                    </p>
                    <p className="mt-2 text-[13px] text-muted">
                      ou {formatPrice(pack.monthlyPrice)}/mês
                    </p>
                  </>
                )}
              </div>

              <p className="mt-4 text-[12px] text-muted">IVA incluído em ambas as opções</p>

              <ButtonLink
                href={`/pedido?pack=${pack.id}&freq=${frequency}`}
                variant={pack.featured ? "primary" : "outline"}
                size="lg"
                className="mt-6 w-full"
                onClick={() => {
                  trackExperimentEvent("pricing_cta_clicked", {
                    packId: pack.id,
                    volume: pack.visualizations,
                    frequency,
                    layout: "toggle",
                  });
                  trackLandingExperimentEvent("plan_selected", {
                    plan: pack.id,
                    billingType: frequency,
                    price: isMonthly ? pack.monthlyPrice : pack.price,
                  });
                }}
              >
                Escolher
              </ButtonLink>
            </div>
          );
        })}
      </div>
    </div>
  );
}
