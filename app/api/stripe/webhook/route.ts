import { NextResponse } from "next/server";
import { fulfillCheckoutSession, type StripeCheckoutSessionForFulfillment } from "@/lib/server/stripeFulfillment";
import { constructStripeWebhookEvent } from "@/lib/server/stripeWebhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Вебхук Stripe не настроен. Добавь STRIPE_WEBHOOK_SECRET в .env.local локально или в переменные окружения Vercel." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = constructStripeWebhookEvent<StripeCheckoutSessionForFulfillment>(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Некорректный вебхук Stripe." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type ?? "unknown" });
  }

  const session = event.data?.object;
  if (!session) {
    return NextResponse.json({ error: "В вебхуке Stripe нет объекта сессии оплаты." }, { status: 400 });
  }

  try {
    const fulfillment = await fulfillCheckoutSession(session);
    if (!fulfillment.fulfilled) {
      return NextResponse.json({ received: true, fulfilled: false, reason: fulfillment.reason });
    }

    return NextResponse.json({
      received: true,
      fulfilled: true,
      alreadyProcessed: fulfillment.alreadyProcessed,
      type: fulfillment.passSeasonId || fulfillment.plan ? "sudoku_pass" : "diamond_pack",
      seasonId: fulfillment.passSeasonId ?? null
    });
  } catch (error) {
    console.error("Ошибка начисления вебхука Stripe:", error);
    return NextResponse.json({ error: "Не удалось начислить покупку из сессии Stripe." }, { status: 500 });
  }
}
