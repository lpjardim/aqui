/**
 * Secção de prova social real (screenshots Meta, campanhas concluídas,
 * testemunhos reais). Layout pronto, mas ainda não há material real
 * suficiente — fica oculta até existir conteúdo verdadeiro. Não usar logos
 * falsos, contadores inventados ("+500 empresas") nem testemunhos fictícios.
 */
const SHOW_PROOF = false;

type ProofItem = {
  business: string;
  location: string;
  quote: string;
  metric: string;
};

const PROOF_ITEMS: ProofItem[] = [];

export function Prova() {
  if (!SHOW_PROOF) return null;

  return (
    <section className="border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">
          Negócios que já usam a Aqui.
        </h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROOF_ITEMS.map((item) => (
            <div key={item.business} className="rounded-lg border border-line bg-white p-6">
              <p className="text-[15px] font-semibold leading-snug">{item.business}</p>
              <p className="text-[13px] text-muted">{item.location}</p>
              <p className="mt-4 text-[14px] leading-relaxed text-muted">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-4 text-[13px] font-semibold text-red-strong">{item.metric}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
