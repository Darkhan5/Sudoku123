export type LeaderboardScope = "kazakhstan" | "global";

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
  { id: "kazakhstan", label: "Казахстан" },
  { id: "global", label: "Общий" }
];

export function isLeaderboardScope(value: string | null): value is LeaderboardScope {
  return value === "kazakhstan" || value === "global";
}

export function countryFlag(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(127397 + code.charCodeAt(0), 127397 + code.charCodeAt(1));
}

export function accuracyFor(mistakes: number, hintsUsed: number): number {
  return Math.max(0, Math.min(100, 100 - mistakes * 12 - hintsUsed * 4));
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

export function filterLeaderboard(entries: LeaderboardRecord[], scope: LeaderboardScope): LeaderboardRecord[] {
  if (scope === "kazakhstan") {
    return entries.filter((entry) => {
      const country = entry.country.toLowerCase();
      return entry.countryCode.toUpperCase() === "KZ" || country === "kazakhstan" || country === "казахстан";
    });
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
