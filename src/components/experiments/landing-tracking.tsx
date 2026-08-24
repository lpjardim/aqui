"use client";

import { useEffect } from "react";
import { trackLandingExperimentEvent } from "@/lib/landing-experiment-tracking";

/**
 * Regista `experiment_exposure` do experimento `landing_page_v1` assim que a
 * página efetivamente carrega no browser (nunca no redirect de `/go` — só
 * quando o React monta de facto, para não contar previews/crawlers que sigam
 * o redirect sem renderizar JS). A variante/visitante/sessão nunca vêm daqui
 * — o endpoint `/api/experiments/track-landing` lê tudo sempre da cookie
 * `landing_session`.
 *
 * Só deve ser montado pela página Server Component cuja variante corresponde
 * à sessão ativa (`getLandingContext().variant === "NORMAL" | "SALES" | "BLOG"`
 * consoante a própria página) — isto evita registar uma exposição errada
 * quando o visitante navega organicamente para uma página diferente da
 * atribuída à sessão dele (ex.: leitor do blog que clica para a home).
 */
export function LandingTracking({ landingPath }: { landingPath: string }) {
  useEffect(() => {
    trackLandingExperimentEvent("experiment_exposure", { landingPath });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
