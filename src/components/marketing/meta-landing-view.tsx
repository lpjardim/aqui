"use client";

import { useFireMetaEventOnConsent } from "@/lib/meta/use-fire-meta-event";
import { LANDING_EXPERIMENT_ID } from "@/lib/landing-experiment-constants";
import type { LandingVariant } from "@/generated/prisma/enums";

/**
 * Dispara o `ViewContent` da Meta assim que a landing (`/`) é visitada —
 * ponto tecnicamente mais seguro possível: componente isolado, sem depender
 * de nenhum A/B test, lista de packs, ou qualquer outro dado que possa
 * falhar. Antes vivia dentro de `precos-split.tsx`/`precos-toggle.tsx`
 * (media "viu a secção de preços", não "visitou a landing", e um erro
 * nesses componentes matava silenciosamente o evento).
 *
 * O evento interno `pricing_exposed` (`trackExperimentEvent`), usado pelo
 * painel A/B, continua exatamente onde estava — não tem nada a ver com
 * `ViewContent` e não foi tocado.
 *
 * `landingVariant` opcional (passado pelas 3 páginas do experimento
 * `landing_page_v1`) enriquece este MESMO `ViewContent` com
 * `content_category`/`experiment_variant` — nunca cria um evento novo nem
 * toca no `event_id` partilhado Pixel/CAPI (a deduplicação continua intacta).
 */
export function MetaLandingView({ landingVariant }: { landingVariant?: LandingVariant | null } = {}) {
  useFireMetaEventOnConsent(
    "ViewContent",
    landingVariant
      ? {
          content_category: "landing_experiment",
          experiment_id: LANDING_EXPERIMENT_ID,
          experiment_variant: landingVariant,
        }
      : undefined,
  );
  return null;
}
