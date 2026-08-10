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
  searchParams: Promise<{ pack?: string; custom?: string; freq?: string }>;
}) {
  const { pack, custom, freq } = await searchParams;
  const initialViews = getPack(pack)?.visualizations ?? null;
  const initialCustom = custom === "1";
  // Só chega aqui na Variante B do A/B test de preços, quando o toggle
  // "Uma vez"/"Mensal" já tinha uma frequência escolhida no clique do CTA.
  const initialFrequency = freq === "ONE_TIME" || freq === "MONTHLY" ? freq : null;

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
        />
      </main>
    </div>
  );
}
