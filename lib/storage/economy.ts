import { getPlayer, updatePlayer } from "./player";
import {
  EMPTY_DAILY_LOGIN_REWARD_STATE,
  calculateDailyLoginClaim,
  type DailyLoginClaim,
  type DailyLoginRewardState
} from "@/lib/domain/dailyLogin";
import { normalizePlayedDates } from "@/lib/domain/streak";
import { safeJsonParse, todayIso } from "@/lib/utils/date";

interface EconomyDay {
  earned: number;
  loginClaimed?: boolean;
}

const LOGIN_REWARD_KEY = "sl_daily_login_rewards";

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

function emitLoginRewardUpdate(claim: DailyLoginClaim): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sl:login-reward", { detail: claim }));
  }
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
  return Boolean(claimDailyLoginReward(date)?.reward.diamonds);
}

export function getDailyLoginRewardState(): DailyLoginRewardState {
  if (!hasStorage()) return EMPTY_DAILY_LOGIN_REWARD_STATE;
  return safeJsonParse<DailyLoginRewardState>(localStorage.getItem(LOGIN_REWARD_KEY), EMPTY_DAILY_LOGIN_REWARD_STATE);
}

export function saveDailyLoginRewardState(state: DailyLoginRewardState): DailyLoginRewardState {
  if (hasStorage()) {
    localStorage.setItem(LOGIN_REWARD_KEY, JSON.stringify(state));
  }
  return state;
}

export function claimDailyLoginReward(date = todayIso()): DailyLoginClaim | null {
  const player = getPlayer();
  if (!player) return null;

  const claim = calculateDailyLoginClaim(getDailyLoginRewardState(), date);
  if (claim.alreadyClaimed) return null;

  saveDailyLoginRewardState(claim.state);

  const ownedNumberPacks = player.ownedNumberPacks ?? ["classic"];
  const nextOwnedNumberPacks =
    claim.reward.type === "chest" && claim.reward.cosmetic
      ? Array.from(new Set([...ownedNumberPacks, claim.reward.cosmetic]))
      : ownedNumberPacks;

  updatePlayer({
    diamonds: player.diamonds + claim.reward.diamonds,
    streak: claim.state.streak,
    lastPlayedDate: claim.state.lastClaimedDate,
    playedDates: normalizePlayedDates([...(player.playedDates ?? []), claim.state.lastClaimedDate]),
    ownedNumberPacks: nextOwnedNumberPacks
  });
  emitLoginRewardUpdate(claim);
  return claim;
}

export function spendDiamonds(amount: number): boolean {
  const player = getPlayer();
  if (!player || amount <= 0 || player.diamonds < amount) return false;
  updatePlayer({ diamonds: player.diamonds - amount });
  return true;
}
