"use client";

import { useEffect, useRef } from "react";
import { useMarketingConsentGranted } from "@/lib/meta/use-marketing-consent";
import { trackMetaEvent, type ClientMetaEvent } from "@/lib/meta/track-client";
import type { MetaCustomData } from "@/lib/meta/capi";

/**
 * Dispara um evento Meta (Pixel + CAPI) exatamente uma vez por montagem do
 * componente que chama este hook, assim que houver consentimento de
 * marketing — quer já exista no momento do mount, quer só apareça depois
 * (ex.: o visitante só decide o banner de cookies alguns segundos depois de
 * a página ter carregado, o caso mais comum).
 *
 * Sem isto, um evento cujo efeito corresse antes da decisão de
 * consentimento seria perdido para sempre (o `useEffect` só corre uma vez,
 * `fireMetaPixelEvent`/`/api/meta/track` não fazem nada sem consentimento, e
 * nunca haveria um retry) — o que fazia com que `ViewContent`/
 * `InitiateCheckout` nunca fossem registados para a generalidade dos
 * visitantes que só aceitam cookies depois do primeiro render.
 *
 * Guardado com `useRef` (não `useState`) para nunca disparar duas vezes na
 * mesma visita, mesmo que o visitante mude de ideias várias vezes em
 * `/cookies` (aceitar → rejeitar → aceitar outra vez).
 */
export function useFireMetaEventOnConsent(eventName: ClientMetaEvent, customData?: MetaCustomData): void {
  const granted = useMarketingConsentGranted();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!granted || firedRef.current) return;
    firedRef.current = true;
    trackMetaEvent(eventName, customData);
    // `customData` só é lido no momento em que o evento efetivamente
    // dispara — não deve reiniciar o efeito a cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, eventName]);
}
