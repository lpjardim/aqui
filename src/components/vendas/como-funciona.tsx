import { StepImage } from "@/components/marketing/step-image";

const STEPS = [
  {
    title: "Escolha a campanha",
    description: "Escolha a zona e a dimensão que fazem sentido para o seu negócio.",
    image: "/como-funciona/passo-1.webp",
  },
  {
    title: "Envie o que quer anunciar",
    description: "Fotos ou vídeos do seu negócio. Não precisa de ter nada preparado.",
    image: "/como-funciona/passo-2.webp",
  },
  {
    title: "Nós tratamos da publicidade",
    description:
      "Preparamos o anúncio, colocamos a campanha no ar no Instagram e Facebook e acompanha tudo online.",
    image: "/como-funciona/passo-4-v2.webp",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">Como funciona</h2>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <StepImage src={step.image} alt={step.title} />
              <p className="mt-4 text-[13px] font-bold text-red-strong">{index + 1}</p>
              <p className="mt-1 text-[17px] font-semibold leading-snug">{step.title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
