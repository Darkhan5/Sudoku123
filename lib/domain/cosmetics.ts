import type { NumberStyle, ProfileBorder } from "../../types";

export interface NumberPack {
  id: NumberStyle;
  name: string;
  description: string;
  requiredDiamonds: number;
  rarity: "Common" | "Epic" | "Legendary";
}

export interface CosmeticOption<T extends string> {
  id: T;
  name: string;
  description: string;
  cost: number;
}

export const NUMBER_PACKS: NumberPack[] = [
  {
    id: "classic",
    name: "Классический пак",
    description: "Чистые соревновательные цифры для обычной игры.",
    requiredDiamonds: 5,
    rarity: "Common"
  },
  {
    id: "neon",
    name: "Неоновый пак",
    description: "Светящиеся цифры для напряжённых PvP-матчей.",
    requiredDiamonds: 10,
    rarity: "Epic"
  },
  {
    id: "pixel",
    name: "Пиксельный пак",
    description: "Аркадные цифры с чётким квадратным ритмом.",
    requiredDiamonds: 15,
    rarity: "Epic"
  },
  {
    id: "handwritten",
    name: "Рукописный пак",
    description: "Мягкий стиль для спокойного решения.",
    requiredDiamonds: 25,
    rarity: "Legendary"
  }
];

export const PROFILE_BORDERS: CosmeticOption<ProfileBorder>[] = [
  { id: "none", name: "Без рамки", description: "Статичный аватар без анимации.", cost: 0 }
];

export function getNumberPack(id: NumberStyle): NumberPack {
  return NUMBER_PACKS.find((pack) => pack.id === id) ?? NUMBER_PACKS[0];
}

export function isNumberPackUnlocked(owned: NumberStyle[] | undefined, id: NumberStyle): boolean {
  return (owned?.length ? owned : ["classic"]).includes(id);
}
