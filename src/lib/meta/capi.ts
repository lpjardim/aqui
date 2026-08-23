import {
  hashCountry,
  hashEmail,
  hashExternalId,
  hashFirstName,
  hashLastName,
  hashPhone,
  hashZip,
} from "@/lib/meta/hash";

/**
 * Cliente da Meta Conversions API — envia eventos server-side para o dataset
 * "Aqui." (Events Manager). Desenhado com a mesma postura defensiva do
 * cliente Marketing API já existente em `src/lib/meta.ts` (timeout, nunca
 * regista o access token, falha nunca deve rebentar o fluxo que chama isto),
 * mas é um módulo completamente separado — não partilha código nem estado
 * com a integração de Ads Sync.
 *
 * Documentação oficial usada:
 * https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */

const DEFAULT_GRAPH_API_VERSION = "v21.0";
const FETCH_TIMEOUT_MS = 5_000;

export type MetaEventName = "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase" | "Subscribe";

/** Origem do envio — só para os logs (nunca vai no payload enviado à Meta). */
export type MetaCapiOrigin = "pixel-relay" | "webhook";

export type MetaActionSource = "website";

export type MetaUserData = {
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
  /** Nome completo — dividido internamente em `fn` (1º token) e `ln` (resto). */
  fullName?: string | null;
  /** Código ISO 3166-1 alpha-2 (ex.: "PT"). Só disponível quando a Stripe devolve endereço de faturação. */
  country?: string | null;
  /** Código postal. Só disponível quando a Stripe devolve endereço de faturação. */
  zip?: string | null;
  /** Nunca hashed — string crua da cookie `_fbp`. */
  fbp?: string | null;
  /** Nunca hashed — string crua da cookie `_fbc` (ou construída a partir do `fbclid`). */
  fbc?: string | null;
  /** Nunca hashed. */
  clientIpAddress?: string | null;
  /** Nunca hashed. */
  clientUserAgent?: string | null;
};

export type MetaCustomData = {
  value?: number;
  currency?: string;
};

export type MetaCapiEventInput = {
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl: string;
  actionSource: MetaActionSource;
  eventTime?: Date;
  userData: MetaUserData;
  customData?: MetaCustomData;
  /** Só para logging de debug (nunca enviado à Meta) — de onde partiu esta chamada. */
  origin?: MetaCapiOrigin;
};

function graphApiVersion(): string {
  return process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION;
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN);
}

function buildUserData(userData: MetaUserData): Record<string, string | string[]> {
  const payload: Record<string, string | string[]> = {};

  const emHash = hashEmail(userData.email);
  if (emHash) payload.em = [emHash];

  const phHash = hashPhone(userData.phone);
  if (phHash) payload.ph = [phHash];

  const externalIdHash = hashExternalId(userData.externalId);
  if (externalIdHash) payload.external_id = [externalIdHash];

  const fnHash = hashFirstName(userData.fullName);
  if (fnHash) payload.fn = [fnHash];

  const lnHash = hashLastName(userData.fullName);
  if (lnHash) payload.ln = [lnHash];

  const countryHash = hashCountry(userData.country);
  if (countryHash) payload.country = [countryHash];

  const zipHash = hashZip(userData.zip);
  if (zipHash) payload.zp = [zipHash];

  if (userData.fbp) payload.fbp = userData.fbp;
  if (userData.fbc) payload.fbc = userData.fbc;
  if (userData.clientIpAddress) payload.client_ip_address = userData.clientIpAddress;
  if (userData.clientUserAgent) payload.client_user_agent = userData.clientUserAgent;

  return payload;
}

/**
 * Envia UM evento para a Conversions API. Nunca lança — uma falha de rede ou
 * de configuração é registada nos logs (sem o token) e devolvida como
 * `{ ok: false }`, para que quem chama (webhook Stripe, rota de checkout,
 * endpoint de tracking) nunca veja o fluxo principal interrompido por causa
 * disto.
 */
/**
 * Contexto de log comum a todas as linhas — nunca inclui o access token, o
 * `user_data` (pode ter hashes/PII) nem qualquer dado Stripe sensível. Só
 * IDs/URLs/timestamps, seguro para debug em produção (Vercel logs).
 */
function logContext(input: MetaCapiEventInput): Record<string, unknown> {
  return {
    event: input.eventName,
    eventId: input.eventId,
    eventSourceUrl: input.eventSourceUrl,
    origin: input.origin ?? "unknown",
    at: new Date().toISOString(),
  };
}

export async function sendMetaCapiEvent(
  input: MetaCapiEventInput,
): Promise<{ ok: boolean; error?: string }> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn(
      `[meta-capi] não configurado (NEXT_PUBLIC_META_PIXEL_ID/META_CAPI_ACCESS_TOKEN em falta) — evento ignorado`,
      JSON.stringify(logContext(input)),
    );
    return { ok: false, error: "não configurado" };
  }

  const eventTimeSeconds = Math.floor((input.eventTime ?? new Date()).getTime() / 1000);

  const eventPayload: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: eventTimeSeconds,
    event_id: input.eventId,
    event_source_url: input.eventSourceUrl,
    action_source: input.actionSource,
    user_data: buildUserData(input.userData),
  };

  if (input.customData) {
    eventPayload.custom_data = input.customData;
  }

  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  const body: Record<string, unknown> = { data: [eventPayload] };
  if (testEventCode) body.test_event_code = testEventCode;

  const url = new URL(`https://graph.facebook.com/${graphApiVersion()}/${pixelId}/events`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: accessToken }),
      signal: controller.signal,
      cache: "no-store",
    });

    const payload = await safeReadJson(response);

    if (!response.ok) {
      const message =
        (payload && typeof payload === "object" && "error" in payload
          ? (payload as { error?: { message?: string } }).error?.message
          : undefined) ?? `HTTP ${response.status}`;
      console.error(
        `[meta-capi] erro ao enviar evento: ${message}`,
        JSON.stringify(logContext(input)),
      );
      return { ok: false, error: message };
    }

    console.log("[meta-capi] evento enviado", JSON.stringify(logContext(input)));
    return { ok: true };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `timeout após ${FETCH_TIMEOUT_MS}ms`
        : error instanceof Error
          ? error.message
          : "erro de rede desconhecido";
    console.error(
      `[meta-capi] falha de rede ao enviar evento: ${reason}`,
      JSON.stringify(logContext(input)),
    );
    return { ok: false, error: reason };
  } finally {
    clearTimeout(timeout);
  }
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
