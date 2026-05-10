export type LeaderboardScope = "city" | "global";

export interface LeaderboardScopeOption {
  id: LeaderboardScope;
  label: string;
}

export interface LeaderboardRecord {
  id: string;
  playerId: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  avatarUrl: string;
  icon?: string;
  date: string;
  time: number;
  mistakes: number;
  hintsUsed: number;
  accuracy: number;
  score: number;
  createdAt: string;
}

export interface RankedLeaderboardRecord extends LeaderboardRecord {
  rank: number;
  countryFlag: string;
  isCurrentUser?: boolean;
}

export const LEADERBOARD_SCOPES: LeaderboardScopeOption[] = [
  { id: "city", label: "Город" },
  { id: "global", label: "Всемирный" }
];

export function isLeaderboardScope(value: string | null): value is LeaderboardScope {
  return value === "city" || value === "global";
}

export function countryFlag(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(127397 + code.charCodeAt(0), 127397 + code.charCodeAt(1));
}

export function accuracyFor(mistakes: number, hintsUsed: number): number {
  const solvedCells = 81;
  const cleanCells = solvedCells - mistakes - hintsUsed * 2;
  return Math.max(0, Math.min(100, Math.round((cleanCells / solvedCells) * 100)));
}

export function scoreFor(time: number, mistakes: number, hintsUsed: number): number {
  const accuracy = accuracyFor(mistakes, hintsUsed);
  return Math.max(100, Math.round(accuracy * 12 - time - mistakes * 90 - hintsUsed * 45));
}

export function rankLeaderboard(entries: LeaderboardRecord[]): RankedLeaderboardRecord[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || a.time - b.time || a.createdAt.localeCompare(b.createdAt))
    .map((entry, index) => ({
      ...entry,
      icon: entry.icon ?? "🧠",
      countryFlag: countryFlag(entry.countryCode),
      rank: index + 1
    }));
}

export function filterLeaderboard(entries: LeaderboardRecord[], scope: LeaderboardScope, city = ""): LeaderboardRecord[] {
  if (scope === "city") {
    const normalizedCity = city.trim().toLowerCase();
    if (!normalizedCity) return [];
    return entries.filter((entry) => entry.city.trim().toLowerCase() === normalizedCity);
  }

  return entries;
}

function isBetterEntry(next: LeaderboardRecord, current: LeaderboardRecord): boolean {
  return (
    next.score > current.score ||
    (next.score === current.score && next.accuracy > current.accuracy) ||
    (next.score === current.score && next.accuracy === current.accuracy && next.time < current.time)
  );
}

export function upsertLeaderboardEntry(entries: LeaderboardRecord[], nextEntry: LeaderboardRecord): LeaderboardRecord[] {
  const index = entries.findIndex((entry) => entry.playerId === nextEntry.playerId && entry.date === nextEntry.date);
  if (index < 0) return [...entries, nextEntry];

  if (!isBetterEntry(nextEntry, entries[index])) return entries;

  const nextEntries = [...entries];
  nextEntries[index] = nextEntry;
  return nextEntries;
}
