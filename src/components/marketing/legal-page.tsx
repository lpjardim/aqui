import Link from "next/link";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/marketing/footer";

export function LegalPage({
  title,
  sections,
  children,
}: {
  title: string;
  sections: { heading: string; body: string }[];
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" className="pl-2">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="container-page py-16">
        <div className="max-w-2xl">
          <h1 className="text-[32px] font-black leading-tight">{title}</h1>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-[17px] font-bold">{section.heading}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{section.body}</p>
              </section>
            ))}
          </div>

          {children && <div className="mt-8">{children}</div>}

          <p className="mt-12 text-[13px] text-muted">
            Documento provisório. Será substituído pela versão final antes do lançamento.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
