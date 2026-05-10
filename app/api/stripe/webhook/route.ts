import { NextResponse } from "next/server";
import { fulfillCheckoutSession, type StripeCheckoutSessionForFulfillment } from "@/lib/server/stripeFulfillment";
import { constructStripeWebhookEvent } from "@/lib/server/stripeWebhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured. Add STRIPE_WEBHOOK_SECRET to .env.local locally or Vercel Environment Variables in production." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = constructStripeWebhookEvent<StripeCheckoutSessionForFulfillment>(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Stripe webhook." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type ?? "unknown" });
  }

  const session = event.data?.object;
  if (!session) {
    return NextResponse.json({ error: "Stripe webhook has no checkout session object." }, { status: 400 });
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
      type: fulfillment.plan ? "subscription" : "diamond_pack"
    });
  } catch (error) {
    console.error("Stripe webhook fulfillment error:", error);
    return NextResponse.json({ error: "Could not fulfill Stripe checkout session." }, { status: 500 });
  }
}
