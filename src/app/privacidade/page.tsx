import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      sections={[
        {
          heading: "Dados recolhidos",
          body: "Recolhemos o nome, o nome da empresa, o email e o telefone indicados no pedido, bem como as fotos ou vídeos enviados para a campanha.",
        },
        {
          heading: "Para que são usados",
          body: "Os dados são usados para preparar e acompanhar a campanha, para dar acesso ao painel e para contactar o cliente sobre a encomenda.",
        },
        {
          heading: "Com quem são partilhados",
          body: "Os pagamentos são processados pela Stripe. A publicidade é entregue através das plataformas da Meta. Não vendemos dados a terceiros.",
        },
        {
          heading: "Durante quanto tempo",
          body: "Os dados são conservados enquanto forem necessários para a prestação do serviço e para cumprir obrigações legais.",
        },
        {
          heading: "Os seus direitos",
          body: "Pode pedir o acesso, a correção ou a eliminação dos seus dados através do nosso email de contacto.",
        },
      ]}
    />
  );
}
