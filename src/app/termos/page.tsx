import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Termos e Condições",
};

export default function TermosPage() {
  return (
    <LegalPage
      title="Termos e Condições"
      sections={[
        {
          heading: "O que compra",
          body: "A Aqui. vende visualizações de publicidade no Instagram e Facebook, na zona escolhida pelo cliente. Uma visualização corresponde a uma vez que o conteúdo do cliente foi mostrado a uma pessoa.",
        },
        {
          heading: "O que não é garantido",
          body: "A Aqui. garante a entrega das visualizações compradas. Não garante vendas, contactos ou qualquer outro resultado comercial.",
        },
        {
          heading: "Conteúdo enviado",
          body: "O cliente é responsável pelo conteúdo que envia e declara ter direito a utilizá-lo. Conteúdo que não cumpra as regras das plataformas pode ser recusado.",
        },
        {
          heading: "Pagamento",
          body: "O pagamento é feito no momento da compra, através da Stripe. Os preços apresentados incluem IVA.",
        },
        {
          heading: "Prazos",
          body: "Após o pagamento, o material é revisto e a campanha colocada no ar, normalmente até 2 dias úteis. A duração até à entrega total pode variar conforme a zona escolhida.",
        },
        {
          heading: "Reembolsos",
          body: "Se a campanha não for colocada no ar, o valor é devolvido. Se for interrompida, é devolvida a parte proporcional às visualizações não entregues.",
        },
        {
          heading: "Contacto",
          body: "Para qualquer questão sobre estes termos, contacte-nos por email.",
        },
      ]}
    />
  );
}
