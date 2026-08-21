"use client";

import { ButtonLink } from "@/components/ui/button";
import { trackHeroExperimentEvent } from "@/lib/hero-experiment-tracking";

/**
 * CTA principal do Hero — Client Component só para poder registar o clique
 * (`hero_cta_clicked`) antes de continuar o scroll normal para `#precos`.
 * O texto/headline continuam no Server Component `Hero`, para não haver
 * flicker na troca de variante.
 */
export function HeroPrimaryCta() {
  return (
    <ButtonLink
      href="#precos"
      size="lg"
      className="w-full sm:w-auto"
      onClick={() => trackHeroExperimentEvent("hero_cta_clicked")}
    >
      Começar por 39€
    </ButtonLink>
  );
}
