import { Shield } from "@/components/icons";

/**
 * Risk reversal — só sobre o que a Aqui. controla (entrega das
 * visualizações), refletindo a mesma política real de
 * `src/components/marketing/garantia.tsx` e `src/app/termos/page.tsx`.
 * Nenhuma garantia de vendas, contactos ou resultados comerciais.
 */
export function Garantia() {
  return (
    <section className="border-b border-line py-16 md:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl rounded-lg border-2 border-red-strong bg-red-strong/[0.03] p-8 text-center sm:p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-strong/10 text-red-strong">
            <Shield className="size-7" />
          </div>

          <h2 className="mt-5 text-[26px] font-black leading-tight sm:text-[32px]">
            As visualizações que compra são as visualizações que recebe.
          </h2>

          <p className="mt-4 text-[16px] leading-relaxed text-ink">
            Se comprar 2.000 visualizações, entregamos 2.000. Se a campanha não atingir o número
            contratado, continuamos a promovê-la sem custo até atingir.
          </p>
          <p className="mt-2 text-[16px] leading-relaxed text-ink">
            Se por algum motivo a campanha não chegar a ser colocada no ar, o valor é devolvido na
            totalidade.
          </p>

          <p className="mt-5 text-[14px] font-semibold text-red-strong">
            Sem ficar a adivinhar o que recebeu pelo seu dinheiro.
          </p>
        </div>
      </div>
    </section>
  );
}
