import type { NumberStyle } from "../../types";

export interface DailyLoginReward {
  cycleDay: number;
  type: "diamonds" | "chest";
  diamonds: number;
  cosmetic?: NumberStyle;
}

export interface DailyLoginRewardState {
  lastClaimedDate: string;
  streak: number;
  cycleDay: number;
  claimedDates: string[];
}

export interface DailyLoginClaim {
  state: DailyLoginRewardState;
  reward: DailyLoginReward;
  alreadyClaimed: boolean;
}

export const EMPTY_DAILY_LOGIN_REWARD_STATE: DailyLoginRewardState = {
  lastClaimedDate: "",
  streak: 0,
  cycleDay: 0,
  claimedDates: []
};

export const DAILY_LOGIN_REWARD_CYCLE: DailyLoginReward[] = [
  { cycleDay: 1, type: "diamonds", diamonds: 1 },
  { cycleDay: 2, type: "diamonds", diamonds: 2 },
  { cycleDay: 3, type: "diamonds", diamonds: 3 },
  { cycleDay: 4, type: "diamonds", diamonds: 4 },
  { cycleDay: 5, type: "diamonds", diamonds: 5 },
  { cycleDay: 6, type: "diamonds", diamonds: 6 },
  { cycleDay: 7, type: "chest", diamonds: 8 }
];

export const DAILY_LOGIN_CHEST_COSMETICS: NumberStyle[] = ["neon", "pixel", "handwritten"];

function dateToUtcDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return Math.floor(Date.UTC(year, month, day) / 86_400_000);
}

function daysBetween(previous: string, next: string): number | null {
  const previousDay = dateToUtcDay(previous);
  const nextDay = dateToUtcDay(next);
  if (previousDay === null || nextDay === null) return null;
  return nextDay - previousDay;
}

function normalizeState(state?: Partial<DailyLoginRewardState> | null): DailyLoginRewardState {
  return {
    lastClaimedDate: typeof state?.lastClaimedDate === "string" ? state.lastClaimedDate : "",
    streak: typeof state?.streak === "number" && Number.isFinite(state.streak) ? Math.max(0, Math.floor(state.streak)) : 0,
    cycleDay:
      typeof state?.cycleDay === "number" && Number.isFinite(state.cycleDay)
        ? Math.min(7, Math.max(0, Math.floor(state.cycleDay)))
        : 0,
    claimedDates: Array.from(new Set((state?.claimedDates ?? []).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))).sort()
  };
}

function pickChestCosmetic(date: string, streak: number): NumberStyle {
  const seed = `${date}:${streak}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DAILY_LOGIN_CHEST_COSMETICS[seed % DAILY_LOGIN_CHEST_COSMETICS.length];
}

export function getDailyLoginRewardForCycleDay(cycleDay: number, date = "", streak = 0): DailyLoginReward {
  const base = DAILY_LOGIN_REWARD_CYCLE[Math.max(0, Math.min(6, cycleDay - 1))] ?? DAILY_LOGIN_REWARD_CYCLE[0];
  return base.type === "chest" ? { ...base, cosmetic: pickChestCosmetic(date, streak) } : { ...base };
}

export function calculateDailyLoginClaim(
  currentState: Partial<DailyLoginRewardState> | null | undefined,
  date: string
): DailyLoginClaim {
  const state = normalizeState(currentState);
  if (state.lastClaimedDate === date) {
    return {
      state,
      reward: getDailyLoginRewardForCycleDay(Math.max(1, state.cycleDay), date, state.streak),
      alreadyClaimed: true
    };
  }

  const gap = daysBetween(state.lastClaimedDate, date);
  const continued = gap === 1;
  const streak = continued ? state.streak + 1 : 1;
  const cycleDay = continued ? (state.cycleDay % 7) + 1 : 1;
  const nextState: DailyLoginRewardState = {
    lastClaimedDate: date,
    streak,
    cycleDay,
    claimedDates: Array.from(new Set([...state.claimedDates, date])).sort()
  };

  return {
    state: nextState,
    reward: getDailyLoginRewardForCycleDay(cycleDay, date, streak),
    alreadyClaimed: false
  };
}
