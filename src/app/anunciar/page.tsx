import type { Metadata } from "next";
import { MetaLandingView } from "@/components/marketing/meta-landing-view";
import { Footer } from "@/components/marketing/footer";
import { Header } from "@/components/vendas/header";
import { Hero } from "@/components/vendas/hero";
import { TrustStrip } from "@/components/vendas/trust-strip";
import { Problema } from "@/components/vendas/problema";
import { Insight } from "@/components/vendas/insight";
import { ComoFunciona } from "@/components/vendas/como-funciona";
import { Mecanismo } from "@/components/vendas/mecanismo";
import { Comparacao } from "@/components/vendas/comparacao";
import { Oferta } from "@/components/vendas/oferta";
import { Pricing } from "@/components/vendas/pricing";
import { Garantia } from "@/components/vendas/garantia";
import { Prova } from "@/components/vendas/prova";
import { QuemEPara } from "@/components/vendas/quem-e-para";
import { Faq } from "@/components/vendas/faq";
import { FechoFinal } from "@/components/vendas/fecho-final";
import { StickyMobileCta } from "@/components/vendas/sticky-mobile-cta";
import { LandingTracking } from "@/components/experiments/landing-tracking";
import { getLandingContext } from "@/lib/landing-experiment";

const title = "Anuncie o seu negócio no Instagram e Facebook da sua zona — Aqui.";
const description =
  "Chegue a mais pessoas da sua zona através de publicidade no Instagram e Facebook, sem gerir anúncios nem falar com uma agência. Desde 39€/mês.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
  },
};

export default async function AnunciarPage() {
  const { variant } = await getLandingContext();

  return (
    <>
      <MetaLandingView landingVariant={variant === "SALES" ? variant : null} />
      {variant === "SALES" && <LandingTracking landingPath="/anunciar" />}
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <Problema />
        <Insight />
        <ComoFunciona />
        <Mecanismo />
        <Comparacao />
        <Oferta />
        <Pricing />
        <Garantia />
        <Prova />
        <QuemEPara />
        <Faq />
        <FechoFinal />
      </main>
      <Footer />
      {/* Espaço reservado para a barra sticky mobile não tapar o fim do rodapé. */}
      <div className="h-[76px] sm:hidden" aria-hidden />
      <StickyMobileCta />
    </>
  );
}
