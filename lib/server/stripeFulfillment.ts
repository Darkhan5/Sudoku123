import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { getDiamondStorePack, getDiamondStorePackTotalDiamonds, type DiamondStorePackId } from "../domain/economy";
import type { Plan } from "../../types";

export interface StripeCheckoutSessionForFulfillment {
  id?: string;
  mode?: string | null;
  status?: string | null;
  payment_status?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
  metadata?: {
    purchase?: string;
    packId?: string;
    plan?: string;
    playerId?: string;
  } | null;
}

export interface StripeCustomerRecord {
  email: string;
  playerIds: string[];
  diamonds: number;
  plan: Plan;
  processedSessionIds: string[];
  purchases: Array<{
    sessionId: string;
    type: "diamond_pack" | "subscription";
    packId?: DiamondStorePackId;
    diamonds?: number;
    createdAt: string;
  }>;
  updatedAt: string;
}

export interface StripeCustomerStore {
  read(): Promise<StripeCustomerRecord[]>;
  write(records: StripeCustomerRecord[]): Promise<void>;
}

export interface FulfillmentResult {
  fulfilled: boolean;
  alreadyProcessed: boolean;
  email?: string;
  playerId?: string;
  plan?: Extract<Plan, "diamond">;
  packId?: DiamondStorePackId;
  diamonds?: number;
  databasePlan?: Plan;
  reason?: string;
}

const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), "sudoku-league") : path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "stripe-customers.json");

function normalizeEmail(value?: string | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function asPlayerId(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function createFileStripeCustomerStore(filePath = DATA_FILE): StripeCustomerStore {
  return {
    async read() {
      try {
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw) as StripeCustomerRecord[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    async write(records) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
    }
  };
}

export async function findStripeCustomerByEmail(email: string, store: StripeCustomerStore = createFileStripeCustomerStore()): Promise<StripeCustomerRecord | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const records = await store.read();
  return records.find((record) => normalizeEmail(record.email) === normalizedEmail) ?? null;
}

export async function fulfillCheckoutSession(
  session: StripeCheckoutSessionForFulfillment,
  store: StripeCustomerStore = createFileStripeCustomerStore(),
  now: () => Date = () => new Date()
): Promise<FulfillmentResult> {
  const sessionId = session.id;
  if (!sessionId) return { fulfilled: false, alreadyProcessed: false, reason: "Missing Stripe session id." };
  if (session.status && session.status !== "complete") return { fulfilled: false, alreadyProcessed: false, reason: "Stripe session is not complete." };
  if (session.mode === "payment" && session.payment_status && session.payment_status !== "paid") {
    return { fulfilled: false, alreadyProcessed: false, reason: "Stripe payment is not paid." };
  }

  const metadata = session.metadata ?? {};
  const email = normalizeEmail(session.customer_details?.email ?? session.customer_email);
  if (!email) return { fulfilled: false, alreadyProcessed: false, reason: "Stripe session has no customer email." };

  const playerId = asPlayerId(metadata.playerId);
  const records = await store.read();
  const existingIndex = records.findIndex((record) => normalizeEmail(record.email) === email);
  const existing = existingIndex >= 0 ? records[existingIndex] : undefined;
  const createdAt = now().toISOString();
  const record: StripeCustomerRecord = existing ?? {
    email,
    playerIds: [],
    diamonds: 0,
    plan: "free",
    processedSessionIds: [],
    purchases: [],
    updatedAt: createdAt
  };

  record.playerIds = unique([...record.playerIds, playerId]);

  if (record.processedSessionIds.includes(sessionId)) {
    return {
      fulfilled: true,
      alreadyProcessed: true,
      email,
      playerId,
      databasePlan: record.plan
    };
  }

  let result: FulfillmentResult;
  if (metadata.purchase === "diamond_pack") {
    const pack = getDiamondStorePack(metadata.packId);
    if (!pack) return { fulfilled: false, alreadyProcessed: false, email, playerId, reason: "Unknown Diamond Store pack." };

    const diamonds = getDiamondStorePackTotalDiamonds(pack);
    record.diamonds += diamonds;
    record.processedSessionIds.push(sessionId);
    record.purchases.push({ sessionId, type: "diamond_pack", packId: pack.id, diamonds, createdAt });
    record.updatedAt = createdAt;
    result = {
      fulfilled: true,
      alreadyProcessed: false,
      email,
      playerId,
      packId: pack.id,
      diamonds,
      databasePlan: record.plan
    };
  } else if (metadata.plan === "diamond") {
    record.plan = "diamond";
    record.processedSessionIds.push(sessionId);
    record.purchases.push({ sessionId, type: "subscription", createdAt });
    record.updatedAt = createdAt;
    result = {
      fulfilled: true,
      alreadyProcessed: false,
      email,
      playerId,
      plan: "diamond",
      databasePlan: record.plan
    };
  } else {
    return { fulfilled: false, alreadyProcessed: false, email, playerId, reason: "Unsupported Stripe checkout metadata." };
  }

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  await store.write(records);

  return result;
}
