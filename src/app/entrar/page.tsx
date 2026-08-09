import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false },
};

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  if (await getCurrentUser()) {
    redirect("/painel");
  }

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
        <div className="mx-auto max-w-sm">
          <h1 className="text-[30px] font-black leading-tight">Entrar no painel</h1>
          <p className="mt-3 text-[15px] text-muted">
            Enviamos um link para o seu email. Sem passwords.
          </p>

          {erro && (
            <p role="alert" className="mt-6 text-[14px] text-red-strong">
              O link expirou ou já foi usado. Peça um novo.
            </p>
          )}

          <LoginForm />
        </div>
      </main>
    </div>
  );
}
