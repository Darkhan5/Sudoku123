export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type Plan = "free" | "diamond";
export type Rarity = "common" | "rare" | "epic";
export type ThemeName = "standard" | "diamond-white" | "diamond-black" | "diamond-felt";

export interface CellPosition {
  row: number;
  col: number;
}

export interface Player {
  id: string;
  name: string;
  age?: number;
  country: string;
  countryCode?: string;
  city: string;
  avatarUrl?: string;
  onboarded?: boolean;
  plan: Plan;
  diamonds: number;
  streak: number;
  lastPlayedDate: string;
  playedDates?: string[];
  totalSolved: number;
  avgTime: number;
  accuracy: number;
  icons: string[];
  activeIcon: string;
  badges: string[];
}

export interface DailyState {
  date: string;
  completed: boolean;
  time: number;
  mistakes: number;
  hintsUsed: number;
  score: number;
  board?: number[][];
  solution?: number[][];
  given?: boolean[][];
  notes?: number[][][];
  difficulty?: Difficulty;
}

export interface GameState {
  board: number[][];
  solution: number[][];
  given: boolean[][];
  notes: Set<number>[][];
  selected: CellPosition | null;
  mistakes: number;
  hintsUsed: number;
  isComplete: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  id?: string;
  playerId?: string;
  date?: string;
  name: string;
  city: string;
  country: string;
  countryCode?: string;
  countryFlag?: string;
  avatarUrl?: string;
  icon: string;
  time: number;
  mistakes?: number;
  hintsUsed?: number;
  accuracy?: number;
  score: number;
  createdAt?: string;
  isCurrentUser?: boolean;
}

export interface CoachRequest {
  board: number[][];
  solution: number[][];
  selectedCell: CellPosition;
  currentValue: number | null;
  difficulty: Difficulty;
  mistakes: number;
}

export interface CoachResponse {
  explanation: string;
  answer?: number;
}

export interface SudokuPuzzle {
  puzzle: number[][];
  solution: number[][];
  given: boolean[][];
  difficulty: Difficulty;
}

export interface CollectibleIcon {
  id: string;
  emoji: string;
  name: string;
  rarity: Rarity;
}

export interface Settings {
  theme: ThemeName;
  language: "ru";
  ornamentMode?: boolean;
  ornamentIntroSeen?: boolean;
}
