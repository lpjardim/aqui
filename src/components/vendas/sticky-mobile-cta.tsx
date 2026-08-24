import { ButtonLink } from "@/components/ui/button";

/**
 * Barra fixa só em mobile. O `main` na página recebe padding-bottom
 * equivalente para esta barra nunca tapar o fim do conteúdo (ver
 * `src/app/anunciar/page.tsx`).
 */
export function StickyMobileCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 p-3 backdrop-blur-sm sm:hidden">
      <ButtonLink href="#precos" size="lg" className="w-full">
        Ver campanhas — desde 39€
      </ButtonLink>
    </div>
  );
}
