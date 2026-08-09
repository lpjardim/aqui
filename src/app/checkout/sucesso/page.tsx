import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "@/components/icons";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Pagamento",
  robots: { index: false },
};

export default async function SucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; pedido?: string }>;
}) {
  const params = await searchParams;

  const order = params.session_id
    ? await prisma.order.findUnique({ where: { stripeSessionId: params.session_id } })
    : params.pedido
      ? await prisma.order.findUnique({ where: { id: params.pedido } })
      : null;

  const confirmed = order?.status && order.status !== "PENDING_PAYMENT";

  return (
    <div className="min-h-dvh">
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
            {confirmed ? "Pagamento recebido." : "Estamos a confirmar o pagamento."}
          </h1>

          <p className="mt-4 text-[16px] leading-relaxed text-muted">
            {confirmed
              ? "Enviámos um email com o acesso ao seu painel. Vamos rever o material e colocar o anúncio no ar, normalmente até 2 dias úteis."
              : "Alguns métodos de pagamento, como o Multibanco, demoram alguns minutos a confirmar. Assim que estiver confirmado, receberá um email com o acesso ao seu painel."}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/painel" size="lg">
              Ir para o painel
            </ButtonLink>
            <ButtonLink href="/" variant="outline" size="lg">
              Voltar ao início
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
