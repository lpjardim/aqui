/**
 * Regra pura que decide se o `OrderForm` deve saltar diretamente para o
 * passo 5 (dados de contacto) quando chega do handoff `/diagnostico` — só
 * quando os passos 1-4 já estão todos respondidos (zona + pack/volume +
 * frequência + pelo menos 1 ficheiro). Extraída do componente para ser
 * testável sem montar React (ver `order-form.tsx`).
 */
import type { BillingFrequency } from "@/lib/pricing";

export type OrderFormPrefillInput = {
  diagnosticId: string | null;
  initialZone: string | null;
  initialViews: number | null;
  initialFrequency: BillingFrequency | null;
  initialAssetsCount: number;
};

export function isPrefilledFromDiagnostic(input: OrderFormPrefillInput): boolean {
  return (
    Boolean(input.diagnosticId) &&
    Boolean(input.initialZone) &&
    Boolean(input.initialViews) &&
    Boolean(input.initialFrequency) &&
    input.initialAssetsCount > 0
  );
}

export function computeInitialOrderFormStep(input: OrderFormPrefillInput): 1 | 5 {
  return isPrefilledFromDiagnostic(input) ? 5 : 1;
}
