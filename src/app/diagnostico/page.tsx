import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/logo";
import { DiagnosticFlow } from "@/components/diagnostico/diagnostic-flow";
import {
  DIAGNOSTIC_HERO_SESSION_COOKIE,
  parseDiagnosticHeroSession,
} from "@/lib/diagnostic-hero-constants";

export const metadata: Metadata = {
  title: "Diagnóstico gratuito",
  // Fora do sitemap por agora — mesmo padrão de `/anunciar` — só é uma
  // entrada testável direta, ainda sem SEO próprio. `robots: { index: false }`
  // cobre também qualquer acesso com `?hero=`/`?diagnostic_debug=` de QA —
  // a página nunca é indexável, com ou sem esses parâmetros.
  robots: { index: false },
};

export default async function DiagnosticoPage() {
  // Variante do A/B/C test do Hero já decidida pelo `proxy.ts` (cookie
  // `diagnostic_hero_session`) — lida aqui, no Server Component, e passada
  // como prop, para a headline correta aparecer já no 1º render (nunca no
  // cliente), sem hydration mismatch nem flash de conteúdo.
  const store = await cookies();
  const heroSession = parseDiagnosticHeroSession(
    store.get(DIAGNOSTIC_HERO_SESSION_COOKIE)?.value,
  );
  const heroVariant = heroSession?.variant ?? "PAIN";

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
        <DiagnosticFlow heroVariant={heroVariant} />
      </main>
    </div>
  );
}
