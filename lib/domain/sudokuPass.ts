import type { Difficulty, NumberStyle, ThemeName } from "../../types";

export const SUDOKU_PASS_DURATION_DAYS = 30;
export const SUDOKU_PASS_LEVELS = 30;
export const SUDOKU_PASS_XP_PER_LEVEL = 125;

const FIRST_SEASON_START_UTC = Date.UTC(2026, 4, 11, 0, 0, 0, 0);
const DAY_MS = 86_400_000;
const SEASON_MS = SUDOKU_PASS_DURATION_DAYS * DAY_MS;

export type PassTaskCadence = "daily" | "seasonal";
export type PassTaskId =
  | "daily-solve-puzzle"
  | "daily-solve-daily"
  | "daily-no-mistakes"
  | "season-solve-50"
  | "season-win-10-pvp"
  | "season-seven-day-streak"
  | "season-solve-expert";

export type PassRewardKind =
  | "diamonds"
  | "number_style"
  | "xp_boost"
  | "theme"
  | "board_style"
  | "animated_cosmetic"
  | "kazakh_ornament"
  | "pvp_effect"
  | "title";

export interface SudokuPassSeason {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  levelCount: number;
}

export interface PassTaskDefinition {
  id: PassTaskId;
  cadence: PassTaskCadence;
  title: string;
  description: string;
  goal: number;
  xp: number;
}

export interface PassReward {
  id: string;
  level: number;
  track: "free" | "premium";
  kind: PassRewardKind;
  title: string;
  diamonds?: number;
  numberStyle?: NumberStyle;
  theme?: ThemeName;
  boostHours?: number;
}

export interface PassLevelDefinition {
  level: number;
  xpRequired: number;
  free: PassReward[];
  premium: PassReward[];
}

export interface PassProgressSnapshot {
  xp: number;
  level: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpToNextLevel: number;
  completionPercent: number;
}

export const PASS_TASKS: PassTaskDefinition[] = [
  {
    id: "daily-solve-puzzle",
    cadence: "daily",
    title: "Реши любую головоломку",
    description: "Одна завершенная партия за сегодня.",
    goal: 1,
    xp: 35
  },
  {
    id: "daily-solve-daily",
    cadence: "daily",
    title: "Закрой задачу дня",
    description: "Пройди ежедневное судоку.",
    goal: 1,
    xp: 45
  },
  {
    id: "daily-no-mistakes",
    cadence: "daily",
    title: "Победа без ошибок",
    description: "Заверши партию чисто.",
    goal: 1,
    xp: 65
  },
  {
    id: "season-solve-50",
    cadence: "seasonal",
    title: "50 партий за сезон",
    description: "Длинная цель для стабильной игры.",
    goal: 50,
    xp: 260
  },
  {
    id: "season-win-10-pvp",
    cadence: "seasonal",
    title: "10 побед на арене",
    description: "Побеждай соперников в PvP.",
    goal: 10,
    xp: 240
  },
  {
    id: "season-seven-day-streak",
    cadence: "seasonal",
    title: "Серия 7 дней",
    description: "Заходи в игру каждый день.",
    goal: 7,
    xp: 220
  },
  {
    id: "season-solve-expert",
    cadence: "seasonal",
    title: "Экспертная победа",
    description: "Реши судоку сложности Эксперт.",
    goal: 1,
    xp: 180
  }
];

function isoDate(date: Date): string {
  return date.toISOString();
}

function rewardId(track: "free" | "premium", level: number, suffix: string): string {
  return `${track}-${level}-${suffix}`;
}

function freeReward(level: number): PassReward[] {
  if (level === 5) {
    return [{ id: rewardId("free", level, "neon"), level, track: "free", kind: "number_style", title: "Неоновые цифры", numberStyle: "neon" }];
  }
  if (level === 12) {
    return [{ id: rewardId("free", level, "pixel"), level, track: "free", kind: "number_style", title: "Пиксельные цифры", numberStyle: "pixel" }];
  }
  if ([8, 18, 26].includes(level)) {
    return [{ id: rewardId("free", level, "xp-boost"), level, track: "free", kind: "xp_boost", title: "Буст XP на 2 часа", boostHours: 2 }];
  }
  if (level % 3 === 0 || level === 1) {
    return [
      {
        id: rewardId("free", level, "diamonds"),
        level,
        track: "free",
        kind: "diamonds",
        title: `${Math.ceil(level / 3) + 1} алмаза`,
        diamonds: Math.ceil(level / 3) + 1
      }
    ];
  }
  return [];
}

function premiumReward(level: number): PassReward[] {
  const rewards: PassReward[] = [];
  if (level === 1) rewards.push({ id: rewardId("premium", level, "cyber-grid"), level, track: "premium", kind: "theme", title: "Тема «Кибер-сетка»", theme: "cyber-grid" });
  if (level === 3) rewards.push({ id: rewardId("premium", level, "midnight-circuit"), level, track: "premium", kind: "board_style", title: "Поле «Полночная схема»" });
  if (level === 5) rewards.push({ id: rewardId("premium", level, "cell-scan"), level, track: "premium", kind: "animated_cosmetic", title: "Анимация сканирования" });
  if (level === 7) rewards.push({ id: rewardId("premium", level, "library-ink"), level, track: "premium", kind: "theme", title: "Тема «Библиотечные чернила»", theme: "library-ink" });
  if (level === 10) rewards.push({ id: rewardId("premium", level, "title-grid-nomad"), level, track: "premium", kind: "title", title: "Титул: Кочевник сетки" });
  if (level === 14) rewards.push({ id: rewardId("premium", level, "tumar-line"), level, track: "premium", kind: "kazakh_ornament", title: "Орнамент «Тумар»" });
  if (level === 18) rewards.push({ id: rewardId("premium", level, "signal-jam"), level, track: "premium", kind: "pvp_effect", title: "Эффект PvP «Сбой сигнала»" });
  if (level === 24) rewards.push({ id: rewardId("premium", level, "handwritten"), level, track: "premium", kind: "number_style", title: "Рукописные цифры", numberStyle: "handwritten" });
  if (level === 30) rewards.push({ id: rewardId("premium", level, "season-solver"), level, track: "premium", kind: "title", title: "Титул: Герой сезона" });
  if (level % 4 === 0) {
    rewards.push({
      id: rewardId("premium", level, "diamonds"),
      level,
      track: "premium",
      kind: "diamonds",
      title: `${level + 4} алмазов`,
      diamonds: level + 4
    });
  }
  return rewards;
}

export const SUDOKU_PASS_REWARD_LEVELS: PassLevelDefinition[] = Array.from({ length: SUDOKU_PASS_LEVELS }, (_, index) => {
  const level = index + 1;
  return {
    level,
    xpRequired: index * SUDOKU_PASS_XP_PER_LEVEL,
    free: freeReward(level),
    premium: premiumReward(level)
  };
});

export function getCurrentSudokuPassSeason(now = new Date()): SudokuPassSeason {
  const seasonIndex = Math.max(0, Math.floor((now.getTime() - FIRST_SEASON_START_UTC) / SEASON_MS));
  const startsAt = new Date(FIRST_SEASON_START_UTC + seasonIndex * SEASON_MS);
  const endsAt = new Date(startsAt.getTime() + SEASON_MS);
  return {
    id: `season-${seasonIndex + 1}`,
    name: `Сезон ${seasonIndex + 1}`,
    startsAt: isoDate(startsAt),
    endsAt: isoDate(endsAt),
    levelCount: SUDOKU_PASS_LEVELS
  };
}

export function daysUntilSeasonEnds(season: SudokuPassSeason, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(season.endsAt).getTime() - now.getTime()) / DAY_MS));
}

export function getPassProgressSnapshot(xp: number): PassProgressSnapshot {
  const safeXp = Math.max(0, Math.floor(xp));
  const maxXp = (SUDOKU_PASS_LEVELS - 1) * SUDOKU_PASS_XP_PER_LEVEL;
  const cappedXp = Math.min(safeXp, maxXp);
  const level = Math.min(SUDOKU_PASS_LEVELS, Math.floor(cappedXp / SUDOKU_PASS_XP_PER_LEVEL) + 1);
  const nextLevelXp = level >= SUDOKU_PASS_LEVELS ? null : level * SUDOKU_PASS_XP_PER_LEVEL;
  const currentLevelXp = (level - 1) * SUDOKU_PASS_XP_PER_LEVEL;
  const xpIntoLevel = cappedXp - currentLevelXp;
  const xpToNextLevel = nextLevelXp === null ? 0 : nextLevelXp - cappedXp;

  return {
    xp: safeXp,
    level,
    nextLevelXp,
    xpIntoLevel,
    xpToNextLevel,
    completionPercent: Math.round((cappedXp / maxXp) * 100)
  };
}

export function isPassLevelUnlocked(xp: number, level: number): boolean {
  const definition = SUDOKU_PASS_REWARD_LEVELS[level - 1];
  return Boolean(definition && xp >= definition.xpRequired);
}

export function getUnlockedPassRewards(xp: number, premiumActive: boolean): PassReward[] {
  return SUDOKU_PASS_REWARD_LEVELS.flatMap((level) => [
    ...(isPassLevelUnlocked(xp, level.level) ? level.free : []),
    ...(premiumActive && isPassLevelUnlocked(xp, level.level) ? level.premium : [])
  ]);
}

export function getThemeReward(theme: ThemeName): PassReward | undefined {
  return SUDOKU_PASS_REWARD_LEVELS.flatMap((level) => level.premium).find((reward) => reward.kind === "theme" && reward.theme === theme);
}

export function taskForPuzzleSolved(params: { mode: "daily" | "free" | "arena"; difficulty: Difficulty; mistakes: number; arenaWin?: boolean }): PassTaskId[] {
  const ids: PassTaskId[] = ["daily-solve-puzzle", "season-solve-50"];
  if (params.mode === "daily") ids.push("daily-solve-daily");
  if (params.mistakes === 0) ids.push("daily-no-mistakes");
  if (params.difficulty === "expert") ids.push("season-solve-expert");
  if (params.arenaWin) ids.push("season-win-10-pvp");
  return ids;
}
