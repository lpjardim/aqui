/**
 * Helpers partilhados para extrair, de uma `Request` do Next.js, os sinais
 * que a Meta Conversions API usa para melhorar a Event Match Quality
 * (IP e cookies `_fbp`/`_fbc`). Usado tanto em `/api/pedido` (momento em que
 * capturamos estes dados na Order, para reutilizar depois no webhook Stripe)
 * como em `/api/meta/track` (eventos disparados diretamente pelo browser).
 *
 * Isolado num módulo próprio para nunca haver duas implementações a
 * divergir silenciosamente.
 */

export function clientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
