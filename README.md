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

## Storage

`src/lib/storage` expõe um `StorageDriver` com `put`, `remove` e `read`. Existem dois drivers:

- `local` — grava em `./storage` e serve através de `/api/ficheiros/...`
- `vercel-blob` — o browser envia o ficheiro directamente para o Blob (client upload,
  `/api/blob/upload` só emite o token), sem passar pelo body de uma função Vercel. O
  Blob Store fica `private`; o admin só consegue ver os ficheiros através de
  `/api/admin/ficheiros`, que autentica antes de servir o conteúdo

Trocar de fornecedor (Cloudflare R2, S3, …) é implementar a mesma interface e registá-lo em
`src/lib/storage/index.ts`.

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
