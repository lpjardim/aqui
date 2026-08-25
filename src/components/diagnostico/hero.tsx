import { Button } from "@/components/ui/button";
import type { DiagnosticHeroVariantValue } from "@/lib/diagnostic-hero-constants";

/**
 * Copy das 3 variantes do A/B/C test do Hero (`diagnostic_hero_v1`) — só
 * headline + subtítulo mudam. Eyebrow/CTA/microcopy/layout ficam sempre
 * iguais (ver render abaixo), para isolar só a mensagem como variável.
 * Textos exatos pedidos, nunca "melhorados" automaticamente.
 */
const HERO_COPY: Record<DiagnosticHeroVariantValue, { headline: string; subtitle: string }> = {
  PAIN: {
    headline:
      "Se amanhã precisasse de mais clientes, saberia como chegar a mais pessoas da sua zona?",
    subtitle:
      "Responda a 6 perguntas rápidas e descubra como o seu negócio está a ser descoberto hoje — e onde pode estar a depender demasiado do acaso.",
  },
  WORD_OF_MOUTH: {
    headline: "O seu negócio depende demasiado do boca-a-boca?",
    subtitle:
      "Descubra em menos de 1 minuto como os seus clientes chegam hoje, onde está mais vulnerável e qual pode ser o próximo passo.",
  },
  GROWTH: {
    headline: "Descubra o que pode estar a limitar o crescimento do seu negócio na sua zona.",
    subtitle:
      "Faça um diagnóstico rápido à forma como novos clientes descobrem o seu negócio e veja onde existe espaço para melhorar.",
  },
};

export function DiagnosticHero({
  variant,
  onStart,
}: {
  variant: DiagnosticHeroVariantValue;
  onStart: () => void;
}) {
  const copy = HERO_COPY[variant];

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-red-strong">
        Diagnóstico gratuito
      </p>
      <h1 className="mt-4 text-[28px] font-black leading-tight sm:text-[36px]">
        {copy.headline}
      </h1>
      <p className="mt-4 max-w-md text-[15px] text-muted">{copy.subtitle}</p>
      <Button size="lg" className="mt-8 w-full sm:w-auto sm:min-w-64" onClick={onStart}>
        Fazer diagnóstico
      </Button>
      <p className="mt-4 text-[12px] text-muted">Menos de 1 minuto · Resultado imediato</p>
    </section>
  );
}
