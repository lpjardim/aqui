const FAQS = [
  {
    q: "O que são visualizações?",
    a: "Cada visualização corresponde a uma vez que a sua foto ou vídeo foi mostrado a uma pessoa no Instagram ou Facebook.",
  },
  {
    q: "Mas isto vai trazer-me clientes?",
    a: "Pode trazer, mas não é isso que estamos a vender. A Aqui. garante que o seu negócio é mostrado o número de vezes que comprou, na zona escolhida. O resultado comercial depende também da sua oferta, do seu negócio e do seu anúncio.",
  },
  {
    q: "Posso escolher onde quero aparecer?",
    a: "Sim. Pode escolher Portugal inteiro ou um distrito. O anúncio aparece no Instagram e Facebook de pessoas nessa zona.",
  },
  {
    q: "Preciso de saber fazer anúncios?",
    a: "Não. Escolhe a zona e as visualizações, envia as fotos ou vídeos, e nós tratamos do resto.",
  },
  {
    q: "E se eu não tiver um anúncio preparado?",
    a: "Não precisa. Envie fotos ou vídeos do seu negócio e nós tratamos do texto e da preparação do anúncio.",
  },
  {
    q: "Quantas fotos ou vídeos posso enviar?",
    a: "Até 5.",
  },
  {
    q: "Quando é que começa a aparecer?",
    a: "Depois do pagamento revemos o material e colocamos o anúncio no ar, normalmente até 2 dias úteis.",
  },
  {
    q: "Durante quanto tempo fica ativo?",
    a: "Até serem entregues as visualizações que comprou. A duração pode variar conforme a zona escolhida.",
  },
  {
    q: "Como sei quantas visualizações foram entregues?",
    a: "Pode acompanhar o progresso no seu painel. No final disponibilizamos também um comprovativo da própria Meta.",
  },
  {
    q: "Porque não faço isto diretamente no Instagram?",
    a: "Porque aqui não precisa de aprender a configurar campanhas, públicos ou ferramentas de publicidade. Escolhe o que quer comprar, envia o conteúdo e acompanha as visualizações.",
  },
  {
    q: "Garantem vendas ou contactos?",
    a: "Não. A Aqui. vende visualizações. Garantimos a entrega das visualizações compradas, não resultados comerciais que não controlamos.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-center text-[30px] font-black leading-tight sm:text-[40px]">
          Perguntas frequentes
        </h2>

        <div className="mx-auto mt-10 max-w-2xl border-t border-line">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span
                  aria-hidden
                  className="relative size-4 shrink-0 text-red-strong before:absolute before:left-0 before:top-1/2 before:h-0.5 before:w-4 before:-translate-y-1/2 before:bg-current after:absolute after:left-1/2 after:top-0 after:h-4 after:w-0.5 after:-translate-x-1/2 after:bg-current after:transition-transform group-open:after:rotate-90 group-open:after:opacity-0"
                />
              </summary>
              <p className="pb-6 text-[15px] leading-relaxed text-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
