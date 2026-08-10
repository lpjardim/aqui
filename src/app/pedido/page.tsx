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
  searchParams: Promise<{ pack?: string; custom?: string }>;
}) {
  const { pack, custom } = await searchParams;
  const initialViews = getPack(pack)?.visualizations ?? null;
  const initialCustom = custom === "1";

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
        <OrderForm initialViews={initialViews} initialCustom={initialCustom} />
      </main>
    </div>
  );
}
