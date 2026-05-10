import type { Difficulty } from "../../types";

export interface DiamondRule {
  id: "solve" | "daily_login" | "streak" | "speed" | "clean";
  title: string;
  description: string;
  amount: number;
}

export interface DiamondSpendOption {
  id: "ai_hint" | "mistake_shield" | "time_freeze" | "ornament_pack";
  title: string;
  description: string;
  cost: number;
}

export interface PuzzleRewardInput {
  difficulty: Difficulty;
  time: number;
  mistakes: number;
  streak: number;
  isNewStreakDay: boolean;
}

export interface PuzzleReward {
  total: number;
  reasons: DiamondRule[];
}

export const DIAMOND_EARNING_RULES: DiamondRule[] = [
  {
    id: "solve",
    title: "Решить головоломку",
    description: "+1 за каждую завершённую партию.",
    amount: 1
  },
  {
    id: "daily_login",
    title: "Ежедневный вход",
    description: "+1 за первый вход в приложение за день.",
    amount: 1
  },
  {
    id: "streak",
    title: "Поддержать стрик",
    description: "+1 за новый день в серии после решения головоломки.",
    amount: 1
  },
  {
    id: "speed",
    title: "Решить на время",
    description: "+1 за быстрое решение в рамках сложности.",
    amount: 1
  }
];

export const DIAMOND_SPEND_OPTIONS: DiamondSpendOption[] = [
  {
    id: "ai_hint",
    title: "ИИ-подсказка",
    description: "Дополнительная подсказка, когда бесплатный лимит закончился.",
    cost: 3
  },
  {
    id: "mistake_shield",
    title: "Защита ошибки",
    description: "Один раз предупреждает перед неверным ходом.",
    cost: 5
  },
  {
    id: "time_freeze",
    title: "Пауза таймера",
    description: "Замораживает таймер на короткую проверку доски.",
    cost: 8
  },
  {
    id: "ornament_pack",
    title: "Сезонный пак",
    description: "Открывает временный визуальный набор для режима Өрнек.",
    cost: 12
  }
];

const SPEED_TARGET_SECONDS: Record<Difficulty, number> = {
  easy: 300,
  medium: 480,
  hard: 720,
  expert: 960
};

const CLEAN_RULE: DiamondRule = {
  id: "clean",
  title: "Без ошибок",
  description: "+1 за аккуратное решение без ошибок.",
  amount: 1
};

export function calculatePuzzleDiamondReward(input: PuzzleRewardInput): PuzzleReward {
  const reasons: DiamondRule[] = [DIAMOND_EARNING_RULES[0]];

  if (input.mistakes === 0) reasons.push(CLEAN_RULE);
  if (input.isNewStreakDay && input.streak > 1) reasons.push(DIAMOND_EARNING_RULES[2]);
  if (input.time > 0 && input.time <= SPEED_TARGET_SECONDS[input.difficulty]) reasons.push(DIAMOND_EARNING_RULES[3]);

  return {
    total: reasons.reduce((sum, reason) => sum + reason.amount, 0),
    reasons
  };
}
