import type { Difficulty, Player, RankedTier } from "../../types";

export interface ProgressionRewardInput {
  difficulty: Difficulty;
  time: number;
  mistakes: number;
  hintsUsed: number;
  streak: number;
  arenaWin?: boolean;
}

export interface ProgressionReward {
  xp: number;
  level: number;
  rank: RankedTier;
  unlockedAchievements: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
}

const DIFFICULTY_COMPLETION_XP: Record<Difficulty, number> = {
  easy: 30,
  medium: 60,
  hard: 120,
  expert: 170
};

export const RANK_TIERS: Array<{ id: RankedTier; label: string; minXp: number }> = [
  { id: "bronze-i", label: "Бронза I", minXp: 0 },
  { id: "bronze-ii", label: "Бронза II", minXp: 300 },
  { id: "silver-i", label: "Серебро I", minXp: 900 },
  { id: "silver-ii", label: "Серебро II", minXp: 1400 },
  { id: "gold-i", label: "Золото I", minXp: 2000 },
  { id: "gold-ii", label: "Золото II", minXp: 3200 }
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-clear", title: "Первое решение", description: "Завершить первое судоку." },
  { id: "clean-grid", title: "Чистая сетка", description: "Решить без ошибок." },
  { id: "streak-3", title: "Искра серии", description: "Поддержать серию 3 дня." },
  { id: "arena-ready", title: "Готов к арене", description: "Победить в матче арены." }
];

export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.max(0, xp) / 300) + 1);
}

export function xpForNextLevel(level: number): number {
  return Math.max(1, level) * 300;
}

export function rankForLevel(level: number): RankedTier {
  return rankForXp(Math.max(0, (level - 1) * 300));
}

export function rankForXp(xp: number): RankedTier {
  return [...RANK_TIERS].reverse().find((rank) => xp >= rank.minXp)?.id ?? "bronze-i";
}

export function rankLabel(rank: RankedTier): string {
  return RANK_TIERS.find((tier) => tier.id === rank)?.label ?? "Бронза I";
}

export function nextRankTier(xp: number): (typeof RANK_TIERS)[number] | null {
  return RANK_TIERS.find((tier) => tier.minXp > xp) ?? null;
}

export function xpUntilNextRank(xp: number): number {
  const next = nextRankTier(xp);
  return next ? Math.max(0, next.minXp - xp) : 0;
}

export function rankProgressPercent(xp: number): number {
  const current = [...RANK_TIERS].reverse().find((tier) => xp >= tier.minXp) ?? RANK_TIERS[0];
  const next = nextRankTier(xp);
  if (!next) return 100;
  return Math.min(100, Math.round(((xp - current.minXp) / Math.max(1, next.minXp - current.minXp)) * 100));
}

export function calculateProgressionReward(input: ProgressionRewardInput, currentXp = 0): ProgressionReward {
  const completionXp = DIFFICULTY_COMPLETION_XP[input.difficulty];
  const cleanBonus = input.mistakes === 0 ? (input.difficulty === "medium" ? 20 : 25) : 0;
  const noHintBonus = input.hintsUsed === 0 && ["hard", "expert"].includes(input.difficulty) ? 40 : 0;
  const speedBonus =
    input.difficulty === "easy" && input.time >= 300 && input.time <= 600
      ? 10
      : input.difficulty === "easy" && input.time > 600 && input.time <= 1200
        ? 0
        : input.difficulty === "medium" && input.time >= 600 && input.time <= 1200
          ? 0
          : input.time > 0 && input.time < 420
            ? 20
            : 0;
  const hintPenalty = Math.min(35, input.hintsUsed * 8);
  const streakBonus = Math.min(70, Math.max(0, input.streak - 1) * 10);
  const arenaBonus = input.arenaWin ? 150 : 0;
  const xp = Math.max(20, completionXp + cleanBonus + noHintBonus + speedBonus + streakBonus + arenaBonus - hintPenalty);
  const totalXp = currentXp + xp;
  const level = levelForXp(currentXp + xp);

  return {
    xp,
    level,
    rank: rankForXp(totalXp),
    unlockedAchievements: []
  };
}

export function mergeAchievements(player: Player, reward: ProgressionReward, input: ProgressionRewardInput): string[] {
  const existing = new Set([...(player.achievements ?? []), ...reward.unlockedAchievements]);
  if ((player.totalSolved ?? 0) + 1 >= 1) existing.add("first-clear");
  if (input.mistakes === 0) existing.add("clean-grid");
  if (input.streak >= 3) existing.add("streak-3");
  if (input.arenaWin) existing.add("arena-ready");
  return Array.from(existing);
}
