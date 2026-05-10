import type { CellPosition } from "@/types";
import { canPlace } from "./solver";

function keyOf(cell: CellPosition): string {
  return `${cell.row}:${cell.col}`;
}

export function isValidPlacement(board: number[][], row: number, col: number, num: number): boolean {
  if (num < 1 || num > 9) return false;
  return canPlace(board, row, col, num);
}

export function isBoardComplete(board: number[][], solution: number[][]): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== solution[row][col]) return false;
    }
  }
  return true;
}

export function getConflicts(board: number[][]): CellPosition[] {
  const conflicts = new Map<string, CellPosition>();

  function mark(a: CellPosition, b: CellPosition): void {
    conflicts.set(keyOf(a), a);
    conflicts.set(keyOf(b), b);
  }

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = board[row][col];
      if (!value) continue;

      for (let i = 0; i < 9; i += 1) {
        if (i !== col && board[row][i] === value) mark({ row, col }, { row, col: i });
        if (i !== row && board[i][col] === value) mark({ row, col }, { row: i, col });
      }

      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let r = boxRow; r < boxRow + 3; r += 1) {
        for (let c = boxCol; c < boxCol + 3; c += 1) {
          if ((r !== row || c !== col) && board[r][c] === value) mark({ row, col }, { row: r, col: c });
        }
      }
    }
  }

  return Array.from(conflicts.values());
}
