import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { ManageConsentButton } from "@/components/consent/manage-consent-button";

export const metadata: Metadata = {
  title: "Política de Cookies",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de Cookies"
      sections={[
        {
          heading: "Cookies essenciais",
          body: "Usados sempre, sem pedir autorização: o cookie de sessão que mantém o acesso ao painel, os cookies da Stripe durante o pagamento, e cookies técnicos internos (ex.: para mostrar sempre a mesma versão da página de preços na mesma visita).",
        },
        {
          heading: "Cookies de marketing (Meta)",
          body: "Só com a sua autorização. Usamos o Meta Pixel e a Meta Conversions API (Facebook/Instagram) para medir e melhorar os nossos anúncios — nomeadamente as cookies `_fbp`/`_fbc`, e, quando aplicável, dados de contacto tratados de forma cifrada (hash) antes de serem enviados. Sem a sua autorização, nenhuma destas cookies é definida nem é enviada qualquer informação para a Meta.",
        },
        {
          heading: "Como os controlar",
          body: "Pode aceitar ou rejeitar os cookies de marketing a qualquer momento, e mudar de ideias mais tarde. Pode também bloquear ou apagar cookies nas definições do seu navegador — nesse caso, o acesso ao painel pode deixar de funcionar.",
        },
      ]}
    >
      <ManageConsentButton />
    </LegalPage>
  );
}
