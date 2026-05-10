import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEADERBOARD_SCOPES,
  filterLeaderboard,
  rankLeaderboard,
  upsertLeaderboardEntry
} from "../../lib/domain/leaderboard";

const baseEntry = {
  id: "entry-1",
  playerId: "user-1",
  name: "Ayan",
  city: "Астана",
  country: "Казахстан",
  countryCode: "KZ",
  avatarUrl: "https://example.com/a.png",
  date: "2026-05-09",
  time: 320,
  mistakes: 0,
  hintsUsed: 1,
  accuracy: 96,
  score: 900,
  createdAt: "2026-05-09T00:00:00.000Z"
};

describe("global leaderboard logic", () => {
  it("supports only city and global scopes", () => {
    assert.deepEqual(
      LEADERBOARD_SCOPES.map((scope) => scope.id),
      ["city", "global"]
    );
  });

  it("ranks globally by score, accuracy, and time", () => {
    const ranked = rankLeaderboard([
      { ...baseEntry, playerId: "slow", score: 900, accuracy: 96, time: 420 },
      { ...baseEntry, playerId: "winner", score: 950, accuracy: 91, time: 500 },
      { ...baseEntry, playerId: "fast", score: 900, accuracy: 96, time: 300 }
    ]);

    assert.deepEqual(
      ranked.map((entry) => [entry.playerId, entry.rank]),
      [
        ["winner", 1],
        ["fast", 2],
        ["slow", 3]
      ]
    );
  });

  it("filters the player's city without using countries", () => {
    const entries = [
      baseEntry,
      { ...baseEntry, playerId: "user-2", city: "Алматы", country: "Канада", countryCode: "CA" }
    ];

    assert.equal(filterLeaderboard(entries, "global").length, 2);
    assert.deepEqual(
      filterLeaderboard(entries, "city", "Астана").map((entry) => entry.playerId),
      ["user-1"]
    );
  });

  it("keeps the better daily result for the same player", () => {
    const initial = [{ ...baseEntry, score: 800, time: 400 }];
    const updated = upsertLeaderboardEntry(initial, { ...baseEntry, score: 850, time: 380 });
    const rejected = upsertLeaderboardEntry(updated, { ...baseEntry, score: 700, time: 200 });

    assert.equal(updated[0].score, 850);
    assert.equal(rejected[0].score, 850);
  });
});
