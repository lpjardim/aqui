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

A `Order` tem os campos `metaCampaignId`, `metaAdSetId`, `metaAdId`, `metaAdUrl` e
`targetReachedAt`, preenchíveis manualmente na secção "Meta" do `/admin`. Enquanto o
`metaAdId` estiver preenchido, `visualizationsDelivered` passa a ser atualizado
automaticamente a partir das "impressions" reportadas pela Meta Ads Insights API — não
existe (nem deve voltar a existir) um input manual para esse valor.

### Como funciona

`src/lib/meta.ts` concentra toda a lógica:

- `fetchMetaDeliveredViews(metaAdId)` — chama `GET /{metaAdId}/insights?fields=impressions`
  na Graph API (versão definida por `META_GRAPH_API_VERSION`, nunca hardcoded), com timeout
  de 8s. Nunca regista `META_ACCESS_TOKEN` em logs.
- `applyDeliveredViews(orderId, impressions)` — `visualizationsDelivered` nunca desce
  (usa sempre o maior valor já conhecido) e fica sempre limitado a
  `visualizationsPurchased` (o progresso no painel nunca passa de 100%). O valor em bruto
  devolvido pela Meta fica registado em `CampaignUpdate` para auditoria, mesmo que exceda o
  comprado. Ao atingir o alvo pela primeira vez, guarda `targetReachedAt` e envia UMA
  notificação interna (`INTERNAL_NOTIFICATIONS_EMAIL`) — nunca pausa a campanha.
- `syncActiveCampaigns()` — percorre encomendas `PAID`, `IN_REVIEW` ou `ACTIVE` com
  `metaAdId` definido; uma falha numa encomenda não impede as restantes. Regista a hora da
  última execução (tabela `AppSetting`), mostrada no `/admin`.

Fluxo: **Meta (impressions) → `syncActiveCampaigns` → `Order.visualizationsDelivered` (BD)
→ `/painel/campanhas/[id]` (progresso do cliente) → notificação interna ao atingir o
alvo**.

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
| `META_AD_ACCOUNT_ID` | Conta de anúncios da Aqui. (referência; a chamada de insights usa o `metaAdId` diretamente) |
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

Não há integrações externas. `src/lib/analytics.ts` centraliza os eventos para que o Meta
Pixel/CAPI possa ser adicionado num único sítio mais tarde.

## Deploy na Vercel

1. Criar a base de dados Postgres e definir as variáveis de ambiente.
2. Definir `STORAGE_DRIVER` e `NEXT_PUBLIC_STORAGE_DRIVER` como `vercel-blob`.
3. Apontar o webhook da Stripe para `https://<dominio>/api/stripe/webhook`.
4. As migrações correm com `npx prisma migrate deploy`.
