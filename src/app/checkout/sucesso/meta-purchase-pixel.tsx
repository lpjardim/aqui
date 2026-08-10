"use client";

import { useEffect } from "react";
import { fireMetaPixelEvent } from "@/lib/meta/pixel";

/**
 * Dispara `Purchase` (e `Subscribe`, só na 1ª mensalidade) no Pixel do
 * browser, com o MESMO `event_id` que a CAPI já usou no webhook Stripe —
 * é assim que a Meta deduplica o mesmo pagamento chegado pelas duas vias.
 * Não faz nenhuma chamada à Conversions API a partir daqui: essa já foi
 * enviada de forma autoritativa pelo webhook, com o valor real confirmado
 * pela Stripe. Se não houver consentimento de marketing, o Pixel nem está
 * carregado — `fireMetaPixelEvent` não faz nada nesse caso.
 */
export function MetaPurchasePixel({
  eventId,
  value,
  currency,
  isSubscription,
}: {
  eventId: string;
  value: number;
  currency: string;
  isSubscription: boolean;
}) {
  useEffect(() => {
    const params = { value, currency };
    fireMetaPixelEvent("Purchase", params, eventId);
    if (isSubscription) {
      fireMetaPixelEvent("Subscribe", params, eventId);
    }
    // Só no mount desta página — nunca repetir em re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
