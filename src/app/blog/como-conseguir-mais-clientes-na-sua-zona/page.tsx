import type { Metadata } from "next";
import Script from "next/script";
import { Footer } from "@/components/marketing/footer";
import { BlogHeader } from "@/components/blog/blog-header";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { StickyCta } from "@/components/blog/sticky-cta";
import { ChannelsIllustration } from "@/components/blog/channels-illustration";
import { Cite, SourcesList, type Source } from "@/components/blog/citation";
import { FinalCta } from "@/components/blog/final-cta";
import {
  KeyLine,
  InsightBox,
  StatBox,
  Tip,
  ContextualCta,
  TakeawayBox,
} from "@/components/blog/elements";
import { MetaLandingView } from "@/components/marketing/meta-landing-view";
import { LandingTracking } from "@/components/experiments/landing-tracking";
import { getLandingContext } from "@/lib/landing-experiment";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const path = "/blog/como-conseguir-mais-clientes-na-sua-zona";

const description =
  "5 formas de dar a conhecer um negócio local, do boca-a-boca ao Google, redes sociais e publicidade. Veja onde cada estratégia faz sentido.";

export const metadata: Metadata = {
  title: {
    absolute: "Como conseguir mais clientes na sua zona | Aqui.",
  },
  description,
  alternates: {
    canonical: path,
  },
  openGraph: {
    type: "article",
    url: `${appUrl}${path}`,
    title: "Como conseguir mais clientes na sua zona | Aqui.",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Como conseguir mais clientes na sua zona | Aqui.",
    description,
  },
};

const TOC_ITEMS = [
  { id: "dois-momentos", label: "Dois momentos que decidem" },
  { id: "ser-considerado", label: "Antes de ser escolhido" },
  { id: "cinco-formas", label: "As cinco formas" },
  { id: "qual-e-melhor", label: "Qual é a melhor?" },
  { id: "aqui", label: "A Aqui." },
  { id: "resumo", label: "Em resumo" },
];

const SOURCES: Source[] = [
  {
    id: 1,
    publisher: "BrightLocal",
    label: "Consumer Search Behavior — Decisions",
    url: "https://www.brightlocal.com/research/consumer-search-behavior-decisions/",
  },
  {
    id: 2,
    publisher: "Google",
    label: "Sobre o Perfil da Empresa no Google",
    url: "https://support.google.com/business/answer/7039811?hl=pt",
  },
  {
    id: 3,
    publisher: "BrightLocal",
    label: "Consumer Search Behavior — Channels",
    url: "https://www.brightlocal.com/research/consumer-search-behavior-channels/",
  },
  {
    id: 4,
    publisher: "Constant Contact",
    label: "New research reveals small businesses struggle to market effectively (2024)",
    url: "https://www.constantcontact.com/news/2024-04-23-new-research-from-constant-contact-reveals-small-businesses-struggle-to-market-effectively-due-to-low-confidence-limited-time-and-lack-of-knowledge",
  },
  {
    id: 5,
    publisher: "CTT",
    label: "Infomail — publicidade não endereçada",
    url: "https://www.ctt.pt/empresas/marketing-publicidade/cttads/correio-publicitario/publicidade-nao-enderecada/infomail/quanto-custa",
  },
  {
    id: 6,
    publisher: "DataReportal",
    label: "Digital 2026: Portugal",
    url: "https://datareportal.com/reports/digital-2026-portugal",
  },
  {
    id: 7,
    publisher: "Eurostat",
    label: "Uso de TIC nas empresas — publicidade paga online (2025)",
    url: "https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20250814-2",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Como conseguir mais clientes na sua zona: 5 formas de dar a conhecer um negócio local",
  description,
  inLanguage: "pt-PT",
  author: { "@type": "Organization", name: "Aqui." },
  publisher: { "@type": "Organization", name: "Aqui." },
  mainEntityOfPage: `${appUrl}${path}`,
};

export default async function BlogPost() {
  const { variant } = await getLandingContext();

  return (
    <div className="min-h-dvh">
      <Script id="blog-article-jsonld" type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>

      <MetaLandingView landingVariant={variant === "BLOG" ? variant : null} />
      {variant === "BLOG" && <LandingTracking landingPath={path} />}

      <BlogHeader />

      <main>
        <article className="py-12 sm:py-16">
          <div className="container-page">
            <div className="mx-auto max-w-[700px] lg:mx-0 lg:max-w-none lg:grid lg:grid-cols-[190px_minmax(0,700px)] lg:justify-center lg:gap-16">
              <aside className="hidden lg:block">
                <div className="sticky top-28">
                  <TableOfContents items={TOC_ITEMS} />
                </div>
              </aside>

              <div>
                {/* Cabeçalho do artigo */}
                <header>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-red-strong">
                    Marketing local
                  </p>
                  <h1 className="mt-3 text-[32px] font-black leading-[1.08] tracking-[-0.03em] sm:text-[44px]">
                    Como conseguir mais clientes na sua zona: 5 formas de dar a conhecer um
                    negócio local
                  </h1>
                  <p className="mt-5 text-[17px] leading-relaxed text-muted sm:text-[19px]">
                    Do boca-a-boca ao Google, redes sociais e publicidade local: o que funciona,
                    onde cada opção faz sentido e como escolher.
                  </p>
                  <div className="mt-6 flex items-center gap-2 border-t border-line pt-5 text-[13px] font-medium text-muted-soft">
                    <span>Equipa Aqui.</span>
                    <span aria-hidden>·</span>
                    <span>6 min de leitura</span>
                  </div>
                </header>

                <ChannelsIllustration className="mx-auto my-10 h-auto w-full max-w-[380px] text-line-strong sm:my-12" />

                {/* Corpo do artigo */}
                <div className="text-[17px] leading-[1.75] text-ink/90 [&_p]:my-5">
                  <p>
                    Pode ter o melhor restaurante da cidade, o ginásio mais bem equipado ou
                    prestar um serviço impecável. Ainda assim há um problema simples, quase
                    incómodo, que nenhuma dessas coisas resolve sozinha.
                  </p>

                  <KeyLine>
                    Se as pessoas da sua zona não souberem que existe, dificilmente o vão
                    escolher.
                  </KeyLine>

                  <p>
                    É por isso que uma das perguntas mais antigas de qualquer negócio local
                    continua, hoje, tão atual como sempre: como faço para que mais potenciais
                    clientes me conheçam?
                  </p>
                  <p>
                    Durante muitos anos, a resposta era mais ou menos previsível. Distribuir
                    flyers. Pôr um anúncio no jornal da região. Patrocinar a festa da terra. E
                    esperar que os clientes falassem bem do negócio a outras pessoas.
                  </p>
                  <p>
                    Hoje há muitas mais formas de o fazer — e é fácil sentir-se um pouco perdido
                    entre elas. Algumas ajudam a captar pessoas que já andam à procura de algo
                    parecido com o que vende. Outras ajudam a ser descoberto antes mesmo de essa
                    procura existir.
                  </p>
                  <p>Esta diferença é, provavelmente, a ideia mais importante deste artigo.</p>

                  <h2 id="dois-momentos" className="scroll-mt-24 text-[26px] font-black leading-tight tracking-[-0.02em] mt-16 mb-5 sm:text-[32px]">
                    Dois momentos que decidem se é escolhido
                  </h2>
                  <p>
                    Quando se fala em &ldquo;dar a conhecer um negócio&rdquo;, é tentador pensar
                    nisso como uma coisa só: mais pessoas a ver o nome do negócio nalgum lado. Na
                    prática, há dois momentos bem diferentes em que isso acontece. E cada um pede
                    uma abordagem diferente.
                  </p>

                  <h3 id="ja-procura" className="scroll-mt-24 text-[20px] font-bold leading-snug mt-10 mb-4 sm:text-[22px]">
                    Ser encontrado quando alguém já procura
                  </h3>
                  <p>
                    Imagine alguém a pesquisar no Google, às 22h de uma terça-feira:
                  </p>
                  <p className="my-6 text-[19px] font-semibold italic text-ink sm:text-[21px]">
                    &ldquo;dentista Caldas da Rainha&rdquo;
                  </p>
                  <p>
                    Esta pessoa não está a descobrir dentistas por curiosidade. Já decidiu que
                    precisa de um. Está apenas a escolher entre as opções que aparecem à sua
                    frente, naquele preciso momento.
                  </p>
                  <p>
                    É aqui que entram o Google, o Google Maps, as reviews, os diretórios locais e
                    o SEO — o trabalho de aparecer bem posicionado nas pesquisas. São canais
                    fortíssimos numa coisa: aparecer exatamente quando alguém já quer aquilo que
                    vende.
                  </p>

                  <h3 id="antes-de-procurar" className="scroll-mt-24 text-[20px] font-bold leading-snug mt-10 mb-4 sm:text-[22px]">
                    Ser descoberto antes de estar à procura
                  </h3>
                  <p>
                    Agora imagine outra pessoa. Ainda não decidiu onde vai jantar no sábado —
                    talvez nem tenha pensado nisso. Mas, ao longo da semana, sem procurar nada em
                    particular, vai vendo o mesmo restaurante da sua zona a aparecer no Instagram:
                    um prato, a esplanada cheia ao final da tarde, um vídeo curto do chef a
                    preparar o prato do dia.
                  </p>
                  <p>
                    Quando chega sábado e decide sair para jantar, esse nome já lhe é familiar.
                    Não precisou de o procurar. Já o &ldquo;conhecia&rdquo;.
                  </p>
                  <p>
                    É aqui que entram o boca-a-boca, o conteúdo, as redes sociais, a publicidade
                    física e a publicidade digital — incluindo os anúncios no Instagram e no
                    Facebook, geridos através de uma ferramenta chamada Meta Ads.
                  </p>

                  <InsightBox>
                    Google ajuda sobretudo a captar procura que já existe. Publicidade e
                    comunicação ajudam também a criar familiaridade antes dessa procura aparecer.
                  </InsightBox>

                  <h2 id="ser-considerado" className="scroll-mt-24 text-[26px] font-black leading-tight tracking-[-0.02em] mt-16 mb-5 sm:text-[32px]">
                    Antes de ser escolhido, tem de ser considerado
                  </h2>
                  <p>
                    Há ainda outro pormenor que vale a pena perceber: os consumidores não escolhem
                    necessariamente o primeiro negócio que encontram.
                  </p>

                  <StatBox value="72%">
                    Um estudo da BrightLocal concluiu que 72% dos consumidores consideram três
                    empresas locais ou menos antes de tomar uma decisão.
                    <Cite n={1} />
                  </StatBox>

                  <p>
                    Ou seja: muitas vezes o verdadeiro objetivo não é ser &ldquo;o único&rdquo;
                    nome que existe. É conseguir entrar nessa lista curta de opções que a pessoa
                    vai considerar antes de decidir.
                  </p>

                  <KeyLine>
                    Antes de ser escolhido, primeiro tem de ser considerado. E antes de ser
                    considerado, tem de ser conhecido ou encontrado.
                  </KeyLine>

                  <h2 id="cinco-formas" className="scroll-mt-24 text-[26px] font-black leading-tight tracking-[-0.02em] mt-16 mb-5 sm:text-[32px]">
                    As cinco formas de dar a conhecer o seu negócio
                  </h2>
                  <p>
                    Não há uma resposta única para &ldquo;como consigo mais clientes&rdquo;. Há,
                    isso sim, cinco formas que continuam a funcionar hoje — cada uma com uma força
                    diferente. Vale a pena perceber onde entra cada uma, em vez de escolher às
                    cegas.
                  </p>

                  <h3 id="boca-a-boca" className="scroll-mt-24 text-[20px] font-bold leading-snug mt-10 mb-4 sm:text-[22px]">
                    1. Boca-a-boca: provavelmente o melhor cliente que pode receber
                  </h3>
                  <p>
                    Poucas coisas são tão poderosas como alguém dizer: &ldquo;Vai ali, são mesmo
                    bons.&rdquo; Uma recomendação transfere confiança de uma pessoa para outra
                    antes de o negócio ter sequer de se apresentar.
                  </p>
                  <p>
                    <strong>Onde é forte:</strong> gera confiança quase instantânea, custa muito
                    pouco a conseguir e costuma trazer clientes de boa qualidade — pessoas que já
                    chegam predispostas a gostar.
                  </p>
                  <p>
                    <strong>Limitação:</strong> o problema não é o boca-a-boca não funcionar. É
                    ser difícil de controlar quando acontece. Não pode decidir, esta semana, que
                    vai ter mais dez recomendações.
                  </p>

                  <KeyLine>
                    O boca-a-boca é excelente para colher procura. É menos útil quando precisa de
                    criar mais procura esta semana.
                  </KeyLine>

                  <h3 id="google" className="scroll-mt-24 text-[20px] font-bold leading-snug mt-10 mb-4 sm:text-[22px]">
                    2. Google: estar presente quando alguém já precisa de si
                  </h3>
                  <p>
                    Se alguém pesquisar &ldquo;canalizador perto de mim&rdquo; às 22h, porque tem
                    água a entrar em casa, não quer descobrir uma marca simpática. Quer resolver
                    um problema, depressa.
                  </p>
                  <p>
                    É por isso que o Google — e o Google Maps — continuam a ser dos canais mais
                    importantes para qualquer negócio local. O Perfil de Empresa no Google, que
                    mostra morada, horário, fotos e avaliações, é gratuito de configurar.
                    <Cite n={2} />
                  </p>

                  <Tip>
                    Se ainda não tem o Perfil de Empresa Google corretamente configurado — com
                    morada, horário e fotografias atualizadas — vale a pena tratar disso antes de
                    gastar dinheiro em publicidade. É gratuito e é normalmente o primeiro sítio
                    onde um cliente novo o vai encontrar.
                  </Tip>

                  <p>
                    Segundo dados da BrightLocal, 84% dos consumidores pesquisaram online por um
                    negócio local nos últimos três meses. Dessas pesquisas, 52% começaram no
                    Google e outros 9% no Google Maps.
                    <Cite n={3} />
                  </p>
                  <p>
                    <strong>Limitação:</strong> o Google é particularmente forte quando a procura
                    já existe. Mas ninguém pesquisa pelo seu restaurante antes de decidir que quer
                    jantar fora.
                  </p>

                  <h3 id="redes-sociais" className="scroll-mt-24 text-[20px] font-bold leading-snug mt-10 mb-4 sm:text-[22px]">
                    3. Instagram e Facebook: mostrar o negócio antes de o cliente precisar dele
                  </h3>
                  <p>
                    Para muitos negócios, o Instagram funciona hoje quase como uma montra. É onde
                    mostram o trabalho, os produtos, os resultados, o espaço, a equipa e as
                    opiniões de quem já é cliente.
                  </p>
                  <p>
                    Esse conteúdo constrói confiança, familiaridade, prova social — ver que outras
                    pessoas gostaram — e alguma autoridade no que faz.
                  </p>
                  <p>
                    Mas publicar não significa automaticamente distribuir. Uma página pode ter
                    conteúdo excelente e, ainda assim, chegar sobretudo às pessoas que já a seguem
                    — porque é assim que as redes sociais tendem a funcionar hoje: mostram o
                    conteúdo, primeiro, a quem já demonstrou interesse.
                  </p>
                  <p>
                    Fazer isto bem também exige tempo. Uma pesquisa da Constant Contact
                    identificou a gestão de redes sociais como uma das tarefas de marketing que
                    mais tempo consome entre pequenos negócios.
                    <Cite n={4} />
                  </p>

                  <KeyLine>Criar conteúdo e distribuir conteúdo são problemas diferentes.</KeyLine>

                  <h3 id="publicidade-local" className="scroll-mt-24 text-[20px] font-bold leading-snug mt-10 mb-4 sm:text-[22px]">
                    4. Flyers, outdoors e publicidade local: a lógica continua a funcionar
                  </h3>
                  <p>
                    Há uma razão pela qual restaurantes, imobiliárias, ginásios e lojas continuam
                    a usar outdoors, mupis, flyers e patrocínios locais: repetição gera
                    familiaridade. Quanto mais vezes uma pessoa vê o mesmo nome, mais natural se
                    torna lembrar-se dele quando precisar.
                  </p>
                  <p>
                    A publicidade física tem uma vantagem simples: coloca o negócio diante de
                    pessoas de uma determinada zona, de forma visível. Em Portugal, por exemplo,
                    ainda é possível contratar distribuição local de publicidade em correio não
                    endereçado através de serviços como o CTT Ads.
                    <Cite n={5} />
                  </p>
                  <p>
                    Mas tem também limitações claras: é difícil de segmentar com precisão — não
                    escolhe exatamente quem vê — difícil de medir com rigor, cara de produzir e
                    lenta de alterar depois de impressa.
                  </p>
                  <p>
                    A internet permitiu aplicar uma lógica parecida de outra forma: em vez de
                    escolher uma estrada, um bairro ou uma caixa de correio, pode escolher uma
                    zona geográfica e aparecer diretamente nos ecrãs das pessoas que lá vivem.
                  </p>

                  <h3 id="publicidade-digital" className="scroll-mt-24 text-[20px] font-bold leading-snug mt-10 mb-4 sm:text-[22px]">
                    5. Publicidade digital local: comprar distribuição
                  </h3>
                  <p>
                    Há uma diferença importante entre publicar numa rede social e anunciar nela.
                    Quando publica, espera que o algoritmo distribua o conteúdo. Quando anuncia,
                    paga precisamente por essa distribuição — a garantia de que o conteúdo vai ser
                    mostrado a mais pessoas, mesmo que não o sigam ainda.
                  </p>
                  <p>
                    Isso permite escolher a zona onde quer aparecer, o orçamento que quer gastar,
                    a mensagem que quer mostrar e durante quanto tempo. E, sobretudo, permite
                    alcançar pessoas fora do círculo de seguidores atuais — gerando a repetição e a
                    familiaridade de que falámos antes, mas de forma mais controlada.
                  </p>
                  <p>
                    Em Portugal, o Instagram tinha cerca de 6,35 milhões de utilizadores nos dados
                    publicados no relatório Digital 2026, e o alcance publicitário estimado da
                    plataforma representava aproximadamente 71,8% dos adultos portugueses. O
                    Facebook estava perto de 71,2%. Segundo os dados de publicidade das próprias
                    plataformas, compilados pelo DataReportal.
                    <Cite n={6} />
                  </p>
                  <p>
                    Vale a pena ler este número com cuidado: não significa que 71,8% das pessoas
                    vejam um anúncio específico. É uma estimativa da dimensão da audiência que, em
                    teoria, pode ser alcançada através de publicidade nessas plataformas — não do
                    alcance real de nenhuma campanha em concreto.
                  </p>
                  <p>
                    Mesmo assim, nem todos os negócios locais recorrem a isto: em 2024, cerca de
                    23,6% das empresas portuguesas abrangidas pelo levantamento do Eurostat sobre
                    utilização de tecnologia utilizavam publicidade paga online
                    <Cite n={7} />
                    {" — "}o universo do estudo não corresponde a todas as microempresas
                    portuguesas, mas às empresas incluídas nesse levantamento europeu.
                  </p>

                  <h2 id="qual-e-melhor" className="scroll-mt-24 text-[26px] font-black leading-tight tracking-[-0.02em] mt-16 mb-5 sm:text-[32px]">
                    Qual destas cinco é a melhor?
                  </h2>
                  <p>Depende. E, na maioria dos negócios locais, provavelmente não deveria escolher só uma.</p>
                  <p>
                    O Google ajuda quem já está à procura. As reviews ajudam a decidir entre as
                    opções curtas. As redes sociais ajudam a construir confiança ao longo do
                    tempo. O boca-a-boca continua a ser, sem dúvida, ouro puro. E a publicidade
                    permite aumentar deliberadamente o número de pessoas da sua zona que entram em
                    contacto com o negócio — em vez de esperar que isso aconteça sozinho.
                  </p>

                  <KeyLine>
                    O objetivo não é conseguir visualizações. É aumentar as oportunidades de ser
                    conhecido, lembrado e considerado quando chegar o momento de comprar.
                  </KeyLine>

                  <h2 id="aqui" className="scroll-mt-24 text-[26px] font-black leading-tight tracking-[-0.02em] mt-16 mb-5 sm:text-[32px]">
                    E se quiser apenas tornar essa última parte mais simples?
                  </h2>
                  <p>
                    Foi precisamente daqui que nasceu a{" "}
                    <strong className="font-black tracking-[-0.03em]">
                      Aqui<span className="text-red-strong">.</span>
                    </strong>
                  </p>
                  <p>
                    Há milhares de pequenos negócios que gostariam de anunciar no Instagram e no
                    Facebook, mas não querem aprender a usar o Gestor de Anúncios da Meta, criar
                    campanhas do zero, escolher objetivos e públicos, ou contratar uma agência
                    para o fazer por eles. Querem, simplesmente, promover o negócio junto de
                    pessoas da sua zona.
                  </p>
                  <p>A Aqui. trata dessa parte.</p>
                  <p>
                    Envia o material do anúncio, escolhe a campanha e a zona onde quer aparecer.
                    Tratamos da distribuição no Instagram e no Facebook.
                  </p>
                  <p className="text-[15px] text-muted">
                    Não prometemos mais clientes garantidos — isso depende também do negócio, da
                    oferta e de muitos outros fatores que não controlamos. O que garantimos é a
                    entrega das visualizações contratadas, na zona escolhida.
                  </p>
                  <p>
                    Para tornar o serviço simples de comprar e de acompanhar, as campanhas são
                    vendidas por quantidade de visualizações. Assim sabe exatamente qual é a
                    dimensão da campanha que está a contratar — sem ter de perceber de licitações,
                    orçamentos diários ou configuração de anúncios.
                  </p>

                  <ContextualCta
                    heading="Ver campanhas disponíveis"
                    subtext="Escolha a dimensão da campanha e veja quanto custa anunciar na sua zona."
                  />

                  <h2 id="resumo" className="scroll-mt-24 text-[26px] font-black leading-tight tracking-[-0.02em] mt-16 mb-5 sm:text-[32px]">
                    Em resumo
                  </h2>

                  <TakeawayBox
                    items={[
                      <>
                        Se alguém já procura o que vende <strong>→</strong> o Google e o Google
                        Maps são essenciais.
                      </>,
                      <>
                        Se quer gerar confiança <strong>→</strong> as reviews, as recomendações e
                        o conteúdo ajudam.
                      </>,
                      <>
                        Se quer que mais pessoas novas da sua zona descubram o negócio{" "}
                        <strong>→</strong> a distribuição paga pode acelerar esse processo.
                      </>,
                      <>Não precisa de escolher apenas uma destas estratégias.</>,
                    ]}
                    footer="A Aqui. existe apenas para tornar a última opção mais simples."
                  />

                  <FinalCta />
                </div>

                {/* Fontes */}
                <footer className="mt-16 border-t border-line pt-8">
                  <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-soft">
                    Fontes
                  </p>
                  <SourcesList sources={SOURCES} />
                </footer>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
      <StickyCta />
    </div>
  );
}
