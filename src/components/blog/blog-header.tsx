import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { ReadingProgress } from "@/components/blog/reading-progress";

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-sm">
      <ReadingProgress />
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="pl-2">
          <Logo size="sm" />
        </Link>
        <ButtonLink href="/#precos" size="md" className="h-10 px-4 text-sm">
          Ver campanhas
        </ButtonLink>
      </div>
    </header>
  );
}
