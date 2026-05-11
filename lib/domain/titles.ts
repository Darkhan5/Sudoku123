export const FIRST_DAILY_TITLES = [
  "First Solver",
  "Grid Explorer",
  "Number Seeker",
  "Puzzle Rookie",
  "Logic Starter",
  "Cell Master",
  "Mind Runner",
  "Sudoku Wanderer",
  "Pattern Hunter",
  "Bright Mind"
] as const;

export type FirstDailyTitle = (typeof FIRST_DAILY_TITLES)[number];

export interface FirstDailyTitleInput {
  time: number;
  mistakes: number;
  hintsUsed: number;
  notesCount: number;
}

export function chooseFirstDailyTitle({ time, mistakes, hintsUsed, notesCount }: FirstDailyTitleInput): FirstDailyTitle {
  if (time <= 420 && mistakes <= 2) return "Mind Runner";
  if (notesCount >= 24) return "Pattern Hunter";
  if (mistakes === 0 && hintsUsed === 0 && time >= 900) return "Cell Master";
  if (mistakes === 0 && hintsUsed <= 1) return "Bright Mind";
  if (notesCount >= 10 && mistakes <= 2 && hintsUsed <= 1) return "Number Seeker";
  if (mistakes >= 5 || hintsUsed >= 4) return "Puzzle Rookie";
  if (hintsUsed >= 2 && mistakes <= 2) return "Grid Explorer";
  if (time >= 1200) return "Sudoku Wanderer";
  if (mistakes <= 2) return "Logic Starter";
  return "First Solver";
}
