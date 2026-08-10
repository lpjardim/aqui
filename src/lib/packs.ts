import { calculatePrice } from "@/lib/pricing";

export type PackId = "p2k" | "p20k" | "p200k";

export type Pack = {
  id: PackId;
  visualizations: number;
  /** Preço em cêntimos, IVA incluído, pagamento único. */
  price: number;
  /** Preço em cêntimos, IVA incluído, por mês (subscrição). */
  monthlyPrice: number;
  featured: boolean;
};

function idFor(visualizations: number): PackId {
  if (visualizations === 2_000) return "p2k";
  if (visualizations === 20_000) return "p20k";
  return "p200k";
}

/**
 * Os 3 packs principais são pontos âncora derivados de `calculatePrice` —
 * nunca valores fixos soltos, para nunca desalinhar do preço personalizado.
 */
export const PACKS: Pack[] = [2_000, 20_000, 200_000].map((visualizations) => ({
  id: idFor(visualizations),
  visualizations,
  price: calculatePrice(visualizations, "ONE_TIME"),
  monthlyPrice: calculatePrice(visualizations, "MONTHLY"),
  featured: visualizations === 20_000,
}));

export function getPack(id: string | null | undefined): Pack | undefined {
  return PACKS.find((pack) => pack.id === id);
}

export function getPackByVisualizations(visualizations: number): Pack | undefined {
  return PACKS.find((pack) => pack.visualizations === visualizations);
}
