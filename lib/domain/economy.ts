import type { Difficulty } from "../../types";

export interface DiamondRewardRule {
  id: "solve" | "daily" | "streak" | "clean" | "achievement";
  title: string;
  description: string;
  amount: number;
}

export interface PuzzleRewardInput {
  difficulty: Difficulty;
  time: number;
  mistakes: number;
  streak: number;
  isNewStreakDay: boolean;
  achievementUnlocked?: boolean;
}

export interface CurrencyReward {
  total: number;
  reasons: DiamondRewardRule[];
}

export interface DiamondStorePack {
  id: "starter" | "small" | "medium" | "large";
  name: string;
  diamonds: number;
  bonus: number;
  price: string;
  label?: string;
}

export type DiamondStorePackId = DiamondStorePack["id"];

export const DIAMOND_EARNING_RULES: DiamondRewardRule[] = [
  {
    id: "solve",
    title: "Партия решена",
    description: "+1 💎 за честно завершённое судоку.",
    amount: 1
  },
  {
    id: "daily",
    title: "Задача дня",
    description: "+1 💎 за новый игровой день.",
    amount: 1
  },
  {
    id: "streak",
    title: "Серия",
    description: "+1 💎 за поддержание серии.",
    amount: 1
  },
  {
    id: "clean",
    title: "Чистое решение",
    description: "+1 💎 за партию без ошибок.",
    amount: 1
  },
  {
    id: "achievement",
    title: "Достижение",
    description: "+1 💎 за новое достижение.",
    amount: 1
  }
];

export const DIAMOND_STORE_PACKS: DiamondStorePack[] = [
  { id: "starter", name: "Стартовый набор", diamonds: 50, bonus: 0, price: "500 тг" },
  { id: "small", name: "Малый набор", diamonds: 120, bonus: 10, price: "1 500 тг" },
  { id: "medium", name: "Средний набор", diamonds: 300, bonus: 35, price: "3 000 тг" },
  { id: "large", name: "Большой набор", diamonds: 700, bonus: 110, price: "6 000 тг", label: "Выгодно" }
];

export function getDiamondStorePack(packId?: string | null): DiamondStorePack | undefined {
  return DIAMOND_STORE_PACKS.find((pack) => pack.id === packId);
}

export function getDiamondStorePackTotalDiamonds(pack: Pick<DiamondStorePack, "diamonds" | "bonus">): number {
  return pack.diamonds + pack.bonus;
}

const DIFFICULTY_BONUS: Record<Difficulty, number> = {
  easy: 0,
  medium: 0,
  hard: 1,
  expert: 2
};

export function calculatePuzzleDiamondReward(input: PuzzleRewardInput): CurrencyReward {
  const reasons: DiamondRewardRule[] = [
    { ...DIAMOND_EARNING_RULES[0], amount: DIAMOND_EARNING_RULES[0].amount + DIFFICULTY_BONUS[input.difficulty] }
  ];

  if (input.isNewStreakDay) reasons.push(DIAMOND_EARNING_RULES[1]);
  if (input.streak > 1) reasons.push(DIAMOND_EARNING_RULES[2]);
  if (input.mistakes === 0) reasons.push(DIAMOND_EARNING_RULES[3]);
  if (input.achievementUnlocked) reasons.push(DIAMOND_EARNING_RULES[4]);

  return {
    total: reasons.reduce((sum, reason) => sum + reason.amount, 0),
    reasons
  };
}

export function insufficientDiamondsMessage(required: number, current: number): string {
  return `Недостаточно алмазов\nНужно: ${required} 💎\nУ вас: ${current} 💎`;
}
