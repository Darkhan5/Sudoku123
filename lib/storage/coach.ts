import type { Plan } from "@/types";
import { todayIso } from "@/lib/utils/date";
import { canUseCoach as canUseCoachForPlan, getCoachLimit as getCoachLimitForPlan } from "@/lib/domain/subscription";

function keyFor(date = todayIso()): string {
  return `sl_coach_${date}`;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getCoachUsage(date = todayIso()): number {
  if (!hasStorage()) return 0;
  return Number.parseInt(localStorage.getItem(keyFor(date)) ?? "0", 10) || 0;
}

export function canUseCoach(plan: Plan): boolean {
  return canUseCoachForPlan(plan, getCoachUsage());
}

export function getRemainingUses(plan: Plan): number {
  const limit = getCoachLimit(plan);
  return Number.isFinite(limit) ? Math.max(0, limit - getCoachUsage()) : Number.POSITIVE_INFINITY;
}

export function getCoachLimit(plan: Plan): number {
  return getCoachLimitForPlan(plan);
}

export function incrementCoachUsage(): number {
  if (!hasStorage()) return 0;
  const next = getCoachUsage() + 1;
  localStorage.setItem(keyFor(), String(next));
  window.dispatchEvent(new Event("sl:coach"));
  return next;
}
