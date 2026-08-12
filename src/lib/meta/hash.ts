import { createHash } from "node:crypto";

/**
 * Normalização + hashing SHA-256 dos identificadores de cliente para a Meta
 * Conversions API, seguindo exatamente a documentação oficial ("Customer
 * Information Parameters"):
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 *
 * - Email: trim + lowercase, depois SHA-256.
 * - Telefone: só dígitos (sem símbolos/letras/zeros à esquerda), com
 *   indicativo de país, depois SHA-256. Os nossos clientes são
 *   maioritariamente PT (site pt_PT) e o formulário não pede indicativo —
 *   assumimos "351" quando o número já teria o formato típico de um
 *   telemóvel português sem indicativo (9 dígitos a começar por 9).
 * - `external_id`: qualquer identificador estável nosso (usamos o `User.id`)
 *   — hashing recomendado, não obrigatório, mas aplicamos sempre por
 *   consistência com email/telefone.
 * - Nome próprio (`fn`) / apelido (`ln`): lowercase, sem pontuação, sem
 *   normalizar acentos (a doc oficial aceita UTF-8), depois SHA-256.
 *   Derivados de `User.name` (campo único "nome" do formulário) — o
 *   primeiro token é `fn`, o resto é `ln`. Nunca pedimos nome/apelido em
 *   campos separados só para isto.
 * - País (`country`): lowercase, código ISO 3166-1 alpha-2, depois SHA-256.
 * - Código postal (`zp`): lowercase, sem espaços/hífenes, depois SHA-256.
 *   País e código postal só existem quando a própria Stripe os devolve
 *   (endereço de faturação recolhido no Checkout) — nunca pedimos estes
 *   campos ao cliente no nosso formulário.
 * - `fbp`/`fbc`/IP/user-agent NUNCA são hashed (ver `capi.ts`).
 */

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const PT_MOBILE_LOCAL_LENGTH = 9;
const PT_COUNTRY_CODE = "351";

/**
 * Remove tudo o que não seja dígito e remove zeros à esquerda (formato
 * exigido pela Meta). Não usa `+`.
 */
export function normalizePhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "").replace(/^0+/, "");

  if (digitsOnly.length === PT_MOBILE_LOCAL_LENGTH && digitsOnly.startsWith("9")) {
    return `${PT_COUNTRY_CODE}${digitsOnly}`;
  }

  return digitsOnly;
}

export function hashEmail(email: string | null | undefined): string | undefined {
  if (!email?.trim()) return undefined;
  return sha256Hex(normalizeEmail(email));
}

export function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone?.trim()) return undefined;
  const normalized = normalizePhone(phone);
  if (normalized.length < 8) return undefined; // Demasiado curto para ser válido — não enviar lixo.
  return sha256Hex(normalized);
}

export function hashExternalId(id: string | null | undefined): string | undefined {
  if (!id?.trim()) return undefined;
  return sha256Hex(id.trim());
}

/** Lowercase + remove pontuação (mantém letras Unicode, dígitos e espaços). */
function normalizeNameToken(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

/** Divide um nome completo em (primeiro token, resto) — nunca por vírgulas/títulos. */
function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

export function hashFirstName(fullName: string | null | undefined): string | undefined {
  if (!fullName?.trim()) return undefined;
  const { first } = splitFullName(fullName);
  const normalized = normalizeNameToken(first);
  if (!normalized) return undefined;
  return sha256Hex(normalized);
}

export function hashLastName(fullName: string | null | undefined): string | undefined {
  if (!fullName?.trim()) return undefined;
  const { last } = splitFullName(fullName);
  const normalized = normalizeNameToken(last);
  if (!normalized) return undefined;
  return sha256Hex(normalized);
}

export function normalizeCountry(country: string): string {
  return country.trim().toLowerCase();
}

export function hashCountry(country: string | null | undefined): string | undefined {
  if (!country?.trim()) return undefined;
  const normalized = normalizeCountry(country);
  if (normalized.length !== 2) return undefined; // Só aceita ISO 3166-1 alpha-2.
  return sha256Hex(normalized);
}

export function normalizeZip(zip: string): string {
  return zip.trim().toLowerCase().replace(/[\s-]/g, "");
}

export function hashZip(zip: string | null | undefined): string | undefined {
  if (!zip?.trim()) return undefined;
  const normalized = normalizeZip(zip);
  if (!normalized) return undefined;
  return sha256Hex(normalized);
}
