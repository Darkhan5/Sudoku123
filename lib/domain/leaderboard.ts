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
  { id: "global", label: "Казахстан" }
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

export function penaltyTimeFor(time: number, mistakes: number, hintsUsed: number): number {
  return time + mistakes * 90 + hintsUsed * 45;
}

export function scoreFor(time: number, mistakes: number, hintsUsed: number): number {
  return Math.max(1000, 10_000 - penaltyTimeFor(time, mistakes, hintsUsed) * 4);
}

export function seedLeaderboardEntries(date: string): LeaderboardRecord[] {
  const entries = [
    { playerId: "seed:aliya", name: "Алия", city: "Астана", icon: "🧠", time: 386, mistakes: 0, hintsUsed: 1 },
    { playerId: "seed:nurlan", name: "Нурлан", city: "Алматы", icon: "⚡", time: 414, mistakes: 1, hintsUsed: 0 },
    { playerId: "seed:dana", name: "Дана", city: "Астана", icon: "💎", time: 462, mistakes: 1, hintsUsed: 1 },
    { playerId: "seed:timur", name: "Тимур", city: "Шымкент", icon: "🔥", time: 518, mistakes: 2, hintsUsed: 0 },
    { playerId: "seed:madina", name: "Мәдина", city: "Актобе", icon: "🌙", time: 575, mistakes: 1, hintsUsed: 2 },
    { playerId: "seed:arman", name: "Арман", city: "Караганда", icon: "✨", time: 628, mistakes: 3, hintsUsed: 1 },
    { playerId: "seed:saida", name: "Саида", city: "Астана", icon: "🎯", time: 690, mistakes: 2, hintsUsed: 2 },
    { playerId: "seed:yerlan", name: "Ерлан", city: "Павлодар", icon: "🏁", time: 744, mistakes: 4, hintsUsed: 1 }
  ];

  return entries.map((entry, index) => ({
    id: `${date}:${entry.playerId}`,
    playerId: entry.playerId,
    name: entry.name,
    city: entry.city,
    country: "Казахстан",
    countryCode: "KZ",
    avatarUrl: "",
    icon: entry.icon,
    date,
    time: entry.time,
    mistakes: entry.mistakes,
    hintsUsed: entry.hintsUsed,
    accuracy: accuracyFor(entry.mistakes, entry.hintsUsed),
    score: scoreFor(entry.time, entry.mistakes, entry.hintsUsed),
    createdAt: `${date}T08:${String(index).padStart(2, "0")}:00.000Z`
  }));
}

function compareLeaderboardEntries(a: LeaderboardRecord, b: LeaderboardRecord): number {
  return (
    penaltyTimeFor(a.time, a.mistakes, a.hintsUsed) - penaltyTimeFor(b.time, b.mistakes, b.hintsUsed) ||
    a.mistakes - b.mistakes ||
    a.hintsUsed - b.hintsUsed ||
    a.time - b.time ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

export function rankLeaderboard(entries: LeaderboardRecord[]): RankedLeaderboardRecord[] {
  return [...entries]
    .sort(compareLeaderboardEntries)
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
  return compareLeaderboardEntries(next, current) < 0;
}

export function upsertLeaderboardEntry(entries: LeaderboardRecord[], nextEntry: LeaderboardRecord): LeaderboardRecord[] {
  const index = entries.findIndex((entry) => entry.playerId === nextEntry.playerId && entry.date === nextEntry.date);
  if (index < 0) return [...entries, nextEntry];

  if (!isBetterEntry(nextEntry, entries[index])) return entries;

  const nextEntries = [...entries];
  nextEntries[index] = nextEntry;
  return nextEntries;
}
