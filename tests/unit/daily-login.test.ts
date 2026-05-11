import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDailyLoginClaim } from "../../lib/domain/dailyLogin";

describe("daily login rewards", () => {
  it("starts a seven-day cycle with one diamond", () => {
    const claim = calculateDailyLoginClaim(null, "2026-05-11");

    assert.equal(claim.alreadyClaimed, false);
    assert.equal(claim.state.streak, 1);
    assert.equal(claim.reward.cycleDay, 1);
    assert.equal(claim.reward.diamonds, 1);
  });

  it("continues through six diamond rewards and a chest on day seven", () => {
    let state = calculateDailyLoginClaim(null, "2026-05-11").state;
    for (const day of ["2026-05-12", "2026-05-13", "2026-05-14", "2026-05-15", "2026-05-16"]) {
      const claim = calculateDailyLoginClaim(state, day);
      state = claim.state;
      assert.equal(claim.reward.diamonds, claim.reward.cycleDay);
    }

    const chest = calculateDailyLoginClaim(state, "2026-05-17");
    assert.equal(chest.reward.type, "chest");
    assert.equal(chest.reward.diamonds, 8);
    assert.ok(chest.reward.cosmetic);
  });

  it("does not grant the same date twice", () => {
    const first = calculateDailyLoginClaim(null, "2026-05-11");
    const second = calculateDailyLoginClaim(first.state, "2026-05-11");

    assert.equal(second.alreadyClaimed, true);
    assert.deepEqual(second.state, first.state);
  });
});
