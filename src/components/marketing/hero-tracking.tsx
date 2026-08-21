"use client";

import { useEffect } from "react";
import { trackHeroExperimentEvent } from "@/lib/hero-experiment-tracking";

/**
 * Regista a exposição ao Hero (visitante que viu a variante A ou B) assim
 * que a secção monta. A variante efetiva nunca vem daqui — o endpoint
 * `/api/experiments/track-hero` lê-a sempre da cookie `hero_variant`/
 * `hero_debug`. Componente invisível, sem props: `Hero` continua a ser um
 * Server Component (sem flicker na headline).
 */
export function HeroTracking() {
  useEffect(() => {
    trackHeroExperimentEvent("hero_exposed");
  }, []);

  return null;
}
