import { StepImage } from "@/components/marketing/step-image";

const STEPS = [
  {
    title: "Escolha a zona",
    description: "Escolha onde quer que o seu negócio apareça.",
    image: "/como-funciona/passo-1.webp",
  },
  {
    title: "Envie as suas fotos ou vídeos",
    description: "Não precisa de ter um anúncio preparado.",
    image: "/como-funciona/passo-2.webp",
  },
  {
    title: "Escolha as visualizações",
    description: "Decida quantas vezes quer que o seu anúncio seja mostrado.",
    image: "/como-funciona/passo-3-v2.webp",
  },
  {
    title: "Pague e nós tratamos do resto",
    description: "Preparamos o anúncio, configuramos a campanha e colocamo-la no ar.",
    image: "/como-funciona/passo-4-v2.webp",
  },
  {
    title: "Acompanhe",
    description:
      "Veja as visualizações a serem entregues no seu painel. No final, recebe o comprovativo da Meta.",
    image: "/como-funciona/passo-5-v2.webp",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">Como funciona</h2>

        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <StepImage src={step.image} alt={step.title} />
              <p className="mt-4 text-[13px] font-bold text-red-strong">{index + 1}</p>
              <p className="mt-1 text-[16px] font-semibold leading-snug">{step.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
