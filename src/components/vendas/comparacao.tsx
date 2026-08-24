import { Check } from "@/components/icons";

const COLUMNS = [
  {
    title: "Gerir sozinho",
    items: [
      "Aprender o Ads Manager",
      "Criar públicos e objetivos",
      "Definir orçamentos e licitação",
      "Interpretar métricas",
      "Tempo a aprender e a corrigir erros",
    ],
    highlight: false,
  },
  {
    title: "Agência tradicional",
    items: [
      "Pedir orçamento",
      "Reuniões e apresentações",
      "Fee de gestão mensal",
      "Contratos e investimento mínimo",
      "Depender do calendário de outra pessoa",
    ],
    highlight: false,
  },
  {
    title: "Aqui.",
    items: ["Escolhe a campanha", "Envia as fotos ou vídeos", "Paga online", "Nós tratamos do resto"],
    highlight: true,
  },
];

export function Comparacao() {
  return (
    <section className="border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">
          Há mais do que uma forma de anunciar localmente
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <div
              key={column.title}
              className={`rounded-lg border p-7 ${
                column.highlight ? "border-red-strong bg-red-strong/[0.03]" : "border-line bg-white"
              }`}
            >
              <p
                className={`text-[17px] font-black ${
                  column.highlight ? "text-red-strong" : "text-ink"
                }`}
              >
                {column.title}
              </p>

              <ul className="mt-5 flex flex-col gap-3">
                {column.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] leading-snug">
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${
                        column.highlight ? "text-red-strong" : "text-muted-soft"
                      }`}
                    />
                    <span className={column.highlight ? "font-semibold text-ink" : "text-muted"}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-[15px] leading-relaxed text-muted">
          Há situações em que uma agência faz sentido. Mas para quem só quer promover o negócio
          localmente sem complicações, não devia ser preciso transformar isso num projeto de
          marketing.
        </p>
      </div>
    </section>
  );
}
