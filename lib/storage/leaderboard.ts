import type { LeaderboardEntry, Player } from "@/types";
import { getIconById } from "@/lib/data/icons";
import { DEFAULT_COUNTRY, DEFAULT_COUNTRY_CODE } from "@/lib/domain/onboarding";

export type LeaderboardTab = "city" | "global";

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

export async function fetchLeaderboard(tab: LeaderboardTab, playerId?: string, city?: string, date?: string): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ tab });
  if (playerId) params.set("playerId", playerId);
  if (city) params.set("city", city);
  if (date) params.set("date", date);

  const response = await fetch(`/api/leaderboard?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Не удалось загрузить рейтинг.");
  }
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
      country: result.player.country || DEFAULT_COUNTRY,
      countryCode: result.player.countryCode ?? DEFAULT_COUNTRY_CODE,
      avatarUrl: result.player.avatarUrl ?? "",
      icon: getIconById(result.player.activeIcon).emoji,
      date: result.date,
      time: result.time,
      mistakes: result.mistakes,
      hintsUsed: result.hintsUsed
    })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Не удалось сохранить результат в рейтинг.");
  }
  const payload = (await response.json()) as { rank?: number | null };
  return payload.rank ?? null;
}
