import type { CellPosition } from "../../types";

export interface SimpleCoachHintInput {
  board: number[][];
  solution: number[][];
  selectedCell: CellPosition;
  currentValue: number | null;
}

export interface SimpleCoachHint {
  explanation: string;
  answer: number;
}

function valuesInRow(board: number[][], row: number, skipCol: number): number[] {
  return board[row].filter((value, col) => col !== skipCol && value > 0);
}

function valuesInColumn(board: number[][], col: number, skipRow: number): number[] {
  return board.map((row) => row[col]).filter((value, row) => row !== skipRow && value > 0);
}

function valuesInBox(board: number[][], position: CellPosition): number[] {
  const startRow = Math.floor(position.row / 3) * 3;
  const startCol = Math.floor(position.col / 3) * 3;
  const values: number[] = [];

  for (let row = startRow; row < startRow + 3; row += 1) {
    for (let col = startCol; col < startCol + 3; col += 1) {
      if (row === position.row && col === position.col) continue;
      const value = board[row][col];
      if (value > 0) values.push(value);
    }
  }

  return values;
}

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function list(values: number[]): string {
  return values.length > 0 ? values.join(", ") : "пока нет чисел";
}

export function buildSimpleCoachHint(input: SimpleCoachHintInput): SimpleCoachHint {
  const { board, solution, selectedCell, currentValue } = input;
  const answer = solution[selectedCell.row][selectedCell.col];
  const rowValues = uniqueSorted(valuesInRow(board, selectedCell.row, selectedCell.col));
  const columnValues = uniqueSorted(valuesInColumn(board, selectedCell.col, selectedCell.row));
  const boxValues = uniqueSorted(valuesInBox(board, selectedCell));
  const blocked = new Set([...rowValues, ...columnValues, ...boxValues]);
  const candidates = Array.from({ length: 9 }, (_, index) => index + 1).filter((value) => !blocked.has(value));
  const position = `строка ${selectedCell.row + 1}, столбец ${selectedCell.col + 1}`;

  if (currentValue && currentValue !== answer) {
    return {
      answer,
      explanation: `${currentValue} здесь не подходит: это клетка ${position}, а для неё нужна другая цифра. В строке уже есть ${list(rowValues)}, в столбце ${list(columnValues)}, в квадрате 3x3 ${list(boxValues)}. Подходящие кандидаты: ${list(candidates)}.`
    };
  }

  if (currentValue === answer) {
    return {
      answer,
      explanation: `Эта цифра подходит для клетки ${position}. Она не конфликтует со строкой, столбцом и квадратом 3x3. Ответ ниже можно раскрыть, чтобы просто проверить себя.`
    };
  }

  return {
    answer,
    explanation: `Клетка пустая: ${position}. Смотри на строку, столбец и квадрат 3x3. В строке уже есть ${list(rowValues)}, в столбце ${list(columnValues)}, в квадрате ${list(boxValues)}. Подходящие кандидаты: ${list(candidates)}.`
  };
}
