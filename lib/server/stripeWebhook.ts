import { createHmac, timingSafeEqual } from "crypto";

export interface StripeWebhookEvent<T = unknown> {
  id?: string;
  type?: string;
  data?: {
    object?: T;
  };
}

function parseStripeSignatureHeader(header: string): { timestamp: number | null; signatures: string[] } {
  const initial: { timestamp: number | null; signatures: string[] } = { timestamp: null, signatures: [] };
  return header.split(",").reduce(
    (parsed, part) => {
      const [key, value] = part.split("=", 2);
      if (key === "t") parsed.timestamp = Number(value);
      if (key === "v1" && value) parsed.signatures.push(value);
      return parsed;
    },
    initial
  );
}

function signatureMatches(expectedHex: string, candidateHex: string): boolean {
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const candidate = Buffer.from(candidateHex, "hex");
    return expected.length === candidate.length && timingSafeEqual(expected, candidate);
  } catch {
    return false;
  }
}

export function constructStripeWebhookEvent<T = unknown>(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300,
  nowSeconds = Math.floor(Date.now() / 1000)
): StripeWebhookEvent<T> {
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header.");
  if (!secret) throw new Error("Missing Stripe webhook signing secret.");

  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || !Number.isFinite(timestamp)) throw new Error("Invalid Stripe webhook timestamp.");
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) throw new Error("Stripe webhook timestamp is outside tolerance.");

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  if (!signatures.some((signature) => signatureMatches(expectedSignature, signature))) {
    throw new Error("Stripe webhook signature verification failed.");
  }

  return JSON.parse(payload) as StripeWebhookEvent<T>;
}
