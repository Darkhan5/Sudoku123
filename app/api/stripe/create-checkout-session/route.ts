import { NextResponse } from "next/server";
import { getDiamondStorePack, getDiamondStorePackTotalDiamonds, type DiamondStorePackId } from "@/lib/domain/economy";
import { getCurrentSudokuPassSeason } from "@/lib/domain/sudokuPass";

export const dynamic = "force-dynamic";

interface CheckoutRequest {
  type?: string;
  packId?: string;
  playerId?: string;
}

interface StripeCheckoutSession {
  id?: string;
  url?: string | null;
  error?: {
    message?: string;
  };
}

interface StripePrice {
  id: string;
  currency?: string | null;
  recurring?: unknown | null;
}

interface StripePriceList {
  data?: StripePrice[];
  error?: {
    message?: string;
  };
}

const PACK_PRICE_ENV: Record<DiamondStorePackId, string> = {
  starter: "STRIPE_DIAMOND_STARTER_PRICE_ID",
  small: "STRIPE_DIAMOND_SMALL_PRICE_ID",
  medium: "STRIPE_DIAMOND_MEDIUM_PRICE_ID",
  large: "STRIPE_DIAMOND_LARGE_PRICE_ID"
};
const STRIPE_CURRENCY = "kzt";

function appUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

function stripeErrorMessage(payload: StripeCheckoutSession | StripePriceList): string {
  return payload.error?.message ?? "Запрос оплаты Stripe не удался";
}

function asMetadataValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function resolvePriceId(secretKey: string, configuredId: string, recurring: boolean): Promise<string> {
  if (configuredId.startsWith("price_")) return configuredId;

  if (!configuredId.startsWith("prod_")) {
    throw new Error("Идентификатор Stripe должен начинаться с price_ или prod_.");
  }

  const params = new URLSearchParams({
    product: configuredId,
    active: "true",
    limit: "10"
  });
  const response = await fetch(`https://api.stripe.com/v1/prices?${params}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`
    },
    cache: "no-store"
  });
  const payload = (await response.json()) as StripePriceList;

  if (!response.ok) {
    throw new Error(stripeErrorMessage(payload));
  }

  const prices = payload.data ?? [];
  const matchingPrices = prices.filter((item) => (recurring ? Boolean(item.recurring) : !item.recurring));
  const price = matchingPrices.find((item) => item.currency?.toLowerCase() === STRIPE_CURRENCY);
  if (!price) {
    throw new Error(`Для этого продукта не найдена активная ${recurring ? "регулярная" : "разовая"} цена Stripe в валюте ${STRIPE_CURRENCY.toUpperCase()}.`);
  }

  return price.id;
}

async function readCheckoutRequest(request: Request): Promise<CheckoutRequest> {
  if (!request.headers.get("content-type")?.includes("application/json")) return {};
  const payload = (await request.json().catch(() => ({}))) as CheckoutRequest;
  return payload && typeof payload === "object" ? payload : {};
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json({ error: "Stripe не настроен. Добавь STRIPE_SECRET_KEY в .env.local локально или в переменные окружения Vercel." }, { status: 503 });
  }

  const checkoutRequest = await readCheckoutRequest(request);
  const checkoutType = checkoutRequest.type ?? "subscription";

  if (checkoutType !== "sudoku_pass" && checkoutType !== "subscription" && checkoutType !== "diamond_pack") {
    return NextResponse.json({ error: "Неподдерживаемый тип оплаты." }, { status: 400 });
  }

  let checkoutPriceId: string;
  let checkoutMode: "payment" | "subscription";
  const metadata: Record<string, string> = {};
  const playerId = asMetadataValue(checkoutRequest.playerId);
  if (playerId) metadata.playerId = playerId;

  try {
    if (checkoutType === "diamond_pack") {
      const pack = getDiamondStorePack(checkoutRequest.packId);
      if (!pack) {
        return NextResponse.json({ error: "Неизвестный набор алмазов." }, { status: 400 });
      }

      const envName = PACK_PRICE_ENV[pack.id];
      const configuredPriceId = process.env[envName];

      if (!configuredPriceId) {
        return NextResponse.json({ error: `Набор алмазов не настроен в Stripe. Добавь ${envName} в .env.local локально или в переменные окружения Vercel.` }, { status: 503 });
      }

      checkoutPriceId = await resolvePriceId(secretKey, configuredPriceId, false);
      checkoutMode = "payment";
      metadata.purchase = "diamond_pack";
      metadata.packId = pack.id;
      metadata.diamonds = String(getDiamondStorePackTotalDiamonds(pack));
    } else {
      const season = getCurrentSudokuPassSeason();
      const configuredPriceId = process.env.STRIPE_SUDOKU_PASS_PRICE_ID ?? process.env.STRIPE_DIAMOND_PRICE_ID ?? process.env.STRIPE_PRICE_ID;

      if (!configuredPriceId) {
        return NextResponse.json(
          {
            error: "Судоку Пасс не настроен в Stripe. Добавь STRIPE_SUDOKU_PASS_PRICE_ID в .env.local локально или в переменные окружения Vercel."
          },
          { status: 503 }
        );
      }

      checkoutPriceId = await resolvePriceId(secretKey, configuredPriceId, true);
      checkoutMode = "subscription";
      metadata.purchase = "sudoku_pass";
      metadata.plan = "sudoku-pass";
      metadata.seasonId = season.id;
      metadata.seasonEndsAt = season.endsAt;
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось найти цену Stripe" }, { status: 400 });
  }

  const origin = appUrl(request);
  const body = new URLSearchParams({
    mode: checkoutMode,
    ui_mode: "hosted_page",
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/profile?checkout=cancelled`,
    allow_promotion_codes: "true",
    "line_items[0][price]": checkoutPriceId,
    "line_items[0][quantity]": "1"
  });
  if (playerId) body.set("client_reference_id", playerId);
  Object.entries(metadata).forEach(([key, value]) => {
    body.set(`metadata[${key}]`, value);
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });
  const payload = (await response.json()) as StripeCheckoutSession;

  if (!response.ok || !payload.url) {
    return NextResponse.json({ error: stripeErrorMessage(payload) }, { status: response.status || 500 });
  }

  return NextResponse.json({ id: payload.id, url: payload.url });
}
