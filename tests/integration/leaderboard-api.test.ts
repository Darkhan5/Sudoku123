import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createLeaderboardHandlers, type LeaderboardStore } from "../../lib/server/leaderboardHandlers";

function createMemoryStore(): LeaderboardStore {
  let entries: Awaited<ReturnType<LeaderboardStore["read"]>> = [];
  return {
    async read() {
      return entries;
    },
    async write(nextEntries) {
      entries = nextEntries;
    }
  };
}

describe("leaderboard API integration", () => {
  it("writes a result and returns the user's global rank with avatar and flag data", async () => {
    const handlers = createLeaderboardHandlers({
      store: createMemoryStore(),
      now: () => new Date("2026-05-09T10:00:00.000Z")
    });

    const post = await handlers.POST(
      new Request("http://localhost/api/leaderboard", {
        method: "POST",
        body: JSON.stringify({
          playerId: "user-1",
          name: "Ayan",
          country: "Казахстан",
          countryCode: "KZ",
          city: "Астана",
          avatarUrl: "https://example.com/avatar.png",
          date: "2026-05-09",
          time: 300,
          mistakes: 0,
          hintsUsed: 0
        })
      })
    );

    assert.equal(post.status, 200);
    assert.equal((await post.json()).rank, 1);

    const get = await handlers.GET(new Request("http://localhost/api/leaderboard?tab=global&playerId=user-1"));
    const payload = await get.json();

    assert.equal(get.status, 200);
    assert.equal(payload.currentRank, 1);
    assert.equal(payload.entries[0].avatarUrl, "https://example.com/avatar.png");
    assert.equal(payload.entries[0].countryFlag, "🇰🇿");
  });

  it("returns city leaderboard entries for the requested city", async () => {
    const handlers = createLeaderboardHandlers({
      store: createMemoryStore(),
      now: () => new Date("2026-05-09T10:00:00.000Z")
    });

    await handlers.POST(
      new Request("http://localhost/api/leaderboard", {
        method: "POST",
        body: JSON.stringify({
          playerId: "user-1",
          name: "Ayan",
          country: "Всемирный",
          countryCode: "UN",
          city: "Астана",
          date: "2026-05-09",
          time: 300,
          mistakes: 0,
          hintsUsed: 0
        })
      })
    );

    const response = await handlers.GET(new Request("http://localhost/api/leaderboard?tab=city&city=%D0%90%D1%81%D1%82%D0%B0%D0%BD%D0%B0"));
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.entries.length, 1);
  });
});
