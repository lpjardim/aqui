export const NATIONAL_ZONE = "Portugal — Nacional";

export const DISTRICTS = [
  "Aveiro",
  "Beja",
  "Braga",
  "Bragança",
  "Castelo Branco",
  "Coimbra",
  "Évora",
  "Faro",
  "Guarda",
  "Leiria",
  "Lisboa",
  "Portalegre",
  "Porto",
  "Santarém",
  "Setúbal",
  "Viana do Castelo",
  "Vila Real",
  "Viseu",
] as const;

export const ZONES: string[] = [NATIONAL_ZONE, ...DISTRICTS];

export function isValidZone(zone: string): boolean {
  return ZONES.includes(zone);
}
