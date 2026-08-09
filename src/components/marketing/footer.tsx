import Link from "next/link";
import { Logo } from "@/components/logo";

const LEGAL = [
  { href: "/termos", label: "Termos" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/cookies", label: "Cookies" },
];

export function Footer() {
  return (
    <footer className="py-12">
      <div className="container-page flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="pl-2">
          <Logo size="sm" />
          <p className="mt-4 text-[13px] text-muted">Publicidade simples. Visível. Local.</p>
        </div>

        <nav className="flex flex-wrap items-center gap-6">
          {LEGAL.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/painel"
            className="text-[13px] font-medium text-ink transition-colors hover:text-red-strong"
          >
            Entrar no painel
          </Link>
        </nav>
      </div>

      <div className="container-page mt-8 border-t border-line pt-6">
        <p className="text-[12px] text-muted">
          © {new Date().getFullYear()} Aqui. Não afiliado à Meta Platforms, Inc.
        </p>
      </div>
    </footer>
  );
}
