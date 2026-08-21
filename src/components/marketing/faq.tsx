const FAQS = [
  {
    q: "O que são visualizações?",
    a: "Cada visualização corresponde a uma vez que o seu anúncio é mostrado no Instagram ou Facebook. Escolhe quantas quer comprar e nós tratamos da entrega na zona selecionada.",
  },
  {
    q: "Mas isto vai trazer-me clientes?",
    a: "O objetivo é pôr o seu negócio à frente de mais pessoas da zona que escolheu. Isso pode gerar visitas, contactos ou vendas, mas esses resultados dependem também do negócio, da oferta e do anúncio. O que a Aqui. garante é a entrega das visualizações contratadas.",
  },
  {
    q: "Posso escolher onde quero aparecer?",
    a: "Sim. Escolhe a zona onde quer que o anúncio apareça e nós tratamos da segmentação. Pode escolher Portugal inteiro ou um distrito.",
  },
  {
    q: "Preciso de saber fazer anúncios?",
    a: "Não. Essa é precisamente a ideia. Escolhe a zona e as visualizações, envia as fotos ou vídeos e nós tratamos do resto.",
  },
  {
    q: "E se eu não tiver um anúncio preparado?",
    a: "Não precisa. Envie as fotos ou vídeos do seu negócio e nós tratamos do texto e da preparação do anúncio.",
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
    a: "Pode acompanhar as visualizações enquanto a campanha está ativa no seu painel. No final, recebe também um comprovativo da própria Meta.",
  },
  {
    q: "Porque não faço isto diretamente no Instagram?",
    a: "Pode fazê-lo. A diferença é que Aqui. não precisa de perceber de campanhas, configurações ou ferramentas de publicidade. Escolhe a zona, envia o conteúdo e nós tratamos do resto.",
  },
  {
    q: "Garantem vendas ou contactos?",
    a: "Não garantimos vendas ou contactos porque isso depende de fatores que não controlamos. Garantimos aquilo que compra Aqui.: o número de visualizações contratado na zona escolhida.",
  },
  {
    q: "Posso comprar só uma vez?",
    a: "Sim. Pode comprar uma campanha única, sem ficar com qualquer mensalidade.",
  },
  {
    q: "Posso cancelar o plano mensal?",
    a: "Sim, quando quiser, a partir do seu painel. O ciclo atual continua a decorrer normalmente até ao fim — só não há cobrança nem novo ciclo no mês seguinte.",
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
