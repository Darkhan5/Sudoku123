import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
  fulfillCheckoutSession,
  type StripeCustomerRecord,
  type StripeCustomerStore
} from "../../lib/server/stripeFulfillment";
import { constructStripeWebhookEvent } from "../../lib/server/stripeWebhook";

function createMemoryStore(seed: StripeCustomerRecord[] = []): StripeCustomerStore & { records: StripeCustomerRecord[] } {
  return {
    records: seed,
    async read() {
      return this.records;
    },
    async write(records) {
      this.records = records;
    }
  };
}

function stripeSignature(payload: string, secret: string, timestamp: number): string {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("Stripe fulfillment", () => {
  it("credits a paid diamond pack once by customer email", async () => {
    const store = createMemoryStore();
    const session = {
      id: "cs_test_pack",
      mode: "payment",
      status: "complete",
      payment_status: "paid",
      customer_details: { email: " Player@Example.COM " },
      metadata: {
        purchase: "diamond_pack",
        packId: "small",
        playerId: "player-1"
      }
    };

    const first = await fulfillCheckoutSession(session, store, () => new Date("2026-05-10T10:00:00.000Z"));
    const second = await fulfillCheckoutSession(session, store, () => new Date("2026-05-10T10:01:00.000Z"));

    assert.equal(first.fulfilled, true);
    assert.equal(first.alreadyProcessed, false);
    assert.equal(first.diamonds, 130);
    assert.equal(second.alreadyProcessed, true);
    assert.equal(store.records.length, 1);
    assert.equal(store.records[0].email, "player@example.com");
    assert.equal(store.records[0].diamonds, 130);
    assert.deepEqual(store.records[0].playerIds, ["player-1"]);
    assert.deepEqual(store.records[0].processedSessionIds, ["cs_test_pack"]);
  });

  it("activates Diamond subscription by customer email", async () => {
    const store = createMemoryStore();
    const result = await fulfillCheckoutSession(
      {
        id: "cs_test_subscription",
        mode: "subscription",
        status: "complete",
        customer_details: { email: "diamond@example.com" },
        metadata: {
          plan: "diamond",
          playerId: "player-2"
        }
      },
      store
    );

    assert.equal(result.fulfilled, true);
    assert.equal(result.plan, "diamond");
    assert.equal(store.records[0].plan, "diamond");
    assert.deepEqual(store.records[0].playerIds, ["player-2"]);
  });

  it("verifies Stripe webhook signatures before parsing events", () => {
    const secret = "whsec_test";
    const timestamp = 1_777_777_777;
    const payload = JSON.stringify({
      id: "evt_test",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test" } }
    });

    const event = constructStripeWebhookEvent(payload, stripeSignature(payload, secret, timestamp), secret, 300, timestamp);

    assert.equal(event.type, "checkout.session.completed");
    assert.throws(() => constructStripeWebhookEvent(payload, stripeSignature(payload, "wrong", timestamp), secret, 300, timestamp));
  });
});
