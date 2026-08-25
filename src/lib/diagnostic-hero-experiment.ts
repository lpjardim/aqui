import { prisma } from "@/lib/prisma";
import { DiagnosticEventType, DiagnosticHeroVariant } from "@/generated/prisma/enums";
import {
  computeDiagnosticHeroVariantRates,
  type DiagnosticHeroVariantRawCounts,
  type DiagnosticHeroVariantRates,
} from "@/lib/diagnostic-hero-rates";

export {
  computeDiagnosticHeroVariantRates,
  type DiagnosticHeroVariantRawCounts,
  type DiagnosticHeroVariantRates,
};

/**
 * KPIs do A/B/C test do Hero de `/diagnostico` (`diagnostic_hero_v1`) — ao
 * contrário dos testes de Preços/Hero/Landing (tabelas de eventos
 * próprias), aqui reaproveitamos o `DiagnosticEvent` já existente do funil
 * `/diagnostico`: cada evento desta corrida carrega a variante do Hero
 * ativa nessa sessão (`heroVariant`, ver `src/lib/diagnostic-context.ts`),
 * por isso não é preciso nenhuma tabela nem JOIN adicional — só filtrar por
 * `heroVariant` em vez de olhar para o funil como um todo (ver
 * `src/lib/diagnostic-report.ts`). O financeiro (encomendas/receita) vem
 * sempre diretamente da `Order` (campo `diagnosticHeroVariant`), nunca de
 * eventos do cliente.
 */

async function distinctVisitorCount(
  variant: DiagnosticHeroVariant,
  eventType: DiagnosticEventType,
): Promise<number> {
  const rows = await prisma.diagnosticEvent.findMany({
    where: { heroVariant: variant, eventType, isDebug: false },
    distinct: ["visitorId"],
    select: { visitorId: true },
  });
  return rows.length;
}

/** Mesma definição de "pago" que os outros relatórios (ver `src/lib/experiments.ts`). */
const PAID_ORDER_STATUSES = ["PAID", "IN_REVIEW", "ACTIVE", "COMPLETED"] as const;

export type DiagnosticHeroVariantReport = DiagnosticHeroVariantRates & {
  variant: DiagnosticHeroVariant;
};

export async function getDiagnosticHeroExperimentReport(): Promise<DiagnosticHeroVariantReport[]> {
  const variants: DiagnosticHeroVariant[] = [
    DiagnosticHeroVariant.PAIN,
    DiagnosticHeroVariant.WORD_OF_MOUTH,
    DiagnosticHeroVariant.GROWTH,
  ];

  return Promise.all(
    variants.map(async (variant) => {
      const [visitors, ctaClicks, starts, completed, previewStarted, previewCompleted, checkoutStarted, orders] =
        await Promise.all([
          distinctVisitorCount(variant, DiagnosticEventType.HERO_VIEWED),
          distinctVisitorCount(variant, DiagnosticEventType.HERO_CTA_CLICKED),
          distinctVisitorCount(variant, DiagnosticEventType.STARTED),
          distinctVisitorCount(variant, DiagnosticEventType.COMPLETED),
          distinctVisitorCount(variant, DiagnosticEventType.PREVIEW_STARTED),
          distinctVisitorCount(variant, DiagnosticEventType.PREVIEW_COMPLETED),
          distinctVisitorCount(variant, DiagnosticEventType.CHECKOUT_STARTED),
          prisma.order.findMany({
            where: { diagnosticHeroVariant: variant, diagnosticHeroExperimentDebug: false },
            select: { status: true, price: true },
          }),
        ]);

      const paidOrders = orders.filter((order) =>
        (PAID_ORDER_STATUSES as readonly string[]).includes(order.status),
      );

      const counts: DiagnosticHeroVariantRawCounts = {
        visitors,
        ctaClicks,
        starts,
        completed,
        previewStarted,
        previewCompleted,
        checkoutStarted,
        ordersCreated: orders.length,
        paymentsCompleted: paidOrders.length,
        revenueCents: paidOrders.reduce((sum, order) => sum + order.price, 0),
      };

      return { variant, ...computeDiagnosticHeroVariantRates(counts) };
    }),
  );
}
