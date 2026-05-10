import { getPlayer, updatePlayer } from "./player";
import { safeJsonParse, todayIso } from "@/lib/utils/date";

interface EconomyDay {
  earned: number;
  loginClaimed?: boolean;
}

function keyFor(date: string): string {
  return `sl_economy_${date}`;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getDay(date = todayIso()): EconomyDay {
  if (!hasStorage()) return { earned: 0 };
  return safeJsonParse<EconomyDay>(localStorage.getItem(keyFor(date)), { earned: 0 });
}

function saveDay(day: EconomyDay, date = todayIso()): void {
  if (!hasStorage()) return;
  localStorage.setItem(keyFor(date), JSON.stringify(day));
}

export function getDiamonds(): number {
  return getPlayer()?.diamonds ?? 0;
}

export function canEarnMore(date = todayIso(), limit = 5): boolean {
  return getDay(date).earned < limit;
}

export function addDiamonds(amount: number, date = todayIso()): number {
  const player = getPlayer();
  if (!player || amount <= 0) return getDiamonds();

  const day = getDay(date);
  const available = Math.max(0, 5 - day.earned);
  const earned = Math.min(amount, available);
  if (earned <= 0) return player.diamonds;

  saveDay({ ...day, earned: day.earned + earned }, date);
  return updatePlayer({ diamonds: player.diamonds + earned }).diamonds;
}

export function claimDailyLoginDiamonds(date = todayIso()): boolean {
  const player = getPlayer();
  if (!player) return false;

  const day = getDay(date);
  if (day.loginClaimed) return false;

  const available = Math.max(0, 5 - day.earned);
  const earned = available > 0 ? 1 : 0;
  saveDay({ ...day, earned: day.earned + earned, loginClaimed: true }, date);
  if (earned > 0) updatePlayer({ diamonds: player.diamonds + earned });
  return earned > 0;
}

export function spendDiamonds(amount: number): boolean {
  const player = getPlayer();
  if (!player || amount <= 0 || player.diamonds < amount) return false;
  updatePlayer({ diamonds: player.diamonds - amount });
  return true;
}
