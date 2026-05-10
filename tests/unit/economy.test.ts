import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIAMOND_EARNING_RULES,
  DIAMOND_STORE_PACKS,
  calculatePuzzleDiamondReward,
  getDiamondStorePack,
  getDiamondStorePackTotalDiamonds,
  insufficientDiamondsMessage
} from "../../lib/domain/economy";

describe("diamond economy", () => {
  it("uses Diamonds as the only currency reward", () => {
    assert.deepEqual(
      DIAMOND_EARNING_RULES.map((rule) => rule.id),
      ["solve", "daily", "streak", "clean", "achievement"]
    );
    assert.ok(DIAMOND_EARNING_RULES.every((rule) => rule.description.includes("💎")));
  });

  it("offers real Diamond Store pack pricing", () => {
    assert.deepEqual(
      DIAMOND_STORE_PACKS.map((pack) => [pack.name, pack.diamonds, pack.price]),
      [
        ["Стартовый набор", 50, "500 тг"],
        ["Малый набор", 120, "1 500 тг"],
        ["Средний набор", 300, "3 000 тг"],
        ["Большой набор", 700, "6 000 тг"]
      ]
    );
    assert.equal(DIAMOND_STORE_PACKS.at(-1)?.label, "Выгодно");
  });

  it("finds configured Stripe packs and includes bonuses in grants", () => {
    const pack = getDiamondStorePack("large");

    assert.equal(pack?.id, "large");
    assert.equal(pack ? getDiamondStorePackTotalDiamonds(pack) : 0, 810);
    assert.equal(getDiamondStorePack("unknown"), undefined);
  });

  it("rewards solving, daily play, streaks, clean play, and achievements", () => {
    const reward = calculatePuzzleDiamondReward({
      difficulty: "hard",
      time: 420,
      mistakes: 0,
      streak: 5,
      isNewStreakDay: true,
      achievementUnlocked: true
    });

    assert.ok(reward.total >= 5);
    assert.deepEqual(
      reward.reasons.map((reason) => reason.id),
      ["solve", "daily", "streak", "clean", "achievement"]
    );
  });

  it("formats blocked diamond purchase details", () => {
    assert.equal(insufficientDiamondsMessage(25, 12), "Недостаточно алмазов\nНужно: 25 💎\nУ вас: 12 💎");
  });
});
