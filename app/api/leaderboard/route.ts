import { createLeaderboardHandlers, createLeaderboardStoreFromEnv } from "@/lib/server/leaderboardHandlers";

export const dynamic = "force-dynamic";

const handlers = createLeaderboardHandlers({
  store: createLeaderboardStoreFromEnv(),
  includeSeedEntries: true
});

export const GET = handlers.GET;
export const POST = handlers.POST;
