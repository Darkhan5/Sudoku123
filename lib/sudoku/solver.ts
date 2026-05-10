function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

function findEmpty(board: number[][]): [number, number] | null {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) return [row, col];
    }
  }
  return null;
}

export function canPlace(board: number[][], row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i += 1) {
    if (board[row][i] === num && i !== col) return false;
    if (board[i][col] === num && i !== row) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if ((r !== row || c !== col) && board[r][c] === num) return false;
    }
  }

  return true;
}

export function solveSudoku(board: number[][]): number[][] | null {
  const working = cloneBoard(board);

  function backtrack(): boolean {
    const empty = findEmpty(working);
    if (!empty) return true;

    const [row, col] = empty;
    for (let num = 1; num <= 9; num += 1) {
      if (canPlace(working, row, col, num)) {
        working[row][col] = num;
        if (backtrack()) return true;
        working[row][col] = 0;
      }
    }

    return false;
  }

  return backtrack() ? working : null;
}

export function countSolutions(board: number[][], limit = 2): number {
  const working = cloneBoard(board);
  let count = 0;

  function backtrack(): void {
    if (count >= limit) return;
    const empty = findEmpty(working);
    if (!empty) {
      count += 1;
      return;
    }

    const [row, col] = empty;
    for (let num = 1; num <= 9; num += 1) {
      if (canPlace(working, row, col, num)) {
        working[row][col] = num;
        backtrack();
        working[row][col] = 0;
      }
    }
  }

  backtrack();
  return count;
}
