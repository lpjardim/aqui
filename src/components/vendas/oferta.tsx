import { CheckCircle } from "@/components/icons";

const ITEMS = [
  "Configuração completa da campanha",
  "Segmentação por distrito ou Portugal inteiro",
  "Distribuição no Instagram e Facebook",
  "Preparação do anúncio a partir das suas fotos ou vídeos",
  "Encaminhamento do anúncio para o site, perfil ou página que fizer mais sentido",
  "Acompanhamento da campanha online",
  "Comprovativo da Meta no final",
  "Visualizações contratadas garantidas",
  "Sem reuniões nem fee de agência adicional",
  "Sem necessidade de gerir o Ads Manager",
];

/**
 * Value stack real — sem valores monetários inventados por item, só o que o
 * produto entrega de facto (ver checkout em `src/components/pedido/order-form.tsx`
 * e política de garantia em `src/components/marketing/garantia.tsx`).
 */
export function Oferta() {
  return (
    <section id="oferta" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page text-center">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">
          Campanha Local Aqui.
        </h2>
        <p className="mt-3 text-[16px] text-muted">
          Não está apenas a comprar visualizações. Está a comprar uma campanha pronta a avançar.
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
