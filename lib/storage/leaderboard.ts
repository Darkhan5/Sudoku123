import type { LeaderboardEntry, Player } from "@/types";
import { getIconById } from "@/lib/data/icons";

export type LeaderboardTab = "kazakhstan" | "global";

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentRank: number | null;
  total: number;
  date: string;
}

export interface SubmitLeaderboardResult {
  player: Player;
  date: string;
  time: number;
  mistakes: number;
  hintsUsed: number;
}

export async function fetchLeaderboard(tab: LeaderboardTab, playerId?: string): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ tab });
  if (playerId) params.set("playerId", playerId);

  const response = await fetch(`/api/leaderboard?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Не удалось загрузить рейтинг.");
  return (await response.json()) as LeaderboardResponse;
}

export async function submitLeaderboardResult(result: SubmitLeaderboardResult): Promise<number | null> {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId: result.player.id,
      name: result.player.name,
      city: result.player.city,
      country: result.player.country,
      countryCode: result.player.countryCode ?? "KZ",
      avatarUrl: result.player.avatarUrl ?? "",
      icon: getIconById(result.player.activeIcon).emoji,
      date: result.date,
      time: result.time,
      mistakes: result.mistakes,
      hintsUsed: result.hintsUsed
    })
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { rank?: number | null };
  return payload.rank ?? null;
}
