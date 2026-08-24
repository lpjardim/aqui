import { Check, Close } from "@/components/icons";

const FAZ_SENTIDO = [
  "Tem um negócio local",
  "Quer chegar a mais pessoas na sua zona",
  "Já tem fotos ou vídeos do que quer promover",
  "Não quer aprender publicidade online",
  "Prefere um serviço simples e transparente",
];

const NAO_E_PARA = [
  "Precisa de uma estratégia completa de marca",
  "Precisa de criação diária de conteúdo",
  "Procura gestão integral de marketing",
  "Espera vendas garantidas apenas por anunciar",
];

export function QuemEPara() {
  return (
    <section className="border-b border-line py-16 md:py-24">
      <div className="container-page">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-white p-7">
            <h2 className="text-[20px] font-black leading-tight">
              A Aqui. faz sentido se...
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {FAZ_SENTIDO.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug">
                  <Check className="mt-0.5 size-4 shrink-0 text-red-strong" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-surface p-7">
            <h2 className="text-[20px] font-black leading-tight">
              Pode não ser a solução certa se...
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {NAO_E_PARA.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug">
                  <Close className="mt-0.5 size-4 shrink-0 text-muted-soft" />
                  <span className="text-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
