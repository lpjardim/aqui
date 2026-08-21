import { AdCard, type AdExample } from "@/components/marketing/ad-card";

const EXAMPLES: AdExample[] = [
  {
    business: "Café Central",
    location: "Braga",
    avatar: "/anuncios/cafe-perfil.webp",
    image: "/anuncios/cafe.webp",
    overlay: ["O seu café", "de sempre,", "aqui perto."],
    headline: "Aberto todos os dias",
    cta: "Saber mais",
    likes: 1284,
    comments: 37,
  },
  {
    business: "Ginásio Norte",
    location: "Porto",
    avatar: "/anuncios/ginasio-perfil.webp",
    image: "/anuncios/ginasio.webp",
    overlay: ["Comece", "esta semana."],
    headline: "Primeira aula grátis",
    cta: "Saber mais",
    likes: 942,
    comments: 51,
  },
  {
    business: "Miguel Santos · Imobiliária",
    location: "Lisboa",
    avatar: "/anuncios/imobiliaria-perfil.webp",
    image: "/anuncios/imobiliaria.webp",
    overlay: ["Quer vender", "a sua casa?"],
    headline: "Avaliação sem compromisso",
    cta: "Saber mais",
    likes: 613,
    comments: 24,
  },
  {
    business: "Tasca do Rio",
    location: "Coimbra",
    avatar: "/anuncios/restaurante-perfil.webp",
    image: "/anuncios/restaurante.webp",
    overlay: ["Almoços", "a 9,50 €."],
    headline: "Reserve a sua mesa",
    cta: "Saber mais",
    likes: 1571,
    comments: 68,
  },
];

export function Exemplos() {
  return (
    <section id="exemplos" className="scroll-mt-16 border-b border-line py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-[30px] font-black leading-tight sm:text-[40px]">Exemplos</h2>
        <p className="mt-3 max-w-lg text-[16px] text-muted">
          Veja como o seu negócio pode aparecer no Instagram e Facebook de pessoas da sua zona.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {EXAMPLES.map((ad) => (
            <div
              key={ad.business}
              className="overflow-hidden rounded-lg border border-line bg-white"
            >
              <AdCard ad={ad} compact />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
