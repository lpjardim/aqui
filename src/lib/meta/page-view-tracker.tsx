"use client";

import { useFireMetaEventOnConsent } from "@/lib/meta/use-fire-meta-event";

/**
 * Dispara o standard `PageView` assim que há consentimento — sitewide, em
 * qualquer página, tal como o pixel base da Meta faz por omissão. É deste
 * sinal que depende a métrica nativa "Landing Page Views" do Ads Manager
 * (não do nosso `ViewContent`, que mede algo mais específico: "visitou o
 * conteúdo principal da landing"). Componente próprio (não faz parte de
 * `pixel.tsx`) só para não criar uma dependência circular entre
 * `pixel.tsx` → `track-client.ts` → `pixel.tsx`.
 */
export function MetaPageView() {
  useFireMetaEventOnConsent("PageView");
  return null;
}
