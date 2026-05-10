import type { Difficulty, SudokuPuzzle } from "@/types";

const CLUES: Record<Difficulty, number> = {
  easy: 36,
  medium: 30,
  hard: 25,
  expert: 22
};

const BASE_SOLUTION = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8]
];

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPermutation(rng: () => number): number[] {
  const bands = shuffle([0, 1, 2], rng);
  return bands.flatMap((band) => shuffle([0, 1, 2], rng).map((offset) => band * 3 + offset));
}

function generateSolution(seed: string): number[][] {
  const rng = mulberry32(hashSeed(seed));
  const rows = buildPermutation(rng);
  const cols = buildPermutation(rng);
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);

  return rows.map((row) => cols.map((col) => digits[BASE_SOLUTION[row][col] - 1]));
}

function removeCells(solution: number[][], seed: string, clues: number): number[][] {
  const rng = mulberry32(hashSeed(`${seed}:holes:${clues}`));
  const puzzle = solution.map((row) => [...row]);
  const cells = shuffle(
    Array.from({ length: 81 }, (_, index) => ({ row: Math.floor(index / 9), col: index % 9 })),
    rng
  );

  for (let i = 0; i < 81 - clues; i += 1) {
    const { row, col } = cells[i];
    puzzle[row][col] = 0;
  }

  return puzzle;
}

function makeGiven(puzzle: number[][]): boolean[][] {
  return puzzle.map((row) => row.map((value) => value !== 0));
}

export function generatePuzzle(difficulty: Difficulty = "medium", seed = String(Date.now())): SudokuPuzzle {
  const solution = generateSolution(`${seed}:${difficulty}`);
  const puzzle = removeCells(solution, `${seed}:${difficulty}`, CLUES[difficulty]);

  return {
    puzzle,
    solution,
    given: makeGiven(puzzle),
    difficulty
  };
}

export function generateWithSeed(seed: string, difficulty: Difficulty = "medium"): SudokuPuzzle {
  return generatePuzzle(difficulty, `daily:${seed}`);
}
