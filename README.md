# Aqui.

Produto self-service de publicidade local. O cliente escolhe a zona, envia fotos ou vídeos,
escolhe quantas visualizações quer comprar e paga. A operação das campanhas Meta é manual,
feita a partir do painel de admin.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- Stripe Checkout
- Storage com driver de disco local (dev) ou Vercel Blob (produção)

## Arrancar em local

```bash
npm install
cp .env.example .env      # e preencher
npm run db:migrate
npm run dev
```

Sem `STRIPE_SECRET_KEY` definida, o pagamento é simulado em desenvolvimento: a encomenda fica
`PAID` logo após o pedido e o link de acesso ao painel é escrito na consola. Esse atalho está
bloqueado em produção.

Sem `RESEND_API_KEY`, os emails (incluindo os magic links) são escritos na consola.

## Variáveis de ambiente

| Variável | Para que serve |
| --- | --- |
| `DATABASE_URL` | Ligação PostgreSQL |
| `NEXT_PUBLIC_APP_URL` | URL público, usado em emails, Stripe e sitemap |
| `AUTH_SECRET` | Assinatura dos cookies de sessão (`openssl rand -base64 32`) |
| `ADMIN_PASSWORD` | Password do painel interno |
| `STRIPE_SECRET_KEY` | Chave secreta Stripe |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe |
| `STORAGE_DRIVER` / `NEXT_PUBLIC_STORAGE_DRIVER` | `local` ou `vercel-blob` (valores iguais) |
| `BLOB_READ_WRITE_TOKEN` | Token do Vercel Blob |
| `RESEND_API_KEY`, `EMAIL_FROM` | Envio de email |
| `INTERNAL_NOTIFICATIONS_EMAIL` | Destino de notificações internas (ex.: alvo de visualizações atingido) |
| `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_GRAPH_API_VERSION` | Integração Meta Marketing API (ver secção própria) |
| `CRON_SECRET` | Autentica o Vercel Cron em `/api/cron/meta-sync` |

## Stripe

O checkout usa métodos de pagamento automáticos: cartão, Apple Pay, Google Pay, MB WAY e
Multibanco são activados no dashboard da Stripe, sem alterações de código.

O estado `PAID` só é escrito pelo webhook (`/api/stripe/webhook`), nunca pelo redirect do
browser. Multibanco e MB WAY confirmam mais tarde, através de
`checkout.session.async_payment_succeeded`.

Em local:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

O Stripe não segue redirects nas entregas de webhook: um 3xx conta como falha. Antes de
configurar o endpoint no Dashboard da Stripe, confirma que a URL escolhida não sofre
redirect (por exemplo, `www` vs. domínio nu, ou um domínio secundário a apontar para o
principal na Vercel):

```bash
curl -I -X POST "https://<dominio-exacto>/api/stripe/webhook"
```

Se devolver `308`, usa o domínio indicado em `Location` (ou corrige em Vercel → Settings →
Domains qual domínio é o principal) antes de guardar o endpoint na Stripe.

## Storage

`src/lib/storage` expõe um `StorageDriver` com `put`, `remove` e `read`. Existem dois drivers:

- `local` — grava em `./storage` e serve através de `/api/ficheiros/...`
- `vercel-blob` — o browser envia o ficheiro directamente para o Blob (client upload,
  `/api/blob/upload` só emite o token), sem passar pelo body de uma função Vercel. O
  Blob Store fica `private`; o admin só consegue ver os ficheiros através de
  `/api/admin/ficheiros`, que autentica antes de servir o conteúdo

Trocar de fornecedor (Cloudflare R2, S3, …) é implementar a mesma interface e registá-lo em
`src/lib/storage/index.ts`.

## Integração Meta Marketing API

Não existe (nem deve voltar a existir) qualquer input manual de Campaign ID / Ad Set ID /
Ad ID no `/admin`. A associação entre uma `Order` e a respetiva campanha Meta é automática,
pelo **nome exato da campanha**:

```
getExpectedMetaCampaignName(order) = "{empresa} — {zona} — {data} — {shortOrderId}"
```

`shortOrderId` são os últimos 4 caracteres do Order ID (maiúsculas), para garantir
unicidade caso o mesmo cliente compre duas campanhas na mesma zona no mesmo dia. Este nome
é puramente interno/técnico — nunca é mostrado como título ao cliente.

Fluxo de trabalho: criar a campanha no Ads Manager com o nome exato mostrado no `/admin`
("Nome da campanha Meta", com botão "Copiar nome") → a Aqui. encontra-a automaticamente
(no botão manual "Associar automaticamente" ou no cron/sync). `visualizationsDelivered`
passa então a ser atualizado a partir das "impressions" reportadas pela Meta Ads Insights
API.

### Como funciona

`src/lib/meta.ts` concentra toda a lógica de acesso à Graph API (só leitura — `ads_read`,
nunca cria/edita/pausa campanhas nem altera orçamentos):

- `findMetaCampaignsByExactName(name)` — procura campanhas em `META_AD_ACCOUNT_ID` com
  `filtering=[{field:"name",operator:"EQUAL",value:name}]`. Só associa automaticamente
  quando há **exatamente 1** correspondência exata; 0 mostra "Campanha ainda não
  encontrada na Meta.", mais de 1 mostra a lista para escolha manual no `/admin`.
- `associateOrderWithCampaign(orderId, campaignId)` — guarda `metaCampaignId` e, como
  referência para a pré-visualização do anúncio, o primeiro ad set/anúncio encontrados
  (`getMetaCampaignChildren`).
- `fetchMetaImpressions(objectId)` — chama `GET /{id}/insights?fields=impressions` na
  Graph API (versão definida por `META_GRAPH_API_VERSION`, nunca hardcoded), com timeout
  de 8s. Nunca regista `META_ACCESS_TOKEN` em logs. Usa sempre o **nível de campanha**
  (`metaCampaignId`) — confirmado por teste real que devolve o total agregado de todos os
  ad sets/anúncios da campanha, sem risco de dupla contagem, mesmo havendo vários
  anúncios/criativos na mesma campanha.
- `getAdPreviewHtml(adId)` — Ad Previews API (`/{adId}/previews`), usada para a
  pré-visualização "Ver anúncio" no painel do cliente. É um HTML/iframe assinado e
  temporário: nunca é guardado na BD, é gerado de novo em cada visita à página (funciona
  só com `ads_read`, sem precisar de permissões de Página/`pages_read_engagement`).
- `applyDeliveredViews(orderId, impressions)` — `visualizationsDelivered` nunca desce
  (usa sempre o maior valor já conhecido) e fica sempre limitado a
  `visualizationsPurchased` (o progresso no painel nunca passa de 100%). O valor em bruto
  devolvido pela Meta fica registado em `CampaignUpdate` para auditoria, mesmo que exceda o
  comprado. Ao atingir o alvo pela primeira vez, guarda `targetReachedAt` e envia UMA
  notificação interna (`INTERNAL_NOTIFICATIONS_EMAIL`) — nunca pausa a campanha.
- `syncActiveCampaigns()` — para encomendas `PAID`, `IN_REVIEW` ou `ACTIVE` sem
  `metaCampaignId`, tenta primeiro auto-associar pelo nome esperado; depois sincroniza as
  impressions de todas as que já têm `metaCampaignId` (ou, por compatibilidade, apenas
  `metaAdId`). Uma falha numa encomenda não impede as restantes. Regista a hora da última
  execução (tabela `AppSetting`), mostrada no `/admin`.

Fluxo: **admin cria a campanha na Meta com o nome exato → `syncActiveCampaigns`/"Associar
automaticamente" encontra-a e guarda `metaCampaignId` → Meta (impressions ao nível da
campanha) → `Order.visualizationsDelivered` (BD) → `/painel/campanhas/[id]` (progresso e
pré-visualização do anúncio ao cliente) → notificação interna ao atingir o alvo**.

O que continua manual: criar a campanha (com o nome certo) e os respetivos ad sets/anúncios
no Ads Manager — a Aqui. nunca cria, edita, pausa campanhas nem altera orçamentos; e a
escolha manual da campanha certa nos casos raros em que existe mais de 1 correspondência
exata pelo nome.

### Disparo da sincronização

- **Manual (MVP):** botão "Sincronizar Meta" no `/admin`, útil para testar sem esperar
  pelo cron.
- **Automático:** `/api/cron/meta-sync`, protegido por `CRON_SECRET` (a Vercel injeta
  automaticamente `Authorization: Bearer <CRON_SECRET>` nas suas próprias invocações;
  qualquer outro pedido é recusado com 401). Agendado em `vercel.json`.

No plano **Hobby**, a Vercel só permite cron jobs **1x por dia** (e com até ~59 min de
imprecisão), por isso `vercel.json` está configurado com `"0 6 * * *"`. Ao mudar para o
plano **Pro**, basta alterar essa expressão (ex.: `"0 * * * *"` para 1x por hora) — não é
preciso alterar código.

### Configuração necessária (credenciais Meta)

Variáveis de ambiente:

| Variável | Para que serve |
| --- | --- |
| `META_ACCESS_TOKEN` | Token de acesso server-to-server (System User, permissão `ads_read`) |
| `META_AD_ACCOUNT_ID` | Conta de anúncios da Aqui. onde se procuram as campanhas por nome exato |
| `META_GRAPH_API_VERSION` | Versão da Graph API a usar em todos os pedidos |
| `CRON_SECRET` | Autentica as chamadas do Vercel Cron a `/api/cron/meta-sync` |

Caminho recomendado para gerar o token, feito uma única vez em
[Business Settings → System Users](https://business.facebook.com/settings/system-users):

1. Criar (ou reutilizar) uma Meta App associada ao Business Portfolio da Aqui., com o
   produto **Marketing API** adicionado.
2. Criar um **System User** do tipo "Admin" (ou "Employee", conforme o mínimo necessário)
   dentro desse Business Portfolio.
3. Atribuir ao System User apenas a conta de anúncios da Aqui. (não o portefólio inteiro).
4. Gerar um token para esse System User com a permissão `ads_read` (não usar tokens
   temporários do Graph API Explorer em produção — os tokens de System User não expiram
   por inatividade do browser).
5. Colocar o token em `META_ACCESS_TOKEN` nas Environment Variables da Vercel (nunca em
   código, `.env` versionado ou logs).

## Autenticação

Magic link por email, sem passwords. O token é guardado em hash, expira em 30 minutos e só
pode ser usado uma vez. A sessão é um cookie `httpOnly` assinado com HMAC.

O painel de admin é protegido por password (`ADMIN_PASSWORD`) num cookie separado.

## Rotas

| Rota | O que é |
| --- | --- |
| `/` | Landing page |
| `/pedido` | Formulário de encomenda (5 passos) |
| `/checkout/sucesso` | Confirmação após pagamento |
| `/entrar` | Pedido de magic link |
| `/painel` | Campanhas do cliente |
| `/painel/campanhas/[id]` | Progresso de uma campanha |
| `/painel/documentos` | Comprovativos |
| `/admin` | Painel interno |
| `/termos`, `/privacidade`, `/cookies` | Páginas legais |

## Imagens

As imagens da secção "Como funciona" vão para `public/como-funciona/` (ver o `LEIA-ME.txt`
dessa pasta). Enquanto não existirem, aparece um espaço reservado com a mesma proporção.

## Tracking

`src/lib/analytics.ts` continua sem integrações externas (só `console.debug` em dev). O Meta
Pixel/CAPI vive num módulo próprio (`src/lib/meta/`, `src/lib/consent.ts`) — ver secção
seguinte.

## Meta Pixel + Conversions API

Módulo completamente separado da Integração Meta Marketing API acima (dataset "Aqui.",
ID `1073353675389361` no Events Manager — não confundir com "Aqui. Ads Sync", que é outra
coisa). 5 eventos:

| Evento | Onde dispara | Pixel | CAPI |
| --- | --- | --- | --- |
| `PageView` | Assim que o Pixel fica ativo (`pixel.tsx`), em qualquer página do site | Sim | Sim, via `/api/meta/track` |
| `ViewContent` | Mount de `meta-landing-view.tsx`, montado no topo da home (`/`) | Sim | Sim, via `/api/meta/track` |
| `InitiateCheckout` | Mount do formulário `/pedido` (mesmo ponto que `checkout_started`) | Sim | Sim, via `/api/meta/track` |
| `Purchase` | 1º pagamento: webhook `checkout.session.completed`/`async_payment_succeeded`. Renovações mensais: webhook `invoice.paid` | Sim, só o 1º pagamento (`/checkout/sucesso`) | Sim, sempre (fonte de verdade) |
| `Subscribe` | Só na 1ª mensalidade de uma subscrição `MONTHLY`, nunca em renovações | Sim, só o 1º pagamento (`/checkout/sucesso`) | Sim, sempre |

**`PageView` ≠ `ViewContent`.** `PageView` é o sinal standard "a página carregou" — é dele
que depende a métrica nativa "Landing Page Views" do Ads Manager (não do `ViewContent`).
`ViewContent` é o nosso sinal de "visitou o conteúdo principal da landing", mais específico
e não usado pela métrica nativa da Meta. Os dois coexistem sem conflito (`event_id`
independente em cada um).

### Consentimento tardio (aceitar cookies depois do 1º render)

`PageView`/`ViewContent`/`InitiateCheckout` disparam através de
`useFireMetaEventOnConsent` (`src/lib/meta/use-fire-meta-event.ts`): se o visitante ainda não
tiver decidido sobre cookies no momento em que o componente monta, o hook espera e dispara o
evento assim que o consentimento for concedido — mesmo que seja só segundos depois, já com o
banner fechado. Sem isto, qualquer evento cujo efeito corresse antes da decisão de
consentimento era perdido para sempre (o mount só acontece uma vez). Um `useRef` garante que
nunca dispara duas vezes na mesma visita, mesmo que o visitante mude de ideias em `/cookies`.

### Deduplicação Pixel + CAPI

Mesmo `event_id` nos dois lados (dedup da Meta é por `(event_name, event_id)`):

- `PageView`/`ViewContent`/`InitiateCheckout`: `event_id` gerado no browser
  (`crypto.randomUUID()`), usado simultaneamente no `fbq(...)` e no POST para
  `/api/meta/track`.
- `Purchase`/`Subscribe` do 1º pagamento: `Order.metaPurchaseEventId` (gerado com `nanoid()`
  em `/api/pedido`, antes de sequer se saber se o pagamento vai ser bem sucedido). O mesmo id
  serve para os dois eventos — não há colisão porque a dedup é por par
  `(event_name, event_id)`.
- `Purchase` de renovação mensal: `event_id = invoice.id` da Stripe — sem homólogo no Pixel
  (não há página associada a uma renovação), mas garante que um retry do mesmo webhook nunca
  duplica o evento do lado da Meta.

### Purchase a partir do Stripe (fonte de verdade)

**Nunca** a página `/checkout/sucesso` decide se houve pagamento — isso continua exclusivo do
webhook. `/checkout/sucesso` só lê o estado já confirmado e dispara o Pixel com o valor real.

- `markAsPaid()` (`checkout.session.completed`/`async_payment_succeeded`) — Purchase com
  `session.amount_total` (ONE_TIME e 1º pagamento MONTHLY). Se `billingFrequency === MONTHLY`,
  envia também Subscribe (mesmo `event_id`).
- `handleInvoicePaid()` (`invoice.paid`) — só envia Purchase quando **já existiam ciclos
  anteriores** (renovação real, nunca o 1º ciclo, que já foi tratado por `markAsPaid`). Nunca
  Subscribe aqui.
- Currency é sempre `EUR` (todo o catálogo de preços da Aqui. é EUR).
- Sem consentimento de marketing guardado na Order (`metaMarketingConsent`), nada é enviado —
  nem no 1º pagamento nem em renovações futuras dessa Order.

### Consentimento (PT/UE)

Cookie `aqui_consent` (`granted`/`denied`), banner mínimo em
`src/components/consent/cookie-banner.tsx`, sem categorias além de "essencial" (sempre ativo)
e "marketing" (Meta). Por omissão, sem decisão = sem Pixel, sem `_fbp`/`_fbc`, sem envio de
dados pessoais para a Meta. Pode ser reaberto em `/cookies` ("Gerir preferências de cookies").

### fbp/fbc

- `_fbp`/`_fbc` reais só existem depois de consentimento — geridos pelo próprio script do
  Pixel (`fbevents.js`), nunca inventados por nós.
- Se aparecer `fbclid` na URL antes de haver consentimento, `middleware.ts` guarda-o já no
  formato oficial (`fb.1.<timestamp_ms>.<fbclid>`) numa cookie técnica `_fbc_pending`, para não
  se perder enquanto o visitante ainda não decidiu. `/api/meta/track` e `/api/pedido` usam-na
  como fallback quando `_fbc` ainda não existe.
- `fbp`/`fbc` nunca são hashed (ver `src/lib/meta/hash.ts` e `src/lib/meta/capi.ts`).

### Identificadores / match quality

- `em`/`ph`: SHA-256 depois de normalizar (email: trim + lowercase; telefone: só dígitos, sem
  zeros à esquerda, com indicativo — assume `351` para números de 9 dígitos a começar por `9`).
- `external_id`: SHA-256 do `User.id` interno — o mesmo id em todos os eventos da mesma pessoa
  (`ViewContent`/`InitiateCheckout` não o enviam por não haver ainda `User` resolvido nesse
  ponto do funil; a partir de `Purchase`/`Subscribe` já existe sempre).
- `fn`/`ln`: SHA-256 do primeiro nome / resto do nome, derivados de `User.name` (campo único
  "nome" já recolhido no formulário `/pedido` — nunca pedimos nome/apelido separados só para
  isto). Só disponíveis a partir de `Purchase`/`Subscribe`.
- `country`/`zp`: SHA-256 do país (ISO 3166-1 alpha-2) e código postal de faturação. Lidos de
  `session.customer_details.address` (1º pagamento) / `invoice.customer_address` (renovação) —
  **só se a Stripe já os devolver por si**. Atualmente o Checkout não pede endereço de
  faturação (`billing_address_collection` não está definido, por omissão é `auto` e normalmente
  não recolhe nada para pagamentos por cartão em PT), por isso estes campos ficam
  deliberadamente `undefined` na prática. Optámos por não ativar a recolha de endereço só para
  ganhar EMQ — isso seria pedir um novo dado ao cliente, o que a tarefa pedia para evitar. Fica
  já ligado no código para o caso de a recolha de endereço vir a ser ativada por outro motivo
  (ex.: IVA/faturação) no futuro.
- `client_ip_address`/`client_user_agent`: nunca hashed. Para `ViewContent`/`InitiateCheckout`
  (via `/api/meta/track`) vêm sempre da própria request ao servidor. Para `Purchase`/`Subscribe`
  (webhook Stripe) vêm de `Order.metaClientIp`/`Order.metaClientUserAgent`, capturados em
  `/api/pedido` — **nunca** do IP/user-agent que a Stripe vê (que são os servidores da própria
  Stripe, não o browser do cliente); o webhook reutiliza o que foi guardado no momento em que o
  cliente real fez o pedido.

### Variáveis de ambiente

| Variável | Para que serve |
| --- | --- |
| `NEXT_PUBLIC_META_PIXEL_ID` | ID do dataset "Aqui." no Events Manager (`1073353675389361`) — público, visível em qualquer pedido de rede |
| `META_CAPI_ACCESS_TOKEN` | Token gerado especificamente para a Conversions API deste dataset — **não** é o mesmo token de `META_ACCESS_TOKEN` (Ads Sync) |
| `META_GRAPH_API_VERSION` | Reaproveitada da Integração Meta Marketing API acima — mesma versão para os dois módulos |
| `META_CAPI_TEST_EVENT_CODE` | Só durante testes no separador "Testar eventos" do Events Manager — nunca definida em produção |

**Importante (Vercel):** confirmar que `NEXT_PUBLIC_META_PIXEL_ID`/`META_CAPI_ACCESS_TOKEN`
estão definidas só para o ambiente "Production" no dashboard da Vercel — nunca para "Preview".
Caso contrário, qualquer deployment de preview (branches, PRs) dispara eventos reais para o
mesmo dataset "Aqui.", poluindo os números do Ads Manager com tráfego de testes internos.

### Ficheiros

`src/lib/meta/hash.ts` (normalização + SHA-256), `src/lib/meta/capi.ts` (cliente server-side da
Conversions API), `src/lib/meta/pixel.tsx` (carregamento do Pixel gated por consentimento +
`fireMetaPixelEvent` + `PageView`), `src/lib/meta/track-client.ts` (dispara Pixel + CAPI em
simultâneo com o mesmo `event_id`), `src/lib/meta/use-marketing-consent.ts` (único sítio que lê
a cookie de consentimento no browser), `src/lib/meta/use-fire-meta-event.ts` (dispara um evento
uma única vez, à espera de consentimento se necessário), `src/components/marketing/
meta-landing-view.tsx` (`ViewContent` da home), `src/app/api/meta/track/route.ts` (proxy CAPI
para `PageView`/`ViewContent`/`InitiateCheckout`), `src/lib/consent.ts` +
`src/components/consent/` (consentimento).

## Deploy na Vercel

1. Criar a base de dados Postgres e definir as variáveis de ambiente.
2. Definir `STORAGE_DRIVER` e `NEXT_PUBLIC_STORAGE_DRIVER` como `vercel-blob`.
3. Apontar o webhook da Stripe para `https://<dominio>/api/stripe/webhook`.
4. As migrações correm com `npx prisma migrate deploy`.
