import { StepImage } from "@/components/marketing/step-image";

const STEPS = [
  { title: "Escolha a zona", image: "/como-funciona/passo-1.webp" },
  { title: "Envie as suas fotos ou vídeos", image: "/como-funciona/passo-2.webp" },
  { title: "Escolha as visualizações", image: "/como-funciona/passo-3-v2.webp" },
  { title: "Pague e nós tratamos do resto", image: "/como-funciona/passo-4-v2.webp" },
  { title: "Acompanhe", image: "/como-funciona/passo-5-v2.webp" },
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
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
