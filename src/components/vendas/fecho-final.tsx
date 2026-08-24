import { ButtonLink } from "@/components/ui/button";

export function FechoFinal() {
  return (
    <section className="border-b border-line py-16 md:py-24">
      <div className="container-page max-w-2xl text-center">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">
          Há pessoas na sua zona que podiam tornar-se clientes. Primeiro precisam de conhecer o seu
          negócio.
        </h2>

        <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-muted">
          A Aqui. torna simples pôr o seu negócio à frente delas no Instagram e Facebook.
        </p>

        <div className="mt-8 flex justify-center">
          <ButtonLink href="#precos" size="lg">
            Escolher campanha
          </ButtonLink>
        </div>

        <p className="mt-4 text-[13px] font-semibold text-muted">
          Desde 39€/mês. Sem reuniões nem gestão de anúncios.
        </p>
      </div>
    </section>
  );
}
