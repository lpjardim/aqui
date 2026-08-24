const FAQS = [
  {
    q: "Isto vai trazer-me clientes?",
    a: "A publicidade aumenta a exposição do seu negócio perante potenciais clientes, mas nenhum serviço sério pode garantir vendas apenas com base numa campanha — isso depende também da oferta, do preço, da reputação, da localização e do atendimento. O que a Aqui. garante é a distribuição contratada: o número de visualizações que comprou, na zona escolhida.",
  },
  {
    q: "Tenho de perceber de anúncios?",
    a: "Não. É precisamente essa a proposta: escolhe a zona e as visualizações, envia as fotos ou vídeos, e nós tratamos da configuração e da gestão da campanha.",
  },
  {
    q: "Preciso de ter site?",
    a: "Não necessariamente. O anúncio pode direcionar para o seu site, para o seu perfil de Instagram ou Facebook, ou para outra página que faça sentido — tratamos disso ao preparar o anúncio.",
  },
  {
    q: "Quem cria o anúncio?",
    a: "O cliente envia as fotos ou vídeos do negócio. A Aqui. trata do texto e da preparação do anúncio a partir desse material.",
  },
  {
    q: "Onde aparecem os anúncios?",
    a: "No Instagram e no Facebook.",
  },
  {
    q: "Posso escolher a zona?",
    a: "Sim. Pode escolher um distrito ou Portugal inteiro.",
  },
  {
    q: "É uma agência?",
    a: "Não no modelo tradicional. A Aqui. foi criada precisamente para transformar uma campanha local num produto simples de comprar, sem propostas, reuniões ou gestão técnica pelo cliente.",
  },
  {
    q: "Quando começa a aparecer?",
    a: "Depois do pagamento revemos o material e colocamos o anúncio no ar, normalmente até 2 dias úteis.",
  },
  {
    q: "Posso comprar só uma vez?",
    a: "Sim. Pode comprar uma campanha única, sem qualquer mensalidade, ou um plano mensal se preferir manter a presença contínua.",
  },
  {
    q: "Garantem vendas ou contactos?",
    a: "Não. Isso depende de fatores que não controlamos. Garantimos aquilo que compra: o número de visualizações contratado, na zona escolhida.",
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
