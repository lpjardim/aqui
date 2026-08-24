"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Close } from "@/components/icons";
import { trackLandingExperimentEvent } from "@/lib/landing-experiment-tracking";

/**
 * CTA fixa no fundo do ecrã, discreta — só aparece depois de o leitor ter
 * percorrido ~60% do artigo, para não parecer um anúncio agressivo desde o
 * início. Pode ser fechada e mantém-se fechada durante a sessão de leitura.
 */
export function StickyCta() {
  const [pastThreshold, setPastThreshold] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      const pct = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      setPastThreshold(pct >= 0.6);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const visible = pastThreshold && !dismissed;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-sm transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <p className="text-[13px] font-semibold sm:text-[15px]">
          Quer anunciar na sua zona?
        </p>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <ButtonLink
            href="/#precos"
            size="md"
            tabIndex={visible ? 0 : -1}
            className="h-10 px-4 text-[13px] sm:text-sm"
            onClick={() => trackLandingExperimentEvent("cta_clicked", { location: "blog_sticky_cta" })}
          >
            Ver campanhas
          </ButtonLink>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            tabIndex={visible ? 0 : -1}
            aria-label="Fechar"
            className="rounded-md p-2.5 text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <Close className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
