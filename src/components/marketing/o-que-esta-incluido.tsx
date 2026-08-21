import { CheckCircle } from "@/components/icons";

const ITEMS = [
  {
    title: "Campanha preparada por nós",
    description: "Configuramos a campanha e deixamos tudo pronto para começar.",
  },
  {
    title: "Zona escolhida por si",
    description: "Escolhe onde quer aparecer. Nós tratamos da segmentação.",
  },
  {
    title: "Anúncio preparado",
    description: "Envie as fotos ou vídeos. Nós tratamos do texto e da preparação do anúncio.",
  },
  {
    title: "Instagram + Facebook",
    description: "O anúncio aparece através das plataformas da Meta.",
  },
  {
    title: "Acompanhamento no painel",
    description: "Veja as visualizações a serem entregues enquanto a campanha está ativa.",
  },
  {
    title: "Comprovativo da Meta",
    description: "No final, recebe o comprovativo da própria Meta com os resultados da campanha.",
  },
];

/**
 * Secção comercial nova — deixa claro que os 49€ não compram só
 * "visualizações soltas": compram uma campanha preparada de ponta a ponta.
 * Segue o mesmo design system das restantes secções (heading + cards com
 * borda `border-line`), sem introduzir nenhum padrão visual novo.
 */
export function OQueEstaIncluido() {
  return (
    <section id="o-que-esta-incluido" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="max-w-2xl text-[30px] font-black leading-tight sm:text-[40px]">
          Só precisa de escolher a zona e enviar o conteúdo.
        </h2>
        <p className="mt-3 max-w-md text-[16px] text-muted">
          Nós tratamos do resto para pôr o seu negócio a aparecer no Instagram e Facebook de
          pessoas da sua zona.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <li key={item.title} className="rounded-lg border border-line bg-white p-6">
              <CheckCircle className="size-6 text-red-strong" />
              <p className="mt-4 text-[16px] font-bold leading-snug">{item.title}</p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
