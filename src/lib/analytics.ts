/**
 * Camada de analytics sem integrações externas.
 *
 * Quando o Meta Pixel / CAPI (ou outro fornecedor) for adicionado, basta
 * implementar o envio dentro de `track` — o resto da aplicação não muda.
 */
export type AnalyticsEvent =
  | { name: "pedido_iniciado"; pack?: string }
  | { name: "pedido_passo_concluido"; step: number }
  | { name: "checkout_iniciado"; orderId: string }
  | { name: "checkout_concluido"; orderId: string };

export function track(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", event);
  }
}
