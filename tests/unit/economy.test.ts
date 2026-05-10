import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DIAMOND_EARNING_RULES, DIAMOND_SPEND_OPTIONS, calculatePuzzleDiamondReward } from "../../lib/domain/economy";

describe("diamond economy", () => {
  it("explains every way to earn diamonds", () => {
    assert.deepEqual(
      DIAMOND_EARNING_RULES.map((rule) => rule.id),
      ["solve", "daily_login", "streak", "speed"]
    );
  });

  it("offers clear Sudoku-native spend options", () => {
    assert.deepEqual(
      DIAMOND_SPEND_OPTIONS.map((option) => option.id),
      ["ai_hint", "mistake_shield", "time_freeze", "ornament_pack"]
    );
    assert.ok(DIAMOND_SPEND_OPTIONS.every((option) => option.cost > 0));
  });

  it("rewards solving, streak retention, and speed without exceeding the daily cap", () => {
    const reward = calculatePuzzleDiamondReward({
      difficulty: "medium",
      time: 420,
      mistakes: 0,
      streak: 5,
      isNewStreakDay: true
    });

    assert.equal(reward.total, 4);
    assert.deepEqual(
      reward.reasons.map((reason) => reason.id),
      ["solve", "clean", "streak", "speed"]
    );
  });
});
