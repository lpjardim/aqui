"use client";

import { ButtonLink } from "@/components/ui/button";
import { trackLandingExperimentEvent } from "@/lib/landing-experiment-tracking";

/**
 * CTA final do artigo — mesmo par de botões que já existia inline em
 * `page.tsx`, só extraído para um Client Component para poder disparar
 * `cta_clicked` do experimento `landing_page_v1` (a página do artigo em si é
 * um Server Component). Só regista algo quando há sessão de landing ativa
 * (ver `getLandingContext`) — nunca lança nem bloqueia a navegação.
 */
export function FinalCta() {
  return (
    <div className="my-10 flex flex-col items-center gap-3 py-2 sm:flex-row sm:justify-center">
      <ButtonLink
        href="/#precos"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => trackLandingExperimentEvent("cta_clicked", { location: "blog_final_cta" })}
      >
        Ver campanhas disponíveis
      </ButtonLink>
      <ButtonLink
        href="/#como-funciona"
        variant="outline"
        size="lg"
        className="w-full sm:w-auto"
      >
        Ver como funciona
      </ButtonLink>
    </div>
  );
}
