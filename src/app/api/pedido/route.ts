import { nanoid } from "nanoid";
import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkoutLineName, orderInputSchema } from "@/lib/orders";
import { calculatePrice, clampViews } from "@/lib/pricing";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { createLoginLink } from "@/lib/auth";
import { sendLoginEmail } from "@/lib/email";
import { getPricingContext, recordExperimentEvent } from "@/lib/experiments";
import { getHeroContext, recordHeroExperimentEvent } from "@/lib/hero-experiment";
import { ExperimentEventType, HeroEventType } from "@/generated/prisma/enums";
import { hasMarketingConsent } from "@/lib/consent";
import { clientIp, readCookie } from "@/lib/meta/request-context";
import { getPackByVisualizations } from "@/lib/packs";

export const runtime = "nodejs";

/** Um mês a partir de agora — só usado como duração informativa do 1º ciclo local (sem Stripe). */
function oneMonthFromNow(from: Date): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export async function POST(request: Request) {
  try {
    const parsed = orderInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const input = parsed.data;

    // Nunca confiar num preço/volume vindo do browser: recalculado sempre aqui.
    const views = clampViews(input.views);
    const price = calculatePrice(views, input.billingFrequency);

    const email = input.email.trim().toLowerCase();

    // Variante/visitante/debug lidos sempre das próprias cookies desta
    // request (nunca do body) — ver `getPricingContext`.
    const {
      variant: pricingVariant,
      visitorId: pricingVisitorId,
      isDebug: pricingExperimentDebug,
    } = await getPricingContext();

    // Teste independente da headline do Hero — mesma leitura das cookies do
    // pedido, nunca do body (ver `getHeroContext`).
    const {
      variant: heroVariant,
      visitorId: heroVisitorId,
      isDebug: heroExperimentDebug,
    } = await getHeroContext();

    // Meta Pixel + Conversions API — capturados aqui porque este é o único
    // momento em que temos o pedido real do browser do cliente; o webhook da
    // Stripe (que confirma o pagamento) não tem acesso a nada disto — nem ao
    // IP nem ao user-agent de quem pagou, só ao que a própria Stripe vê
    // (os seus servidores), que não deve nunca ser usado como "client IP".
    // `metaPurchaseEventId` é gerado já agora (mesmo que o pagamento venha a
    // falhar) e fica na Order — `/checkout/sucesso` e o webhook lêem-no de
    // lá, partilhando o mesmo id entre o Pixel (browser) e a CAPI (servidor).
    const metaMarketingConsent = await hasMarketingConsent();
    const metaPurchaseEventId = nanoid();
    const metaFbp = metaMarketingConsent ? readCookie(request, "_fbp") : null;
    const metaFbc = metaMarketingConsent
      ? (readCookie(request, "_fbc") ?? readCookie(request, "_fbc_pending"))
      : null;
    const metaClientUserAgent = metaMarketingConsent ? request.headers.get("user-agent") : null;
    const metaClientIp = metaMarketingConsent ? clientIp(request) : null;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: input.name,
        phone: input.phone,
        companyName: input.companyName,
      },
      update: {
        name: input.name,
        phone: input.phone,
        companyName: input.companyName,
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        zone: input.zone,
        visualizationsPurchased: views,
        price,
        billingFrequency: input.billingFrequency,
        pricingVariant,
        pricingExperimentDebug,
        heroVariant,
        heroExperimentDebug,
        metaPurchaseEventId,
        metaMarketingConsent,
        metaFbp,
        metaFbc,
        metaClientUserAgent,
        metaClientIp,
        assets: {
          create: input.assets.map((asset) => ({
            fileUrl: asset.url,
            fileType: asset.fileType,
          })),
        },
      },
    });

    if (!isStripeConfigured()) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Pagamentos indisponíveis." }, { status: 500 });
      }
      // Sem chaves Stripe (desenvolvimento local) o pagamento é simulado —
      // também cria aqui o primeiro DeliveryCycle, para testar o fluxo
      // completo (incluindo sincronização Meta) sem chaves reais.
      const now = new Date();
      await prisma.$transaction([
        prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } }),
        prisma.deliveryCycle.create({
          data: {
            orderId: order.id,
            targetViews: views,
            startsAt: now,
            endsAt: oneMonthFromNow(now),
          },
        }),
      ]);
      const link = await createLoginLink(user.id, `/painel/campanhas/${order.id}`);
      await sendLoginEmail(user.email, link);
      return NextResponse.json({ url: `/checkout/sucesso?pedido=${order.id}` });
    }

    const stripe = getStripe();
    const lineName = checkoutLineName(views, input.zone);
    const description = `Campanha para ${input.companyName}`;

    // `payment_method_types` fica de propósito por definir: isto ativa
    // "dynamic payment methods" da Stripe, que decide os métodos elegíveis
    // (cartão, MB WAY, Multibanco, ...) a partir do que estiver ativo em
    // dashboard.stripe.com/settings/payment_methods — sem precisar de código
    // aqui. Para ativar MB WAY basta ativá-lo lá (moeda EUR já garantida).
    // Nota: a própria Stripe não suporta MB WAY em `mode: "subscription"`
    // (só em `mode: "payment"`), por isso não aparece nunca no ramo MONTHLY
    // abaixo, independentemente do que estiver ativo no Dashboard.
    const session =
      input.billingFrequency === "ONE_TIME"
        ? await stripe.checkout.sessions.create({
            mode: "payment",
            customer_email: email,
            client_reference_id: order.id,
            metadata: { orderId: order.id },
            payment_intent_data: { metadata: { orderId: order.id } },
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: "eur",
                  unit_amount: price,
                  product_data: { name: lineName, description },
                },
              },
            ],
            success_url: appUrl("/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}"),
            cancel_url: appUrl(`/pedido?cancelado=1`),
          })
        : await stripe.checkout.sessions.create({
            mode: "subscription",
            customer_email: email,
            client_reference_id: order.id,
            metadata: { orderId: order.id },
            // `metadata.orderId` na própria Subscription garante que o
            // webhook `invoice.paid` consegue sempre resolver a Order, mesmo
            // que chegue antes de `checkout.session.completed`.
            subscription_data: { metadata: { orderId: order.id } },
            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: "eur",
                  unit_amount: price,
                  recurring: { interval: "month" },
                  product_data: { name: lineName, description },
                },
              },
            ],
            success_url: appUrl("/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}"),
            cancel_url: appUrl(`/pedido?cancelado=1`),
          });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    // Só dispara quando a Order já existe E a Stripe Session foi criada com
    // sucesso (tem `id` e `url`) — nunca se a Stripe tiver falhado antes
    // (nesse caso o `catch` abaixo já teria interrompido o pedido).
    if (session.id && session.url) {
      after(() =>
        recordExperimentEvent({
          eventType: ExperimentEventType.STRIPE_SESSION_CREATED,
          variant: pricingVariant,
          visitorId: pricingVisitorId,
          isDebug: pricingExperimentDebug,
          metadata: {
            orderId: order.id,
            packId: getPackByVisualizations(views)?.id ?? null,
            billingFrequency: input.billingFrequency,
            price,
            pricingVariant,
          },
        }).catch((error) => {
          console.error("[pedido] falha ao registar stripe_session_created:", error);
        }),
      );
      // Mesmo evento, registado também para o teste independente do Hero.
      after(() =>
        recordHeroExperimentEvent({
          eventType: HeroEventType.STRIPE_SESSION_CREATED,
          variant: heroVariant,
          visitorId: heroVisitorId,
          isDebug: heroExperimentDebug,
          metadata: {
            orderId: order.id,
            packId: getPackByVisualizations(views)?.id ?? null,
            billingFrequency: input.billingFrequency,
            price,
            heroVariant,
          },
        }).catch((error) => {
          console.error("[pedido] falha ao registar hero stripe_session_created:", error);
        }),
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Nunca deixar um erro não tratado devolver uma resposta não-JSON: o
    // cliente depende de poder ler sempre `{ error }`, mesmo em falhas
    // inesperadas (ex.: Stripe em baixo, schema da BD desatualizado).
    console.error("[pedido] erro ao criar encomenda:", error);
    return NextResponse.json(
      { error: "Não foi possível continuar para o pagamento. Tente novamente." },
      { status: 500 },
    );
  }
}
