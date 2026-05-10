import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateProgressionReward, levelForXp, mergeAchievements, rankForLevel } from "../../lib/domain/progression";
import type { Player } from "../../types";

const player: Player = {
  id: "p1",
  name: "Darkhan",
  country: "Kazakhstan",
  countryCode: "KZ",
  city: "Astana",
  plan: "free",
  diamonds: 0,
  streak: 2,
  lastPlayedDate: "2026-05-09",
  playedDates: [],
  totalSolved: 0,
  avgTime: 0,
  accuracy: 100,
  icons: ["brain"],
  activeIcon: "brain",
  badges: []
};

describe("progression system", () => {
  it("converts XP into levels and Bronze/Silver/Gold ranks", () => {
    assert.equal(levelForXp(0), 1);
    assert.equal(rankForLevel(1), "bronze-i");
    assert.equal(rankForLevel(2), "bronze-ii");
    assert.equal(rankForLevel(4), "silver-i");
  });

  it("rewards clean fast Arena wins with extra XP and achievements", () => {
    const reward = calculateProgressionReward(
      {
        difficulty: "hard",
        time: 300,
        mistakes: 0,
        hintsUsed: 0,
        streak: 4,
        arenaWin: true
      },
      0
    );

    assert.ok(reward.xp >= 300);
    assert.deepEqual(mergeAchievements(player, reward, { difficulty: "hard", time: 300, mistakes: 0, hintsUsed: 0, streak: 4, arenaWin: true }), [
      "first-clear",
      "clean-grid",
      "streak-3",
      "arena-ready"
    ]);
  });
});
