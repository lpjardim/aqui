"use client";

import { useFireMetaEventOnConsent } from "@/lib/meta/use-fire-meta-event";

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
 */
export function MetaLandingView() {
  useFireMetaEventOnConsent("ViewContent");
  return null;
}
