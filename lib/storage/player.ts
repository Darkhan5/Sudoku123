import type { Difficulty, NumberStyle, Player } from "@/types";
import { calculateProgressionReward, mergeAchievements, rankForXp } from "@/lib/domain/progression";
import { normalizePlayedDates } from "@/lib/domain/streak";
import { safeJsonParse, todayIso, yesterdayIso } from "@/lib/utils/date";
import { DEFAULT_CITY, DEFAULT_COUNTRY, DEFAULT_COUNTRY_CODE, getCountryCode, normalizeCountryName, normalizeKazakhstanCityName, type OnboardingProfile } from "@/lib/domain/onboarding";
import { accuracyFor } from "@/lib/domain/leaderboard";

const PLAYER_KEY = "sl_player";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitPlayerUpdate(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sl:player"));
  }
}

function normalizeRank(rank: Player["rank"] | "bronze" | "silver" | "gold" | undefined, xp: number): Player["rank"] {
  if (rank === "bronze") return "bronze-i";
  if (rank === "silver") return "silver-i";
  if (rank === "gold") return "gold-i";
  return rank ?? rankForXp(xp);
}

function withPlayerDefaults(player: Player): Player {
  const playerWithoutLegacyCurrency = { ...player } as Player & Record<string, unknown>;
  delete playerWithoutLegacyCurrency["bu" + "cks"];
  const xp = player.xp ?? 0;
  const level = player.level ?? 1;
  const ownedNumberPacks: NumberStyle[] = player.ownedNumberPacks?.length ? player.ownedNumberPacks : ["classic"];
  const legacyManualTitle = player.title && ["Puzzle Slayer", "Logic Master", "Grid Hacker", "AI Disciple"].includes(player.title);
  const firstTitleClaimed = player.firstTitleClaimed ?? Boolean(player.title && !legacyManualTitle);
  return {
    ...playerWithoutLegacyCurrency,
    xp,
    level,
    rank: normalizeRank(player.rank, xp),
    title: firstTitleClaimed ? player.title : undefined,
    firstTitleClaimed,
    ownedNumberPacks,
    numberStyle: player.numberStyle ?? "classic",
    achievements: player.achievements ?? [],
    seasonBadges: player.seasonBadges ?? []
  };
}

export function getPlayer(): Player | null {
  if (!hasStorage()) return null;
  const player = safeJsonParse<Player | null>(localStorage.getItem(PLAYER_KEY), null);
  if (!player) return null;
  const country = normalizeCountryName(player.country || DEFAULT_COUNTRY);
  return withPlayerDefaults({
    ...player,
    city: normalizeKazakhstanCityName(player.city) ?? DEFAULT_CITY,
    country,
    countryCode: getCountryCode(country) ?? player.countryCode ?? DEFAULT_COUNTRY_CODE
  });
}

export function savePlayer(player: Player): Player {
  if (!hasStorage()) return player;
  const country = normalizeCountryName(player.country || DEFAULT_COUNTRY);
  const normalized = withPlayerDefaults({
    ...player,
    city: normalizeKazakhstanCityName(player.city) ?? DEFAULT_CITY,
    country,
    countryCode: getCountryCode(country) ?? player.countryCode ?? DEFAULT_COUNTRY_CODE
  });
  localStorage.setItem(PLAYER_KEY, JSON.stringify(normalized));
  emitPlayerUpdate();
  return normalized;
}

export function initPlayer(name = "Игрок", city = DEFAULT_CITY): Player {
  const existing = getPlayer();
  if (existing) return existing;

  return savePlayer({
    id: crypto.randomUUID(),
    name,
    country: DEFAULT_COUNTRY,
    countryCode: DEFAULT_COUNTRY_CODE,
    city: normalizeKazakhstanCityName(city) ?? DEFAULT_CITY,
    onboarded: false,
    plan: "free",
    diamonds: 0,
    streak: 0,
    lastPlayedDate: "",
    playedDates: [],
    totalSolved: 0,
    avgTime: 0,
    accuracy: 100,
    xp: 0,
    level: 1,
    rank: "bronze-i",
    firstTitleClaimed: false,
    ownedNumberPacks: ["classic"],
    numberStyle: "classic",
    achievements: [],
    seasonBadges: [],
    icons: ["brain"],
    activeIcon: "brain",
    badges: []
  });
}

export function isPlayerOnboarded(player: Player | null): player is Player {
  return Boolean(player?.onboarded && player.name.trim() && player.city.trim() && player.age);
}

export function createOnboardedPlayer(profile: OnboardingProfile, current: Player | null = getPlayer()): Player {
  return {
    ...(current ?? {
      id: crypto.randomUUID(),
      plan: "free" as const,
      diamonds: 0,
      streak: 0,
      lastPlayedDate: "",
      playedDates: [],
      totalSolved: 0,
      avgTime: 0,
      accuracy: 100,
      xp: 0,
      level: 1,
      rank: "bronze-i" as const,
      firstTitleClaimed: false,
      ownedNumberPacks: ["classic" as const],
      numberStyle: "classic" as const,
      achievements: [],
      seasonBadges: [],
      icons: ["brain"],
      activeIcon: "brain",
      badges: []
    }),
    name: profile.name,
    age: profile.age,
    country: profile.country || DEFAULT_COUNTRY,
    countryCode: getCountryCode(profile.country) ?? DEFAULT_COUNTRY_CODE,
    city: normalizeKazakhstanCityName(profile.city) ?? DEFAULT_CITY,
    onboarded: true
  };
}

export function updatePlayer(partial: Partial<Player>): Player {
  const current = getPlayer() ?? initPlayer();
  return savePlayer({ ...current, ...partial });
}

export function recordSolvedGame(params: { time: number; mistakes: number; hintsUsed: number; date?: string; difficulty?: Difficulty; arenaWin?: boolean }): Player {
  const player = getPlayer() ?? initPlayer();
  const date = params.date ?? todayIso();
  const solved = player.totalSolved + 1;
  const avgTime = Math.round((player.avgTime * player.totalSolved + params.time) / solved);
  const gameAccuracy = accuracyFor(params.mistakes, params.hintsUsed);
  const accuracy = Math.round((player.accuracy * player.totalSolved + gameAccuracy) / solved);

  let streak = 1;
  if (player.lastPlayedDate === date) {
    streak = player.streak || 1;
  } else if (player.lastPlayedDate === yesterdayIso(new Date(`${date}T12:00:00.000Z`))) {
    streak = player.streak + 1;
  }
  const progression = calculateProgressionReward(
    {
      difficulty: params.difficulty ?? "medium",
      time: params.time,
      mistakes: params.mistakes,
      hintsUsed: params.hintsUsed,
      streak,
      arenaWin: params.arenaWin
    },
    player.xp ?? 0
  );
  const achievements = mergeAchievements(player, progression, {
    difficulty: params.difficulty ?? "medium",
    time: params.time,
    mistakes: params.mistakes,
    hintsUsed: params.hintsUsed,
    streak,
    arenaWin: params.arenaWin
  });

  return savePlayer({
    ...player,
    streak,
    lastPlayedDate: date,
    playedDates: normalizePlayedDates([...(player.playedDates ?? []), date]),
    totalSolved: solved,
    avgTime,
    accuracy,
    xp: (player.xp ?? 0) + progression.xp,
    level: progression.level,
    rank: progression.rank,
    achievements
  });
}
