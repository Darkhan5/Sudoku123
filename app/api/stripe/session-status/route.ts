import { NextResponse } from "next/server";
import { getDiamondStorePack, getDiamondStorePackTotalDiamonds } from "@/lib/domain/economy";
import { fulfillCheckoutSession } from "@/lib/server/stripeFulfillment";

export const dynamic = "force-dynamic";

interface StripeSessionStatus {
  status?: string;
  payment_status?: string;
  mode?: string;
  success_url?: string | null;
  client_reference_id?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
  metadata?: {
    plan?: string;
    purchase?: string;
    packId?: string;
    playerId?: string;
  } | null;
  error?: {
    message?: string;
  };
}

function stripeErrorMessage(payload: StripeSessionStatus): string {
  return payload.error?.message ?? "Stripe session status request failed";
}

export async function GET(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const sessionId = new URL(request.url).searchParams.get("session_id");

  if (!secretKey) {
    return NextResponse.json({ error: "Stripe demo is not configured. Add STRIPE_SECRET_KEY to .env.local." }, { status: 503 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`
    },
    cache: "no-store"
  });
  const payload = (await response.json()) as StripeSessionStatus;

  if (!response.ok) {
    return NextResponse.json({ error: stripeErrorMessage(payload) }, { status: response.status || 500 });
  }

  const pack = payload.metadata?.purchase === "diamond_pack" ? getDiamondStorePack(payload.metadata.packId) : undefined;
  const fulfillment = payload.status === "complete" ? await fulfillCheckoutSession(payload) : null;

  return NextResponse.json({
    status: payload.status,
    paymentStatus: payload.payment_status,
    mode: payload.mode,
    successUrl: payload.success_url ?? null,
    clientReferenceId: payload.client_reference_id ?? null,
    plan: payload.metadata?.plan ?? null,
    purchase: payload.metadata?.purchase ?? null,
    packId: pack?.id ?? null,
    diamonds: pack ? getDiamondStorePackTotalDiamonds(pack) : null,
    fulfilled: fulfillment?.fulfilled ?? false,
    alreadyProcessed: fulfillment?.alreadyProcessed ?? false,
    databasePlan: fulfillment?.databasePlan ?? null,
    fulfillmentReason: fulfillment?.reason ?? null
  });
}
