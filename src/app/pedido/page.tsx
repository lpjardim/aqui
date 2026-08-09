import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { OrderForm } from "@/components/pedido/order-form";
import { getPack, type PackId } from "@/lib/packs";

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false },
};

export default async function PedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  const { pack } = await searchParams;
  const initialPack = (getPack(pack)?.id ?? null) as PackId | null;

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
        <OrderForm initialPack={initialPack} />
      </main>
    </div>
  );
}
