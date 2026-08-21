import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { OrderForm } from "@/components/pedido/order-form";
import { getPack } from "@/lib/packs";

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false },
};

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string; custom?: string; freq?: string; cancelado?: string }>;
}) {
  const { pack, custom, freq, cancelado } = await searchParams;
  const initialViews = getPack(pack)?.visualizations ?? null;
  const initialCustom = custom === "1";
  // Só chega aqui na Variante B do A/B test de preços, quando o toggle
  // "Uma vez"/"Mensal" já tinha uma frequência escolhida no clique do CTA.
  const initialFrequency = freq === "ONE_TIME" || freq === "MONTHLY" ? freq : null;
  // Vem do `cancel_url` da Stripe Checkout (ver `/api/pedido`) — o utilizador
  // cancelou ou saiu do checkout sem pagar.
  const initialCancelled = cancelado === "1";

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" className="pl-2">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="container-page py-12 md:py-16">
        <OrderForm
          initialViews={initialViews}
          initialCustom={initialCustom}
          initialFrequency={initialFrequency}
          initialCancelled={initialCancelled}
        />
      </main>
    </div>
  );
}
