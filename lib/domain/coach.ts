import type { CellPosition, Difficulty, Plan } from "../../types";

export interface SimpleCoachHintInput {
  board: number[][];
  solution: number[][];
  selectedCell: CellPosition;
  currentValue: number | null;
  difficulty?: Difficulty;
  mistakes?: number;
  elapsed?: number;
  hintsUsed?: number;
  plan?: Plan;
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

function coachPattern(candidates: number[], plan: Plan): string {
  if (candidates.length === 1) {
    return `Это naked single: после проверки строки, столбца и квадрата остается только ${candidates[0]}.`;
  }
  if (candidates.length === 2) {
    return `Здесь пара кандидатов. Не спеши угадывать: сравни эти два числа с соседними клетками в том же квадрате.`;
  }
  if (plan === "diamond" || plan === "sudoku-pass") {
    return "Премиум-анализ: отметь кандидатов во всех клетках квадрата и ищи скрытую одиночку, когда число может стоять только в одной позиции.";
  }
  return "Лучший следующий шаг: выпиши кандидатов и исключай числа по строке, столбцу и квадрату.";
}

function behaviorAdvice(input: SimpleCoachHintInput): string {
  const parts: string[] = [];
  if ((input.mistakes ?? 0) >= 3) parts.push("У тебя уже несколько ошибок: замедлись на одну проверку строки и столбца перед вводом.");
  if ((input.hintsUsed ?? 0) >= 2) parts.push("Ты часто просишь подсказки в этой партии: попробуй сначала поставить заметки в соседнем квадрате.");
  if ((input.elapsed ?? 0) > 600) parts.push("Темп партии спокойный: ищи легкие одиночные кандидаты, чтобы вернуть ритм.");
  return parts.join(" ");
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
  const pattern = coachPattern(candidates, input.plan ?? "free");
  const advice = behaviorAdvice(input);
  const suffix = advice ? ` ${advice}` : "";

  if (currentValue && currentValue !== answer) {
    return {
      answer,
      explanation: `${currentValue} здесь не подходит: это клетка ${position}. В строке уже есть ${list(rowValues)}, в столбце ${list(columnValues)}, в квадрате 3x3 ${list(boxValues)}. Подходящие кандидаты: ${list(candidates)}. ${pattern}${suffix}`
    };
  }

  if (currentValue === answer) {
    return {
      answer,
      explanation: `Эта цифра подходит для клетки ${position}: она не конфликтует со строкой, столбцом и квадратом 3x3. ${pattern}${suffix}`
    };
  }

  return {
    answer,
    explanation: `Клетка пустая: ${position}. В строке уже есть ${list(rowValues)}, в столбце ${list(columnValues)}, в квадрате ${list(boxValues)}. Подходящие кандидаты: ${list(candidates)}. ${pattern}${suffix}`
  };
}
