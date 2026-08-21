import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ComoFunciona } from "@/components/marketing/como-funciona";
import { OQueEstaIncluido } from "@/components/marketing/o-que-esta-incluido";
import { Precos } from "@/components/marketing/precos";
import { Garantia } from "@/components/marketing/garantia";
import { Exemplos } from "@/components/marketing/exemplos";
import { Faq } from "@/components/marketing/faq";
import { Footer } from "@/components/marketing/footer";

export default function HomePage() {
  return (
    <>
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
