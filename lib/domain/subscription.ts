import type { Plan, ThemeName } from "../../types";

export interface SubscriptionPlan {
  id: Extract<Plan, "diamond">;
  name: "Алмазная подписка";
  priceMonthly: "2 500 тг/месяц";
  features: string[];
}

export interface ThemeCatalogItem {
  id: Exclude<ThemeName, "standard">;
  name: string;
  description: string;
  subscription: Extract<Plan, "diamond">;
}

export const FREE_COACH_LIMIT = 3;

export const DIAMOND_PLAN: SubscriptionPlan = {
  id: "diamond",
  name: "Алмазная подписка",
  priceMonthly: "2 500 тг/месяц",
  features: ["Эксклюзивные паки цифр", "Особые орнаменты", "Косметика профиля", "Дополнительные PvP-эффекты", "Будущие сезонные награды"]
};

const DIAMOND_THEMES: ThemeCatalogItem[] = [
  {
    id: "diamond-white",
    name: "Белая доска",
    description: "Светлая доска с чистым контрастом.",
    subscription: "diamond"
  },
  {
    id: "diamond-black",
    name: "Чёрная доска",
    description: "Тёмная доска с ярким читаемым текстом.",
    subscription: "diamond"
  },
  {
    id: "diamond-felt",
    name: "Войлочная доска",
    description: "Тёплая палитра войлока и кожи для режима Өрнек.",
    subscription: "diamond"
  }
];

export function isDiamondSubscriber(value: { plan?: Plan | null }): boolean {
  return value.plan === "diamond";
}

export function getCoachLimit(plan: Plan): number {
  return plan === "diamond" ? Number.POSITIVE_INFINITY : FREE_COACH_LIMIT;
}

export function canUseCoach(plan: Plan, usedToday: number): boolean {
  return plan === "diamond" || usedToday < FREE_COACH_LIMIT;
}

export function getThemeCatalog(): ThemeCatalogItem[] {
  return DIAMOND_THEMES;
}

export function canUseTheme(plan: Plan, theme: ThemeName): boolean {
  if (theme === "standard") return true;
  return plan === "diamond" && DIAMOND_THEMES.some((item) => item.id === theme);
}
