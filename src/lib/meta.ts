import { prisma } from "@/lib/prisma";
import {
  sendCampaignActivatedEmail,
  sendCampaignCompletedEmail,
  sendInternalNotification,
} from "@/lib/email";
import { getExpectedMetaCampaignName } from "@/lib/orders";
import type { DeliveryCycle, Order, User } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

const DEFAULT_GRAPH_API_VERSION = "v21.0";
const FETCH_TIMEOUT_MS = 8_000;
const META_SYNC_SETTING_KEY = "metaLastSyncAt";

/** Percentagem de entrega a partir da qual enviamos UM alerta interno antecipado por ciclo. */
const NEAR_TARGET_THRESHOLD = 0.9;

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
 * Chamada de ESCRITA à Graph API da Meta (POST). Usada exclusivamente para
 * pausar (`pauseMetaCampaign`) e reativar (`resumeMetaCampaign`) campanhas —
 * nunca para alterar orçamento, targeting, ad sets, ads ou creatives. Nunca
 * regista o access token em logs.
 */
async function metaGraphPost(path: string, params: Record<string, string>): Promise<unknown> {
  const accessToken = requireAccessToken();

  const url = new URL(`https://graph.facebook.com/${graphApiVersion()}${path}`);
  const body = new URLSearchParams({ ...params, access_token: accessToken });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `timeout após ${FETCH_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : "erro de rede desconhecido";
    throw new Error(`Falha de rede ao escrever na Meta Graph API (${path}): ${reason}`);
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

export type MetaWriteResult = { ok: boolean; error?: string };

/**
 * Pausa uma campanha Meta (`POST /{campaignId}` com `status=PAUSED`).
 * Nunca altera orçamento, targeting, ad sets, ads ou creatives.
 *
 * Idempotente: pausar uma campanha já pausada é um pedido válido para a
 * própria Graph API (não falha), por isso não fazemos nenhuma verificação
 * prévia de estado — simplifica o código e evita uma chamada extra.
 */
export async function pauseMetaCampaign(campaignId: string): Promise<MetaWriteResult> {
  try {
    await metaGraphPost(`/${campaignId}`, { status: "PAUSED" });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

/**
 * Reativa (`status=ACTIVE`) a campanha Meta principal de uma Order no início
 * de um novo ciclo de entrega mensal — usada apenas quando o ciclo anterior
 * tiver sido pausado por nós especificamente por ter atingido o alvo
 * (`TARGET_REACHED`). Idempotente da mesma forma que `pauseMetaCampaign`.
 */
export async function resumeMetaCampaign(campaignId: string): Promise<MetaWriteResult> {
  try {
    await metaGraphPost(`/${campaignId}`, { status: "ACTIVE" });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Consulta a Meta Ads Insights API para uma campanha, ad set ou anúncio e
 * devolve o total de "impressions" (não "reach" — na Aqui. "visualizações"
 * corresponde a impressions) DENTRO da janela `[since, hoje]`.
 *
 * Usa o `time_range` oficial da Insights API em vez de subtrair um baseline
 * lifetime: como a mesma campanha Meta é reutilizada em todos os ciclos de
 * uma subscrição mensal (e fica pausada entre ciclos, sem entrega no
 * intervalo), isto conta exatamente as impressions do ciclo atual, sem
 * risco de dupla contagem entre meses. Granularidade ao dia (não ao
 * segundo) — aceitável dado que a campanha não recebe entregas fora do
 * ciclo.
 */
export async function fetchMetaImpressions(objectId: string, since: Date): Promise<number> {
  const payload = await metaGraphGet(`/${objectId}/insights`, {
    fields: "impressions",
    time_range: JSON.stringify({ since: toDateOnly(since), until: toDateOnly(new Date()) }),
  });

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

function campaignDashboardLink(orderId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://aqui.network";
  return `${appUrl}/painel/campanhas/${orderId}`;
}

/**
 * Associa uma encomenda a uma campanha Meta já confirmada (match único pelo
 * nome esperado, ou escolhida manualmente no admin). Guarda o ad set e o
 * anúncio "principal" (primeiro encontrado) apenas para efeitos de
 * pré-visualização — a sincronização de impressions passa a usar sempre o
 * `metaCampaignId` (nível de campanha), nunca precisa destes IDs. A
 * campanha é sempre a "principal" da Order, reutilizada em todos os ciclos
 * de entrega (nunca associada por ciclo).
 *
 * Dispara também o email "A sua campanha já está ativa" ao cliente — UMA
 * única vez por encomenda, mesmo que a campanha seja reassociada depois.
 */
export async function associateOrderWithCampaign(orderId: string, campaignId: string) {
  const children = await getMetaCampaignChildren(campaignId);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      metaCampaignId: campaignId,
      metaAdSetId: children.adSets[0]?.id ?? null,
      metaAdId: children.ads[0]?.id ?? null,
    },
    include: { user: true },
  });

  await sendActivationEmailOnce(updated, children.ads.length);

  return updated;
}

async function sendActivationEmailOnce(order: Order & { user: User }, adCount: number): Promise<void> {
  if (order.metaActivationEmailSentAt) return;

  try {
    const dashboardLink = campaignDashboardLink(order.id);
    await sendCampaignActivatedEmail(order.user.email, {
      companyName: order.user.companyName,
      zone: order.zone,
      purchased: order.visualizationsPurchased,
      dashboardLink,
      adPreviewLink: adCount > 0 ? `${dashboardLink}?anuncio=1` : dashboardLink,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { metaActivationEmailSentAt: new Date() },
    });
  } catch (error) {
    // Falha a enviar o email nunca deve desfazer a associação Meta já guardada.
    console.error(
      `[meta] falha ao enviar email de ativação ao cliente (encomenda ${order.id}):`,
      error instanceof Error ? error.message : error,
    );
  }
}

type OrderWithUser = Order & { user: User };

/**
 * Aplica um novo valor de visualizações (impressions) vindo da Meta a UM
 * ciclo de entrega específico (`DeliveryCycle`) — nunca à Order
 * diretamente, para que ciclos mensais sucessivos não somem indefinidamente
 * sobre o mesmo total.
 *
 * - `deliveredViews` nunca desce dentro do mesmo ciclo: se a Meta devolver
 *   temporariamente um valor inferior ao já registado, mantém-se o maior
 *   valor conhecido.
 * - `deliveredViews` fica sempre limitado a `targetViews` do ciclo (o
 *   progresso no painel nunca passa de 100% do ciclo atual).
 * - `order.visualizationsDelivered` é atualizado como CACHE do ciclo atual,
 *   para listagens simples (admin/painel) não precisarem de juntar tabelas.
 * - O valor "em bruto" devolvido pela Meta fica registado no histórico
 *   (`CampaignUpdate`, com `cycleId`) para auditoria, mesmo que seja maior
 *   que o alvo do ciclo.
 * - Aos 90% do alvo do ciclo, envia UM alerta interno antecipado (não pausa
 *   nada).
 * - Ao atingir o alvo do ciclo pela primeira vez, guarda `targetReachedAt`
 *   (no ciclo) e envia UMA notificação interna.
 * - Sempre que o alvo já foi atingido mas a campanha ainda não está pausada
 *   (`targetReachedAt` definido e `metaPausedAt` ainda `null` no ciclo),
 *   tenta pausar a campanha Meta — cobre tanto o momento em que o alvo é
 *   atingido agora, como retries automáticos de falhas de pausa em syncs
 *   anteriores.
 *
 * Pensada para ser chamada tanto pela sincronização automática
 * (`syncActiveCampaigns`) como pelo botão manual no `/admin`.
 */
export async function applyDeliveredViews(cycleId: string, metaImpressions: number) {
  const cycle = await prisma.deliveryCycle.findUnique({
    where: { id: cycleId },
    include: { order: { include: { user: true } } },
  });
  if (!cycle) return null;
  if (cycle.status !== "ACTIVE") return cycle; // já concluído — nada a fazer.

  const order: OrderWithUser = cycle.order;

  const rawValue = Math.max(0, Math.round(metaImpressions));
  const cappedValue =
    cycle.targetViews > 0 ? Math.min(rawValue, cycle.targetViews) : rawValue;
  const displayValue = Math.max(cycle.deliveredViews, cappedValue);

  const justReachedTarget =
    !cycle.targetReachedAt && cycle.targetViews > 0 && displayValue >= cycle.targetViews;

  const justCrossedNearTarget =
    !cycle.nearTargetNotifiedAt &&
    !justReachedTarget &&
    !cycle.targetReachedAt &&
    cycle.targetViews > 0 &&
    displayValue / cycle.targetViews >= NEAR_TARGET_THRESHOLD;

  const updatedCycle = await prisma.$transaction(async (tx) => {
    const next = await tx.deliveryCycle.update({
      where: { id: cycleId },
      data: {
        deliveredViews: displayValue,
        ...(justReachedTarget ? { targetReachedAt: new Date() } : {}),
        ...(justCrossedNearTarget ? { nearTargetNotifiedAt: new Date() } : {}),
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { visualizationsDelivered: displayValue },
    });
    await tx.campaignUpdate.create({
      data: { orderId: order.id, cycleId, visualizationsDelivered: rawValue },
    });
    return next;
  });

  if (justCrossedNearTarget) {
    await notifyNearTarget(order.user, order, updatedCycle);
  }

  if (justReachedTarget) {
    await notifyTargetReached(order.user, order, updatedCycle);
  }

  // Tenta pausar (e concluir) sempre que o alvo já está atingido mas a
  // pausa ainda não foi confirmada — cobre o caso atual e retries.
  if (updatedCycle.targetReachedAt && !updatedCycle.metaPausedAt && order.metaCampaignId) {
    await tryPauseAndComplete(updatedCycle, order);
  }

  return updatedCycle;
}

async function notifyNearTarget(user: User, order: Order, cycle: DeliveryCycle): Promise<void> {
  try {
    await sendInternalNotification(
      "Campanha a aproximar-se do limite — Aqui.",
      [
        `Encomenda: ${order.id}`,
        `Ciclo: ${cycle.id}`,
        `Cliente: ${user.companyName} (${user.email})`,
        `Zona: ${order.zone}`,
        `Visualizações compradas (ciclo): ${cycle.targetViews}`,
        `Visualizações Meta atuais (ciclo): ${cycle.deliveredViews}`,
        `(${Math.round((cycle.deliveredViews / cycle.targetViews) * 100)}% do alvo)`,
        "",
        "Apenas informativo — a pausa automática só acontece ao atingir 100%.",
      ].join("\n"),
    );
  } catch (error) {
    console.error("[meta] falha ao enviar alerta interno de aproximação do alvo", error);
  }
}

async function notifyTargetReached(user: User, order: Order, cycle: DeliveryCycle): Promise<void> {
  const adminLink = adminOrderLink(order.id);

  try {
    await sendInternalNotification(
      "Campanha atingiu o limite — Aqui.",
      [
        `Encomenda: ${order.id}`,
        `Ciclo: ${cycle.id}`,
        `Cliente: ${user.companyName} (${user.email})`,
        `Zona: ${order.zone}`,
        `Visualizações compradas (ciclo): ${cycle.targetViews}`,
        `Visualizações Meta atuais (ciclo): ${cycle.deliveredViews}`,
        order.metaCampaignId ? `Meta Campaign ID: ${order.metaCampaignId}` : null,
        adminLink ? `Ver no admin: ${adminLink}` : null,
        "",
        order.metaCampaignId
          ? "A tentar pausar a campanha na Meta automaticamente."
          : "Sem metaCampaignId — não é possível pausar automaticamente.",
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    );
  } catch (error) {
    console.error("[meta] falha ao enviar notificação interna de alvo atingido", error);
  }
}

function adminOrderLink(orderId: string): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return appUrl ? `${appUrl}/admin#order-${orderId}` : null;
}

/**
 * Tenta pausar a campanha Meta principal de uma Order cujo ciclo atual já
 * atingiu o alvo, e concluir o fluxo (ciclo `COMPLETED`, email interno,
 * email ao cliente) só depois de a Meta confirmar a pausa. Nunca pausa
 * encomendas canceladas, reembolsadas, já concluídas ou sem
 * `metaCampaignId` — chamada apenas quando essas condições já foram
 * validadas por quem invoca esta função.
 *
 * Para encomendas `ONE_TIME`, marca também `Order.status = COMPLETED`; para
 * `MONTHLY`, só o `DeliveryCycle` é concluído — a Order/subscrição continua
 * ativa para a próxima renovação.
 *
 * Se a pausa falhar: não marca como concluído, mantém `targetReachedAt` no
 * ciclo, regista o erro em `metaPauseLastError` e envia um email interno de
 * falha — a tentativa repete-se automaticamente no próximo sync
 * (`applyDeliveredViews`) ou manualmente pelo botão "Tentar pausar
 * novamente" no `/admin`.
 */
async function tryPauseAndComplete(cycle: DeliveryCycle, order: OrderWithUser): Promise<void> {
  // Defesa extra: nunca pausar encomendas canceladas, reembolsadas, já
  // concluídas, sem campanha associada ou ciclos já concluídos, mesmo que
  // chamada diretamente (ex.: `retryMetaPause`) em vez de vir do fluxo
  // normal de sync.
  if (!order.metaCampaignId) return;
  if (!SYNCABLE_STATUSES.includes(order.status)) return;
  if (cycle.status !== "ACTIVE") return;

  const result = await pauseMetaCampaign(order.metaCampaignId);

  if (!result.ok) {
    console.error(
      `[meta] falha ao pausar a campanha ${order.metaCampaignId} (ciclo ${cycle.id}): ${result.error}`,
    );
    await prisma.deliveryCycle.update({
      where: { id: cycle.id },
      data: { metaPauseLastError: result.error ?? "Erro desconhecido" },
    });
    await notifyPauseFailed(order.user, order, cycle, result.error);
    return;
  }

  const now = new Date();
  const completedCycle = await prisma.$transaction(async (tx) => {
    const updated = await tx.deliveryCycle.update({
      where: { id: cycle.id },
      data: {
        metaPausedAt: now,
        metaPauseReason: "TARGET_REACHED",
        metaPauseLastError: null,
        status: "COMPLETED",
        completedAt: now,
      },
    });

    if (order.billingFrequency === "ONE_TIME") {
      await tx.order.update({ where: { id: order.id }, data: { status: "COMPLETED" } });
    }

    return updated;
  });

  await notifyPauseConfirmed(order.user, order, completedCycle);
  await sendCompletionEmailOnce(order, completedCycle);
}

/**
 * Repete manualmente a tentativa de pausa para um ciclo cujo alvo já foi
 * atingido mas cuja pausa ainda não foi confirmada — usada pelo botão
 * "Tentar pausar novamente" no `/admin`.
 */
export async function retryMetaPause(cycleId: string): Promise<void> {
  const cycle = await prisma.deliveryCycle.findUnique({
    where: { id: cycleId },
    include: { order: { include: { user: true } } },
  });
  if (!cycle) throw new Error("Ciclo não encontrado.");
  if (!cycle.targetReachedAt) throw new Error("Este ciclo ainda não atingiu o alvo.");
  if (cycle.metaPausedAt) return; // já está pausado, nada a fazer

  const order = cycle.order;
  if (!order.metaCampaignId) throw new Error("Esta encomenda não tem campanha Meta associada.");
  if (!SYNCABLE_STATUSES.includes(order.status)) {
    throw new Error("Esta encomenda já não está num estado em que possa ser pausada.");
  }

  await tryPauseAndComplete(cycle, order);
}

async function notifyPauseFailed(
  user: User,
  order: Order,
  cycle: DeliveryCycle,
  error?: string,
): Promise<void> {
  const adminLink = adminOrderLink(order.id);
  try {
    await sendInternalNotification(
      "Limite atingido — falha ao pausar na Meta — Aqui.",
      [
        `Encomenda: ${order.id}`,
        `Ciclo: ${cycle.id}`,
        `Cliente: ${user.companyName} (${user.email})`,
        `Zona: ${order.zone}`,
        `Meta Campaign ID: ${order.metaCampaignId}`,
        `Erro: ${error ?? "desconhecido"}`,
        adminLink ? `Ver no admin: ${adminLink}` : null,
        "",
        "A entrega mantém-se ativa — vamos tentar pausar de novo no próximo sync, ou use \"Tentar pausar novamente\" no /admin.",
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    );
  } catch (notifyError) {
    console.error("[meta] falha ao enviar notificação interna de falha de pausa", notifyError);
  }
}

async function notifyPauseConfirmed(user: User, order: Order, cycle: DeliveryCycle): Promise<void> {
  const adminLink = adminOrderLink(order.id);
  try {
    await sendInternalNotification(
      "Campanha pausada e ciclo concluído — Aqui.",
      [
        `Encomenda: ${order.id}`,
        `Ciclo: ${cycle.id}`,
        `Cliente: ${user.companyName} (${user.email})`,
        `Zona: ${order.zone}`,
        `Visualizações compradas (ciclo): ${cycle.targetViews}`,
        `Visualizações entregues (ciclo): ${cycle.deliveredViews}`,
        `Meta Campaign ID: ${order.metaCampaignId}`,
        adminLink ? `Ver no admin: ${adminLink}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    );
  } catch (error) {
    console.error("[meta] falha ao enviar notificação interna de pausa confirmada", error);
  }
}

async function sendCompletionEmailOnce(order: OrderWithUser, cycle: DeliveryCycle): Promise<void> {
  if (cycle.completionEmailSentAt) return;

  try {
    await sendCampaignCompletedEmail(order.user.email, {
      companyName: order.user.companyName,
      zone: order.zone,
      purchased: cycle.targetViews,
      delivered: cycle.deliveredViews,
      dashboardLink: campaignDashboardLink(order.id),
    });
    await prisma.deliveryCycle.update({
      where: { id: cycle.id },
      data: { completionEmailSentAt: new Date() },
    });
  } catch (error) {
    // Falha a enviar o email nunca deve desfazer a pausa/conclusão já confirmadas.
    console.error(
      `[meta] falha ao enviar email de conclusão ao cliente (ciclo ${cycle.id}):`,
      error instanceof Error ? error.message : error,
    );
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
 * Se a renovação anterior (`invoice.paid`) tentou reativar a campanha Meta e
 * falhou (`metaPauseLastError` presente e `metaResumedAt` ainda nulo), tenta
 * de novo antes de ler impressions deste sync — idempotente da mesma forma
 * que `resumeMetaCampaign`.
 */
async function maybeResumeBeforeSync(order: Order, cycle: DeliveryCycle): Promise<void> {
  if (!order.metaCampaignId) return;
  if (cycle.metaResumedAt) return;
  if (!cycle.metaPauseLastError) return;

  const result = await resumeMetaCampaign(order.metaCampaignId);

  await prisma.deliveryCycle.update({
    where: { id: cycle.id },
    data: result.ok
      ? { metaResumedAt: new Date(), metaPauseLastError: null }
      : { metaPauseLastError: result.error ?? "Erro desconhecido" },
  });
}

/**
 * Percorre campanhas elegíveis (pagas, em revisão ou ativas — nunca
 * concluídas, rejeitadas ou reembolsadas), tenta primeiro auto-associar as
 * que ainda não têm `metaCampaignId` pelo nome esperado, e depois sincroniza
 * as impressions do ciclo de entrega ATIVO mais recente de cada encomenda
 * (ao nível da campanha, ou do anúncio, para encomendas antigas só com
 * `metaAdId`). Uma falha numa encomenda nunca impede as restantes de serem
 * sincronizadas.
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
    include: {
      cycles: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const results: MetaSyncResult[] = [];

  for (const order of orders) {
    const cycle = order.cycles[0];

    // Sem ciclo ativo (ex.: subscrição entre o fim de um ciclo e o
    // `invoice.paid` da renovação seguinte) — nada para sincronizar agora.
    if (!cycle) continue;

    try {
      await maybeResumeBeforeSync(order, cycle);

      // Preferir sempre o nível de campanha (agrega todos os ad sets/ads
      // sem risco de dupla contagem); só recorre ao ad isolado para
      // encomendas antigas que nunca chegaram a ter `metaCampaignId`.
      const objectId = order.metaCampaignId ?? order.metaAdId!;
      const impressions = await fetchMetaImpressions(objectId, cycle.startsAt);
      await applyDeliveredViews(cycle.id, impressions);
      results.push({ orderId: order.id, ok: true });
      console.info(`[meta] sincronizada encomenda ${order.id} (ciclo ${cycle.id})`);
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
