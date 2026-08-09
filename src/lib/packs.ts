export type PackId = "p2k" | "p20k" | "p200k";

export type Pack = {
  id: PackId;
  visualizations: number;
  /** Preço em cêntimos, IVA incluído. */
  price: number;
  featured: boolean;
};

export const PACKS: Pack[] = [
  { id: "p2k", visualizations: 2_000, price: 4_900, featured: false },
  { id: "p20k", visualizations: 20_000, price: 39_900, featured: true },
  { id: "p200k", visualizations: 200_000, price: 299_000, featured: false },
];

export function getPack(id: string | null | undefined): Pack | undefined {
  return PACKS.find((pack) => pack.id === id);
}

export function getPackByVisualizations(visualizations: number): Pack | undefined {
  return PACKS.find((pack) => pack.visualizations === visualizations);
}
