import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Política de Cookies",
};

export default function CookiesPage() {
  return (
    <LegalPage
      title="Política de Cookies"
      sections={[
        {
          heading: "Que cookies usamos",
          body: "Usamos apenas cookies necessários ao funcionamento do site: o cookie de sessão que mantém o acesso ao painel e os cookies da Stripe durante o pagamento.",
        },
        {
          heading: "Cookies de publicidade",
          body: "Neste momento não usamos cookies de publicidade nem de análise de tráfego.",
        },
        {
          heading: "Como os controlar",
          body: "Pode bloquear ou apagar cookies nas definições do seu navegador. Se o fizer, o acesso ao painel pode deixar de funcionar.",
        },
      ]}
    />
  );
}
