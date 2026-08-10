import { prisma } from "@/lib/prisma";
import { sendInternalNotification } from "@/lib/email";
import { getExpectedMetaCampaignName } from "@/lib/orders";
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

function requireAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN não está configurado.");
  return token;
}

function requireAdAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) throw new Error("META_AD_ACCOUNT_ID não está configurado.");
  return id;
}

/**
 * Chamada genérica, só de leitura, à Graph API da Meta. Nunca regista o
 * access token em logs, mesmo em caso de erro. `path` deve começar por "/"
 * (ex.: "/act_123/campaigns" ou "/120248.../insights").
 */
async function metaGraphGet(path: string, params: Record<string, string>): Promise<unknown> {
  const accessToken = requireAccessToken();

  const url = new URL(`https://graph.facebook.com/${graphApiVersion()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
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
    throw new Error(`Falha de rede ao consultar a Meta Graph API (${path}): ${reason}`);
  } finally {
    clearTimeout(timeout);
  }

  const payload = await safeReadJson(response);

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : undefined) ?? `HTTP ${response.status}`;
    throw new Error(`Meta Graph API respondeu com erro (${path}): ${message}`);
  }

  return payload;
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Consulta a Meta Ads Insights API para uma campanha, ad set ou anúncio e
 * devolve o total de "impressions" (não "reach" — na Aqui. "visualizações"
 * corresponde a impressions). Funciona com qualquer node id, porque a edge
 * `/insights` tem o mesmo formato em campaign/adset/ad.
 */
export async function fetchMetaImpressions(objectId: string): Promise<number> {
  const payload = await metaGraphGet(`/${objectId}/insights`, { fields: "impressions" });

  const rows = (payload as { data?: Array<{ impressions?: string }> } | null)?.data;
  const impressionsRaw = rows?.[0]?.impressions;

  // Sem linha de insights ainda (ex.: sem entregas registadas) é um 0 válido.
  if (impressionsRaw === undefined) return 0;

  const impressions = Number.parseInt(impressionsRaw, 10);
  if (!Number.isFinite(impressions) || impressions < 0) {
    throw new Error(
      `Valor de "impressions" inesperado na resposta da Meta (${objectId}): "${impressionsRaw}"`,
    );
  }

  return impressions;
}

export type MetaCampaignMatch = { id: string; name: string; effectiveStatus: string };

/**
 * Procura campanhas na conta de anúncios configurada (`META_AD_ACCOUNT_ID`)
 * cujo nome seja EXATAMENTE `name`. Usa o parâmetro `filtering` da própria
 * Graph API (operador EQUAL) em vez de filtrar fuzzy no nosso lado.
 */
export async function findMetaCampaignsByExactName(name: string): Promise<MetaCampaignMatch[]> {
  const accountId = requireAdAccountId();

  const payload = await metaGraphGet(`/act_${accountId}/campaigns`, {
    fields: "id,name,effective_status",
    filtering: JSON.stringify([{ field: "name", operator: "EQUAL", value: name }]),
  });

  const rows =
    (payload as { data?: Array<{ id: string; name: string; effective_status: string }> })?.data ??
    [];

  return rows.map((row) => ({ id: row.id, name: row.name, effectiveStatus: row.effective_status }));
}

export type MetaCampaignChildren = {
  adSets: { id: string; name: string }[];
  ads: { id: string; name: string; adSetId: string }[];
};

/** Lista os ad sets e ads (anúncios) de uma campanha — uma campanha pode ter vários. */
export async function getMetaCampaignChildren(campaignId: string): Promise<MetaCampaignChildren> {
  const [adSetsPayload, adsPayload] = await Promise.all([
    metaGraphGet(`/${campaignId}/adsets`, { fields: "id,name" }),
    metaGraphGet(`/${campaignId}/ads`, { fields: "id,name,adset_id" }),
  ]);

  const adSets = (
    (adSetsPayload as { data?: Array<{ id: string; name: string }> })?.data ?? []
  ).map((row) => ({ id: row.id, name: row.name }));

  const ads = (
    (adsPayload as { data?: Array<{ id: string; name: string; adset_id: string }> })?.data ?? []
  ).map((row) => ({ id: row.id, name: row.name, adSetId: row.adset_id }));

  return { adSets, ads };
}

/**
 * Devolve o HTML de pré-visualização (iframe) de um anúncio, gerado na hora
 * pela Ad Previews API. É um URL assinado e temporário — nunca deve ser
 * guardado na BD, apenas pedido de novo sempre que a página do cliente é
 * renderizada. Funciona apenas com `ads_read` (não precisa de permissões de
 * Página). Em caso de falha devolve `null` em vez de rebentar a página.
 */
export async function getAdPreviewHtml(
  adId: string,
  adFormat = "MOBILE_FEED_STANDARD",
): Promise<string | null> {
  try {
    const payload = await metaGraphGet(`/${adId}/previews`, { ad_format: adFormat });
    const rows = (payload as { data?: Array<{ body?: string }> } | null)?.data;
    return rows?.[0]?.body ?? null;
  } catch (error) {
    console.error(
      `[meta] falha ao gerar pré-visualização do anúncio ${adId}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Associa uma encomenda a uma campanha Meta já confirmada (match único pelo
 * nome esperado, ou escolhida manualmente no admin). Guarda o ad set e o
 * anúncio "principal" (primeiro encontrado) apenas para efeitos de
 * pré-visualização — a sincronização de impressions passa a usar sempre o
 * `metaCampaignId` (nível de campanha), nunca precisa destes IDs.
 */
export async function associateOrderWithCampaign(orderId: string, campaignId: string) {
  const children = await getMetaCampaignChildren(campaignId);

  return prisma.order.update({
    where: { id: orderId },
    data: {
      metaCampaignId: campaignId,
      metaAdSetId: children.adSets[0]?.id ?? null,
      metaAdId: children.ads[0]?.id ?? null,
    },
  });
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
 * Para encomendas elegíveis (pagas, em revisão ou ativas) que ainda não têm
 * `metaCampaignId`, tenta encontrar automaticamente a campanha na Meta pelo
 * nome esperado (`getExpectedMetaCampaignName`). Só associa quando há
 * exatamente 1 correspondência exata — 0 ou várias ficam para associação
 * manual no `/admin`. Uma falha numa encomenda nunca impede as restantes.
 */
async function autoAssociateEligibleOrders(): Promise<void> {
  const candidates = await prisma.order.findMany({
    where: { status: { in: SYNCABLE_STATUSES }, metaCampaignId: null },
    include: { user: true },
  });

  for (const order of candidates) {
    try {
      const expectedName = getExpectedMetaCampaignName(order);
      const matches = await findMetaCampaignsByExactName(expectedName);

      if (matches.length === 1) {
        await associateOrderWithCampaign(order.id, matches[0].id);
        console.info(
          `[meta] encomenda ${order.id} associada automaticamente à campanha ${matches[0].id}`,
        );
      }
      // 0 ou >1 correspondências: fica pendente para associação manual no /admin.
    } catch (error) {
      console.error(
        `[meta] falha ao tentar auto-associar a encomenda ${order.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

/**
 * Percorre campanhas elegíveis (pagas, em revisão ou ativas — nunca
 * concluídas, rejeitadas ou reembolsadas), tenta primeiro auto-associar as
 * que ainda não têm `metaCampaignId` pelo nome esperado, e depois sincroniza
 * as impressions ao nível da campanha (ou do anúncio, para encomendas
 * antigas só com `metaAdId`). Uma falha numa encomenda nunca impede as
 * restantes de serem sincronizadas.
 *
 * Chamada tanto pelo cron (`/api/cron/meta-sync`) como pelo botão manual
 * "Sincronizar Meta" no `/admin`.
 */
export async function syncActiveCampaigns(): Promise<MetaSyncResult[]> {
  await autoAssociateEligibleOrders();

  const orders = await prisma.order.findMany({
    where: {
      status: { in: SYNCABLE_STATUSES },
      OR: [{ metaCampaignId: { not: null } }, { metaAdId: { not: null } }],
    },
  });

  const results: MetaSyncResult[] = [];

  for (const order of orders) {
    try {
      // Preferir sempre o nível de campanha (agrega todos os ad sets/ads
      // sem risco de dupla contagem); só recorre ao ad isolado para
      // encomendas antigas que nunca chegaram a ter `metaCampaignId`.
      const objectId = order.metaCampaignId ?? order.metaAdId!;
      const impressions = await fetchMetaImpressions(objectId);
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
