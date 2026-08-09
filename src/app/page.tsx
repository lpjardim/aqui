import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ComoFunciona } from "@/components/marketing/como-funciona";
import { Precos } from "@/components/marketing/precos";
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
        <Precos />
        <Exemplos />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
