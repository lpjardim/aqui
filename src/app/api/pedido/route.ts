import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPack } from "@/lib/packs";
import { checkoutLineName, orderInputSchema } from "@/lib/orders";
import { appUrl, getStripe, isStripeConfigured } from "@/lib/stripe";
import { createLoginLink } from "@/lib/auth";
import { sendLoginEmail } from "@/lib/email";

export const runtime = "nodejs";

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
    const pack = getPack(input.packId);

    if (!pack) {
      return NextResponse.json({ error: "Pack inválido." }, { status: 400 });
    }

    const email = input.email.trim().toLowerCase();

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
        visualizationsPurchased: pack.visualizations,
        price: pack.price,
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
      // Sem chaves Stripe (desenvolvimento local) o pagamento é simulado.
      await prisma.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      const link = await createLoginLink(user.id, `/painel/campanhas/${order.id}`);
      await sendLoginEmail(user.email, link);
      return NextResponse.json({ url: `/checkout/sucesso?pedido=${order.id}` });
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
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
            unit_amount: pack.price,
            product_data: {
              name: checkoutLineName(pack.visualizations, input.zone),
              description: `Campanha para ${input.companyName}`,
            },
          },
        },
      ],
      success_url: appUrl("/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: appUrl(`/pedido?pack=${pack.id}&cancelado=1`),
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

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
