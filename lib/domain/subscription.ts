import type { Plan, ThemeName } from "../../types";
import { getPremiumExperiencePacks } from "./experiencePacks";

export interface SubscriptionPlan {
  id: Extract<Plan, "sudoku-pass">;
  name: "Sudoku Pass";
  priceMonthly: "2 500 tg/month";
  features: string[];
}

export interface ThemeCatalogItem {
  id: Exclude<ThemeName, "standard">;
  name: string;
  description: string;
  subscription: Extract<Plan, "sudoku-pass">;
}

export const FREE_COACH_LIMIT = 3;

export const SUDOKU_PASS_PLAN: SubscriptionPlan = {
  id: "sudoku-pass",
  name: "Sudoku Pass",
  priceMonthly: "2 500 tg/month",
  features: [
    "30-day season progression",
    "Premium reward track",
    "Unlimited AI hints during the active season",
    "Cyber Grid and Library Ink Experience Packs",
    "Premium ornaments, titles, and PvP effects"
  ]
};

export const DIAMOND_PLAN = SUDOKU_PASS_PLAN;

export function isSudokuPassSubscriber(value: { plan?: Plan | null }): boolean {
  return value.plan === "sudoku-pass" || value.plan === "diamond";
}

export function isDiamondSubscriber(value: { plan?: Plan | null }): boolean {
  return isSudokuPassSubscriber(value);
}

export function getCoachLimit(plan: Plan): number {
  return isSudokuPassSubscriber({ plan }) ? Number.POSITIVE_INFINITY : FREE_COACH_LIMIT;
}

export function canUseCoach(plan: Plan, usedToday: number): boolean {
  return isSudokuPassSubscriber({ plan }) || usedToday < FREE_COACH_LIMIT;
}

export function getThemeCatalog(): ThemeCatalogItem[] {
  return getPremiumExperiencePacks().map((pack) => ({
    id: pack.id as Exclude<ThemeName, "standard">,
    name: pack.name,
    description: pack.description,
    subscription: "sudoku-pass"
  }));
}

export function canUseTheme(plan: Plan, theme: ThemeName): boolean {
  if (theme === "standard") return true;
  return isSudokuPassSubscriber({ plan }) && getPremiumExperiencePacks().some((item) => item.id === theme);
}
