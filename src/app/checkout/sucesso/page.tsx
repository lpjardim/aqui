import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { MetaPurchasePixel } from "@/app/checkout/sucesso/meta-purchase-pixel";

export const metadata: Metadata = {
  title: "Pagamento",
  robots: { index: false },
};

type PaymentState = "paid" | "pending" | "error";

const ORDER_SELECT = {
  id: true,
  price: true,
  billingFrequency: true,
  metaPurchaseEventId: true,
  metaMarketingConsent: true,
} as const;

type ResolvedOrder = {
  id: string;
  price: number;
  billingFrequency: "ONE_TIME" | "MONTHLY";
  metaPurchaseEventId: string | null;
  metaMarketingConsent: boolean;
};

type ResolvedCheckout = { state: PaymentState; order: ResolvedOrder | null; amountCents: number | null };

/**
 * Esta página nunca escreve na base de dados — só lê e mostra o estado actual
 * da Stripe (ou, em desenvolvimento sem Stripe, da encomenda simulada).
 * Marcar a encomenda como `PAID` continua a ser responsabilidade exclusiva do
 * webhook (`/api/stripe/webhook`), nunca do redirect do browser.
 *
 * Também devolve a Order (e o valor realmente cobrado) para o Pixel de
 * `Purchase`/`Subscribe` — nunca para decidir o estado do pagamento em si.
 */
async function resolveCheckout(sessionId?: string, pedidoId?: string): Promise<ResolvedCheckout> {
  if (sessionId) {
    if (!isStripeConfigured()) return { state: "error", order: null, amountCents: null };

    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);

      if (session.status === "expired") return { state: "error", order: null, amountCents: null };

      const paid =
        session.payment_status === "paid" || session.payment_status === "no_payment_required";
      const state: PaymentState = paid ? "paid" : "pending";

      const orderId = session.metadata?.orderId ?? session.client_reference_id ?? null;
      const order = orderId
        ? await prisma.order.findUnique({ where: { id: orderId }, select: ORDER_SELECT })
        : null;

      return { state, order, amountCents: session.amount_total ?? order?.price ?? null };
    } catch {
      return { state: "error", order: null, amountCents: null };
    }
  }

  // Atalho de desenvolvimento sem STRIPE_SECRET_KEY (ver /api/pedido).
  if (pedidoId) {
    const order = await prisma.order.findUnique({
      where: { id: pedidoId },
      select: { ...ORDER_SELECT, status: true },
    });
    if (!order) return { state: "error", order: null, amountCents: null };
    const state: PaymentState = order.status !== "PENDING_PAYMENT" ? "paid" : "pending";
    return { state, order, amountCents: order.price };
  }

  return { state: "error", order: null, amountCents: null };
}

const COPY: Record<PaymentState, { title: string; body: string }> = {
  paid: {
    title: "Pagamento confirmado.",
    body: "A sua campanha está pronta para avançar. Enviámos também o acesso ao seu painel por email.",
  },
  pending: {
    title: "Estamos a confirmar o pagamento.",
    body: "Alguns métodos de pagamento, como o Multibanco, demoram alguns minutos a confirmar. Assim que estiver confirmado, receberá um email com o acesso ao seu painel.",
  },
  error: {
    title: "Não foi possível confirmar o pagamento.",
    body: "Não encontrámos o estado desta sessão de pagamento. Se o valor foi cobrado, guarde o comprovativo e contacte-nos; caso contrário, pode tentar novamente.",
  },
};

export default async function SucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; pedido?: string }>;
}) {
  const params = await searchParams;
  const { state, order, amountCents } = await resolveCheckout(params.session_id, params.pedido);
  const copy = COPY[state];

  // O Pixel só dispara quando o pagamento está mesmo confirmado, com o valor
  // real cobrado (nunca inventado) e o `event_id` partilhado com a CAPI do
  // webhook. Sem consentimento de marketing na Order, não renderiza nada
  // (o próprio Pixel também não estaria carregado no browser).
  const showPurchasePixel =
    state === "paid" && order !== null && order.metaMarketingConsent && amountCents !== null;

  return (
    <div className="min-h-dvh">
      {showPurchasePixel && (
        <MetaPurchasePixel
          eventId={order.metaPurchaseEventId ?? order.id}
          value={amountCents / 100}
          currency="EUR"
          isSubscription={order.billingFrequency === "MONTHLY"}
        />
      )}

      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" className="pl-2">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="container-page py-20">
        <div className="mx-auto max-w-lg">
          <CheckCircle className="size-10 text-red-strong" />

          <h1 className="mt-6 text-[30px] font-black leading-tight sm:text-[38px]">
            {copy.title}
          </h1>

          <p className="mt-4 text-[16px] leading-relaxed text-muted">{copy.body}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {state === "paid" && (
              <ButtonLink href="/painel" size="lg">
                Ir para o painel
              </ButtonLink>
            )}
            <ButtonLink href="/" variant={state === "paid" ? "outline" : "primary"} size="lg">
              Voltar ao início
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
