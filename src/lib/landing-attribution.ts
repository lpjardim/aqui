/**
 * Matemática pura (sem BD, sem cookies) do attribution do experimento
 * `landing_page_v1` ao longo de VÁRIAS sessões — capacidade que não existe
 * nos testes de Preços/Hero (sticky 30 dias, snapshot único na Order). Aqui
 * olhamos para o histórico completo de exposições (`LandingExperimentEvent`
 * tipo `EXPOSURE`) de cada `visitorId` e cruzamos com as Orders pagas desse
 * mesmo visitante — mesmo que a compra tenha acontecido numa sessão sem
 * nenhuma variante ativa (ex.: visitante voltou organicamente dias depois e
 * comprou sem passar de novo por `/go`).
 *
 * Separado propositadamente de `landing-attribution-report.ts` (que faz as
 * queries Prisma) para ser testável isoladamente, mesmo padrão de
 * `hero-experiment-rates.ts` vs `hero-experiment.ts`.
 *
 * Importante: os 4 modelos abaixo (direct/session, first-touch, last-touch,
 * any-touch/assisted) são leituras DIFERENTES do mesmo conjunto de compras —
 * nunca somar a receita dos 4 modelos como se fosse receita adicional.
 */
import { LandingVariant } from "@/generated/prisma/enums";

/** Compras pagas mínimas por variante antes de mostrar qualquer comparação —
 * abaixo disto a UI deve mostrar "Dados insuficientes" em vez de sugerir
 * qualquer vencedor. Corte simples de propósito (ver secção 28 do pedido:
 * não é necessário estatística avançada). */
export const MIN_SAMPLE_SIZE = 30;

export function hasEnoughSample(purchases: number): boolean {
  return purchases >= MIN_SAMPLE_SIZE;
}

export type PurchaseOrderInput = {
  id: string;
  visitorId: string;
  /** Variante da SESSÃO em que a Order foi criada — `null` quando a compra
   * aconteceu fora de uma sessão ativa de `/go` (ex.: retorno orgânico). */
  landingVariant: LandingVariant | null;
  price: number;
  createdAt: Date;
};

export type ExposureInput = {
  visitorId: string;
  variant: LandingVariant;
  createdAt: Date;
};

export type VariantAttributionCounts = {
  variant: LandingVariant;
  purchases: number;
  revenueCents: number;
};

export type LandingAttributionReport = {
  /** Conversão direta/de sessão — a Order foi criada com esta variante ativa. */
  direct: VariantAttributionCounts[];
  firstTouch: VariantAttributionCounts[];
  lastTouch: VariantAttributionCounts[];
  /** Any-touch/assisted — % de compradores que tiveram contacto com a
   * variante em qualquer momento da jornada (uma compra pode contar para
   * mais do que uma variante aqui, de propósito — não é receita agregável). */
  assisted: VariantAttributionCounts[];
  totalPaidOrders: number;
};

function emptyCounts(): Record<LandingVariant, VariantAttributionCounts> {
  return {
    NORMAL: { variant: LandingVariant.NORMAL, purchases: 0, revenueCents: 0 },
    SALES: { variant: LandingVariant.SALES, purchases: 0, revenueCents: 0 },
    BLOG: { variant: LandingVariant.BLOG, purchases: 0, revenueCents: 0 },
  };
}

function addPurchase(bucket: Record<LandingVariant, VariantAttributionCounts>, variant: LandingVariant, priceCents: number) {
  bucket[variant].purchases += 1;
  bucket[variant].revenueCents += priceCents;
}

function sortExposuresByVisitor(exposures: ExposureInput[]): Map<string, ExposureInput[]> {
  const exposuresByVisitor = new Map<string, ExposureInput[]>();
  for (const exposure of exposures) {
    const list = exposuresByVisitor.get(exposure.visitorId) ?? [];
    list.push(exposure);
    exposuresByVisitor.set(exposure.visitorId, list);
  }
  for (const list of exposuresByVisitor.values()) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  return exposuresByVisitor;
}

/**
 * Recebe as Orders pagas e o histórico de exposições já carregados, devolve
 * os 4 modelos de attribution. Testável isoladamente com o exemplo do
 * próprio pedido: blog (dia 1) → normal (dia 4) → sales (dia 7) → compra ⇒
 * first-touch = blog, last-touch = sales, assisted = blog + normal + sales.
 */
export function computeLandingAttributionReport(
  orders: PurchaseOrderInput[],
  exposures: ExposureInput[],
): LandingAttributionReport {
  const exposuresByVisitor = sortExposuresByVisitor(exposures);

  const direct = emptyCounts();
  const firstTouch = emptyCounts();
  const lastTouch = emptyCounts();
  const assisted = emptyCounts();

  for (const order of orders) {
    const priorExposures = (exposuresByVisitor.get(order.visitorId) ?? []).filter(
      (exposure) => exposure.createdAt.getTime() <= order.createdAt.getTime(),
    );

    if (order.landingVariant) {
      addPurchase(direct, order.landingVariant, order.price);
    }

    // Fallback: se por alguma razão não há evento de exposição gravado mas a
    // própria Order tem variante de sessão, não perder o sinal de
    // first/last/any-touch por causa disso.
    const first = priorExposures[0]?.variant ?? order.landingVariant ?? null;
    const last = priorExposures[priorExposures.length - 1]?.variant ?? order.landingVariant ?? null;
    const anyTouchVariants = new Set<LandingVariant>(priorExposures.map((exposure) => exposure.variant));
    if (order.landingVariant) anyTouchVariants.add(order.landingVariant);

    if (first) addPurchase(firstTouch, first, order.price);
    if (last) addPurchase(lastTouch, last, order.price);
    for (const variant of anyTouchVariants) {
      addPurchase(assisted, variant, order.price);
    }
  }

  return {
    direct: Object.values(direct),
    firstTouch: Object.values(firstTouch),
    lastTouch: Object.values(lastTouch),
    assisted: Object.values(assisted),
    totalPaidOrders: orders.length,
  };
}

export type JourneyStep = LandingVariant;

export type JourneyAggregate = {
  path: JourneyStep[];
  /** Rótulo pronto a mostrar, ex.: "Blog → Sales". */
  label: string;
  visitors: number;
  purchases: number;
  revenueCents: number;
};

const VARIANT_LABELS: Record<LandingVariant, string> = {
  NORMAL: "Normal",
  SALES: "Sales",
  BLOG: "Blog",
};

/** Colapsa repetições consecutivas (`blog, blog, normal` → `blog, normal`) —
 * refreshes/re-exposições da mesma variante não devem inflacionar o caminho. */
function collapseConsecutive(variants: LandingVariant[]): LandingVariant[] {
  const result: LandingVariant[] = [];
  for (const variant of variants) {
    if (result[result.length - 1] !== variant) result.push(variant);
  }
  return result;
}

/**
 * Jornadas mais comuns até à compra (secção 27 do pedido) — versão simples,
 * sem árvore de decisão nem estatística avançada: agrupa por sequência de
 * variantes (já colapsada) e soma visitantes/compras/receita por caminho.
 */
export function computeLandingJourneyReport(
  orders: PurchaseOrderInput[],
  exposures: ExposureInput[],
): JourneyAggregate[] {
  const exposuresByVisitor = sortExposuresByVisitor(exposures);

  const byPath = new Map<string, JourneyAggregate>();

  for (const order of orders) {
    const priorExposures = (exposuresByVisitor.get(order.visitorId) ?? []).filter(
      (exposure) => exposure.createdAt.getTime() <= order.createdAt.getTime(),
    );
    const rawPath = priorExposures.map((exposure) => exposure.variant);
    if (rawPath.length === 0 && order.landingVariant) rawPath.push(order.landingVariant);
    const path = collapseConsecutive(rawPath);
    if (path.length === 0) continue;

    const key = path.join("→");
    const existing = byPath.get(key);
    if (existing) {
      existing.visitors += 1;
      existing.purchases += 1;
      existing.revenueCents += order.price;
    } else {
      byPath.set(key, {
        path,
        label: path.map((variant) => VARIANT_LABELS[variant]).join(" → "),
        visitors: 1,
        purchases: 1,
        revenueCents: order.price,
      });
    }
  }

  return [...byPath.values()].sort((a, b) => b.purchases - a.purchases);
}
