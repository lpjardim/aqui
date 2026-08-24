import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ComoFunciona } from "@/components/marketing/como-funciona";
import { OQueEstaIncluido } from "@/components/marketing/o-que-esta-incluido";
import { Precos } from "@/components/marketing/precos";
import { Garantia } from "@/components/marketing/garantia";
import { Exemplos } from "@/components/marketing/exemplos";
import { Faq } from "@/components/marketing/faq";
import { Footer } from "@/components/marketing/footer";
import { MetaLandingView } from "@/components/marketing/meta-landing-view";
import { LandingTracking } from "@/components/experiments/landing-tracking";
import { getLandingContext } from "@/lib/landing-experiment";

export default async function HomePage() {
  const { variant } = await getLandingContext();

  return (
    <>
      <MetaLandingView landingVariant={variant === "NORMAL" ? variant : null} />
      {variant === "NORMAL" && <LandingTracking landingPath="/" />}
      <Navbar />
      <main>
        <Hero />
        <ComoFunciona />
        <OQueEstaIncluido />
        <Precos />
        <Garantia />
        <Exemplos />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
