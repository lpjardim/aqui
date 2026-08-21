import { CheckCircle } from "@/components/icons";

const ITEMS = [
  "Mais pessoas da sua zona a conhecer o seu negócio",
  "Não precisa de perceber de anúncios",
  "Sem reuniões nem pedidos de orçamento",
  "Acompanha tudo durante a campanha",
  "Visualizações garantidas",
  "Comprovativo da Meta no final",
  "Comece a partir de 39€",
];

/**
 * Value stack — deixa claro que os 49€ não compram só "visualizações
 * soltas": compram uma campanha pronta a avançar, com tudo incluído.
 * Uma única caixa central com lista vertical (não uma grelha de features),
 * seguindo o mesmo design system das restantes secções.
 */
export function OQueEstaIncluido() {
  return (
    <section id="o-que-esta-incluido" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page text-center">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">
          Não está apenas a comprar visualizações.
        </h2>
        <p className="mt-3 text-[16px] text-muted">
          Está a comprar uma campanha pronta a avançar.
        </p>

        <ul className="mx-auto mt-10 max-w-md rounded-lg border border-line bg-white p-6 text-left sm:p-8">
          {ITEMS.map((item, index) => (
            <li
              key={item}
              className={`flex items-start gap-3 py-3.5 ${
                index > 0 ? "border-t border-line" : ""
              }`}
            >
              <CheckCircle className="mt-0.5 size-5 shrink-0 text-red-strong" />
              <span className="text-[15px] font-medium leading-snug sm:text-[16px]">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
