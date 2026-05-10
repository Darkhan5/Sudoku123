import type { Player } from "@/types";
import { normalizePlayedDates } from "@/lib/domain/streak";
import { safeJsonParse, todayIso, yesterdayIso } from "@/lib/utils/date";
import { getCountryCode, normalizeCountryName, type OnboardingProfile } from "@/lib/domain/onboarding";

const PLAYER_KEY = "sl_player";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitPlayerUpdate(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sl:player"));
  }
}

export function getPlayer(): Player | null {
  if (!hasStorage()) return null;
  const player = safeJsonParse<Player | null>(localStorage.getItem(PLAYER_KEY), null);
  if (!player) return null;
  const country = normalizeCountryName(player.country);
  return {
    ...player,
    country,
    countryCode: getCountryCode(country) ?? player.countryCode
  };
}

export function savePlayer(player: Player): Player {
  if (!hasStorage()) return player;
  const country = normalizeCountryName(player.country);
  const normalized = {
    ...player,
    country,
    countryCode: getCountryCode(country) ?? player.countryCode
  };
  localStorage.setItem(PLAYER_KEY, JSON.stringify(normalized));
  emitPlayerUpdate();
  return normalized;
}

export function initPlayer(name = "Игрок", city = "Астана"): Player {
  const existing = getPlayer();
  if (existing) return existing;

  return savePlayer({
    id: crypto.randomUUID(),
    name,
    country: "Казахстан",
    countryCode: "KZ",
    city,
    onboarded: false,
    plan: "free",
    diamonds: 0,
    streak: 0,
    lastPlayedDate: "",
    playedDates: [],
    totalSolved: 0,
    avgTime: 0,
    accuracy: 100,
    icons: ["brain"],
    activeIcon: "brain",
    badges: []
  });
}

export function isPlayerOnboarded(player: Player | null): player is Player {
  return Boolean(player?.onboarded && player.name.trim() && player.country.trim() && player.city.trim() && player.age);
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
      icons: ["brain"],
      activeIcon: "brain",
      badges: []
    }),
    name: profile.name,
    age: profile.age,
    country: profile.country,
    countryCode: getCountryCode(profile.country) ?? "KZ",
    city: profile.city,
    onboarded: true
  };
}

export function updatePlayer(partial: Partial<Player>): Player {
  const current = getPlayer() ?? initPlayer();
  return savePlayer({ ...current, ...partial });
}

export function recordSolvedGame(params: { time: number; mistakes: number; hintsUsed: number; date?: string }): Player {
  const player = getPlayer() ?? initPlayer();
  const date = params.date ?? todayIso();
  const solved = player.totalSolved + 1;
  const avgTime = Math.round((player.avgTime * player.totalSolved + params.time) / solved);
  const gameAccuracy = Math.max(0, 100 - params.mistakes * 12 - params.hintsUsed * 4);
  const accuracy = Math.round((player.accuracy * player.totalSolved + gameAccuracy) / solved);

  let streak = 1;
  if (player.lastPlayedDate === date) {
    streak = player.streak || 1;
  } else if (player.lastPlayedDate === yesterdayIso(new Date(`${date}T12:00:00.000Z`))) {
    streak = player.streak + 1;
  }

  return savePlayer({
    ...player,
    streak,
    lastPlayedDate: date,
    playedDates: normalizePlayedDates([...(player.playedDates ?? []), date]),
    totalSolved: solved,
    avgTime,
    accuracy
  });
}
