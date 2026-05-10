import type { RankedTier } from "../../types";

export type SabotageId = "fog" | "remove-notes" | "hidden-combination";
export type PlayerRole = "host" | "guest";

export interface SabotageAbility {
  id: SabotageId;
  name: string;
  description: string;
  cooldown: number;
  duration: number;
}

export interface ArenaProgressInput {
  board: number[][];
  given: boolean[][];
}

export interface RoomParticipant {
  name: string;
  avatarUrl?: string;
  rank?: RankedTier;
}

export interface RoomState {
  code: string;
  seed: string;
  host?: RoomParticipant;
  guest?: RoomParticipant;
  hostReady: boolean;
  guestReady: boolean;
  hostProgress: number;
  guestProgress: number;
  hostFinished: boolean;
  guestFinished: boolean;
  startedAt?: number;
  updatedAt: number;
  lastEffect?: {
    id: SabotageId;
    from: PlayerRole;
    nonce: string;
    createdAt: number;
  };
}

export const SABOTAGE_ABILITIES: SabotageAbility[] = [
  {
    id: "fog",
    name: "Туман клетки",
    description: "Скрывает область 3x3 у соперника на 5 секунд.",
    cooldown: 25,
    duration: 5
  },
  {
    id: "remove-notes",
    name: "Стереть заметки",
    description: "Удаляет часть заметок соперника, не трогая цифры.",
    cooldown: 35,
    duration: 1
  },
  {
    id: "hidden-combination",
    name: "Скрыть связи",
    description: "Отключает подсветку связанных клеток на 7 секунд.",
    cooldown: 30,
    duration: 7
  }
];

export function calculateBoardProgress({ board, given }: ArenaProgressInput): number {
  let editable = 0;
  let filled = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (given[row][col]) continue;
      editable += 1;
      if (board[row][col] > 0) filled += 1;
    }
  }
  return editable === 0 ? 100 : Math.round((filled / editable) * 100);
}

export function pvpXpReward(won: boolean, winStreak: number): number {
  if (!won) return 25;
  return 150 + Math.min(150, Math.max(0, winStreak - 1) * 25);
}
