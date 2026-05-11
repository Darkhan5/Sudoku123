export const FIRST_DAILY_TITLES = [
  "Первый решатель",
  "Исследователь сетки",
  "Искатель чисел",
  "Новичок головоломок",
  "Старт логики",
  "Мастер клеток",
  "Быстрый ум",
  "Странник судоку",
  "Охотник за узорами",
  "Светлый ум"
] as const;

export type FirstDailyTitle = (typeof FIRST_DAILY_TITLES)[number];

export interface FirstDailyTitleInput {
  time: number;
  mistakes: number;
  hintsUsed: number;
  notesCount: number;
}

export function chooseFirstDailyTitle({ time, mistakes, hintsUsed, notesCount }: FirstDailyTitleInput): FirstDailyTitle {
  if (time <= 420 && mistakes <= 2) return "Быстрый ум";
  if (notesCount >= 24) return "Охотник за узорами";
  if (mistakes === 0 && hintsUsed === 0 && time >= 900) return "Мастер клеток";
  if (mistakes === 0 && hintsUsed <= 1) return "Светлый ум";
  if (notesCount >= 10 && mistakes <= 2 && hintsUsed <= 1) return "Искатель чисел";
  if (mistakes >= 5 || hintsUsed >= 4) return "Новичок головоломок";
  if (hintsUsed >= 2 && mistakes <= 2) return "Исследователь сетки";
  if (time >= 1200) return "Странник судоку";
  if (mistakes <= 2) return "Старт логики";
  return "Первый решатель";
}
