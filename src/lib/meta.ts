import { prisma } from "@/lib/prisma";
import { sendInternalNotification } from "@/lib/email";
import type { Order, User } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

const DEFAULT_GRAPH_API_VERSION = "v21.0";
const FETCH_TIMEOUT_MS = 8_000;
const META_SYNC_SETTING_KEY = "metaLastSyncAt";

/** Estados em que uma campanha ainda pode estar a receber entregas da Meta. */
const SYNCABLE_STATUSES: OrderStatus[] = ["PAID", "IN_REVIEW", "ACTIVE"];

function graphApiVersion(): string {
  return process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION;
}

/**
 * Consulta a Meta Ads Insights API para um anúncio (`metaAdId`) e devolve o
 * total de "impressions" (não "reach" — na Aqui. "visualizações" corresponde
 * a impressions). Requer `META_ACCESS_TOKEN` configurado no ambiente.
 *
 * Nunca regista o token em logs, mesmo em caso de erro.
 */
export async function fetchMetaDeliveredViews(metaAdId: string): Promise<number> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN não está configurado.");
  }

  const url = new URL(`https://graph.facebook.com/${graphApiVersion()}/${metaAdId}/insights`);
  url.searchParams.set("fields", "impressions");
  url.searchParams.set("access_token", accessToken);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal, cache: "no-store" });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `timeout após ${FETCH_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : "erro de rede desconhecido";
    throw new Error(`Falha de rede ao consultar a Meta Insights API (ad ${metaAdId}): ${reason}`);
  } finally {
    clearTimeout(timeout);
  }

  const payload = await safeReadJson(response);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : undefined) ?? `HTTP ${response.status}`;
    throw new Error(`Meta Insights API respondeu com erro para o ad ${metaAdId}: ${message}`);
  }

  const rows = (payload as { data?: Array<{ impressions?: string }> } | null)?.data;
  const impressionsRaw = rows?.[0]?.impressions;

  // Sem linha de insights ainda (ex.: anúncio sem entregas registadas) é um 0 válido.
  if (impressionsRaw === undefined) return 0;

  const impressions = Number.parseInt(impressionsRaw, 10);
  if (!Number.isFinite(impressions) || impressions < 0) {
    throw new Error(
      `Valor de "impressions" inesperado na resposta da Meta para o ad ${metaAdId}: "${impressionsRaw}"`,
    );
  }

  return impressions;
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Aplica um novo valor de visualizações (impressions) vindo da Meta a uma
 * encomenda.
 *
 * - `visualizationsDelivered` nunca desce: se a Meta devolver temporariamente
 *   um valor inferior ao já registado, mantém-se o maior valor conhecido.
 * - `visualizationsDelivered` fica sempre limitado a `visualizationsPurchased`
 *   (o progresso no painel nunca passa de 100%).
 * - O valor "em bruto" devolvido pela Meta fica registado no histórico
 *   (`CampaignUpdate`) para auditoria, mesmo que seja maior que o comprado.
 * - Ao atingir o alvo pela primeira vez, guarda `targetReachedAt` e envia UMA
 *   notificação interna. Não pausa nem altera o `status` automaticamente.
 *
 * Pensada para ser chamada tanto pela sincronização automática
 * (`syncActiveCampaigns`) como pelo botão manual no `/admin`.
 */
export async function applyDeliveredViews(orderId: string, metaImpressions: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) return null;

  const rawValue = Math.max(0, Math.round(metaImpressions));
  const cappedValue = order.visualizationsPurchased > 0
    ? Math.min(rawValue, order.visualizationsPurchased)
    : rawValue;
  const displayValue = Math.max(order.visualizationsDelivered, cappedValue);

  const justReachedTarget =
    !order.targetReachedAt &&
    order.visualizationsPurchased > 0 &&
    displayValue >= order.visualizationsPurchased;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.order.update({
      where: { id: orderId },
      data: {
        visualizationsDelivered: displayValue,
        ...(justReachedTarget ? { targetReachedAt: new Date() } : {}),
      },
    });
    // Guarda o valor em bruto devolvido pela Meta (auditoria), não o valor
    // já limitado usado para o progresso apresentado.
    await tx.campaignUpdate.create({
      data: { orderId, visualizationsDelivered: rawValue },
    });
    return next;
  });

  if (justReachedTarget) {
    await notifyTargetReached(order.user, updated);
  }

  return updated;
}

async function notifyTargetReached(user: User, order: Order): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const adminLink = appUrl ? `${appUrl}/admin#order-${order.id}` : null;

  try {
    await sendInternalNotification(
      "Campanha atingiu o limite — Aqui.",
      [
        `Encomenda: ${order.id}`,
        `Cliente: ${user.companyName} (${user.email})`,
        `Zona: ${order.zone}`,
        `Visualizações compradas: ${order.visualizationsPurchased}`,
        `Visualizações Meta atuais: ${order.visualizationsDelivered}`,
        order.metaCampaignId ? `Meta Campaign ID: ${order.metaCampaignId}` : null,
        order.metaAdSetId ? `Meta Ad Set ID: ${order.metaAdSetId}` : null,
        order.metaAdId ? `Meta Ad ID: ${order.metaAdId}` : null,
        adminLink ? `Ver no admin: ${adminLink}` : null,
        "",
        "A campanha NÃO foi pausada automaticamente — confirmar próximos passos manualmente no /admin.",
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    );
  } catch (error) {
    console.error("[meta] falha ao enviar notificação interna de alvo atingido", error);
  }
}

export type MetaSyncResult = { orderId: string; ok: boolean; error?: string };

/**
 * Percorre campanhas elegíveis (pagas, em revisão ou ativas, com `metaAdId`
 * definido — nunca concluídas, rejeitadas ou reembolsadas), consulta a Meta
 * para cada uma e aplica o valor devolvido. Uma falha numa encomenda nunca
 * impede as restantes de serem sincronizadas.
 *
 * Chamada tanto pelo cron (`/api/cron/meta-sync`) como pelo botão manual
 * "Sincronizar Meta" no `/admin`.
 */
export async function syncActiveCampaigns(): Promise<MetaSyncResult[]> {
  const orders = await prisma.order.findMany({
    where: { status: { in: SYNCABLE_STATUSES }, metaAdId: { not: null } },
  });

  const results: MetaSyncResult[] = [];

  for (const order of orders) {
    try {
      const impressions = await fetchMetaDeliveredViews(order.metaAdId!);
      await applyDeliveredViews(order.id, impressions);
      results.push({ orderId: order.id, ok: true });
      console.info(`[meta] sincronizada encomenda ${order.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`[meta] falha ao sincronizar encomenda ${order.id}: ${message}`);
      results.push({ orderId: order.id, ok: false, error: message });
    }
  }

  await recordMetaSyncCompletion();

  return results;
}

async function recordMetaSyncCompletion(): Promise<void> {
  const value = new Date().toISOString();
  await prisma.appSetting.upsert({
    where: { key: META_SYNC_SETTING_KEY },
    create: { key: META_SYNC_SETTING_KEY, value },
    update: { value },
  });
}

export async function getLastMetaSyncAt(): Promise<Date | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: META_SYNC_SETTING_KEY } });
  return setting ? new Date(setting.value) : null;
}
