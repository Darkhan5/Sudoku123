import type { DailyState } from "@/types";
import { safeJsonParse, todayIso } from "@/lib/utils/date";

function keyFor(date: string): string {
  return `sl_daily_${date}`;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getDailyState(date = todayIso()): DailyState | null {
  if (!hasStorage()) return null;
  return safeJsonParse<DailyState | null>(localStorage.getItem(keyFor(date)), null);
}

export function saveDailyState(state: DailyState): DailyState {
  if (!hasStorage()) return state;
  localStorage.setItem(keyFor(state.date), JSON.stringify(state));
  return state;
}

export function isCompletedToday(): boolean {
  return Boolean(getDailyState(todayIso())?.completed);
}
