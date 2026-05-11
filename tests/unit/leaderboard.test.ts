import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LEADERBOARD_SCOPES,
  filterLeaderboard,
  rankLeaderboard,
  scoreFor,
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
  score: scoreFor(320, 0, 1),
  createdAt: "2026-05-09T00:00:00.000Z"
};

function leaderboardEntry(overrides: Partial<typeof baseEntry>) {
  const entry = { ...baseEntry, ...overrides };
  return {
    ...entry,
    score: overrides.score ?? scoreFor(entry.time, entry.mistakes, entry.hintsUsed)
  };
}

describe("global leaderboard logic", () => {
  it("supports only city and global scopes", () => {
    assert.deepEqual(
      LEADERBOARD_SCOPES.map((scope) => scope.id),
      ["city", "global"]
    );
    assert.deepEqual(
      LEADERBOARD_SCOPES.map((scope) => scope.label),
      ["Город", "Казахстан"]
    );
  });

  it("ranks globally by penalty-adjusted time", () => {
    const ranked = rankLeaderboard([
      leaderboardEntry({ playerId: "clean-slow", time: 420, mistakes: 0, hintsUsed: 0 }),
      leaderboardEntry({ playerId: "fast-with-mistake", time: 300, mistakes: 1, hintsUsed: 0 }),
      leaderboardEntry({ playerId: "fast-clean", time: 320, mistakes: 0, hintsUsed: 0 })
    ]);

    assert.deepEqual(
      ranked.map((entry) => [entry.playerId, entry.rank]),
      [
        ["fast-clean", 1],
        ["fast-with-mistake", 2],
        ["clean-slow", 3]
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
    const initial = [leaderboardEntry({ score: 800, time: 400, mistakes: 0, hintsUsed: 0 })];
    const updated = upsertLeaderboardEntry(initial, leaderboardEntry({ score: 850, time: 380, mistakes: 0, hintsUsed: 0 }));
    const rejected = upsertLeaderboardEntry(updated, leaderboardEntry({ score: 700, time: 200, mistakes: 3, hintsUsed: 0 }));

    assert.equal(updated[0].time, 380);
    assert.equal(rejected[0].time, 380);
  });
});
