import type {
  AreaPerformance,
  CellPosition,
  Difficulty,
  GameActionType,
  GameMoveLog,
  GamePause,
  GameReport,
  GameReviewMode,
  GameSession,
  HeatmapCell,
  KeyMoment,
  MoveAnalysis,
  MoveQuality,
  SudokuTechnique,
  TechniqueMove,
  WeaknessProfile
} from "../../types";

const PAUSE_THRESHOLD_MS = 10_000;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DIFFICULTY_BASELINE_MS: Record<Difficulty, number> = {
  easy: 5 * 60 * 1000,
  medium: 10 * 60 * 1000,
  hard: 15 * 60 * 1000,
  expert: 20 * 60 * 1000
};

export const TECHNIQUE_LABELS: Record<SudokuTechnique, string> = {
  "naked-single": "Naked Single",
  "hidden-single": "Hidden Single",
  "naked-pair": "Naked Pair",
  "hidden-pair": "Hidden Pair",
  "pointing-pair": "Pointing Pair",
  "x-wing": "X-Wing",
  swordfish: "Swordfish",
  unknown: "Нет простой техники"
};

interface CreateGameSessionInput {
  mode: GameReviewMode;
  difficulty: Difficulty;
  puzzle: number[][];
  solution: number[][];
  given: boolean[][];
  startedAt?: number;
}

interface RecordGameActionInput {
  action: GameActionType;
  row: number;
  col: number;
  digit: number;
  correct: boolean;
  boardBefore: number[][];
  boardAfter: number[][];
  timestamp?: number;
}

interface Unit {
  type: "row" | "col" | "block";
  index: number;
  cells: CellPosition[];
}

interface CellAccumulator {
  moves: number;
  errors: number;
  pauses: number;
  totalMs: number;
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

function emptyCellStats(): CellAccumulator[][] {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => ({
      moves: 0,
      errors: 0,
      pauses: 0,
      totalMs: 0
    }))
  );
}

function emptyAreaStats(): AreaPerformance[] {
  return Array.from({ length: 9 }, (_, index) => ({
    index,
    moves: 0,
    errors: 0,
    avgMs: 0
  }));
}

function sessionId(mode: GameReviewMode, startedAt: number): string {
  return `${mode}:${startedAt}:${Math.random().toString(36).slice(2, 10)}`;
}

function blockIndex(row: number, col: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function validCell(row: number, col: number): boolean {
  return row >= 0 && row < 9 && col >= 0 && col < 9;
}

export function cellLabel(row: number, col: number): string {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

export function techniqueLabel(technique: SudokuTechnique): string {
  return TECHNIQUE_LABELS[technique];
}

export function formatReviewDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} с`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes} мин ${rest} с` : `${minutes} мин`;
}

export function createGameSession(input: CreateGameSessionInput): GameSession {
  const startedAt = input.startedAt ?? Date.now();
  return {
    id: sessionId(input.mode, startedAt),
    mode: input.mode,
    difficulty: input.difficulty,
    puzzle: cloneBoard(input.puzzle),
    solution: cloneBoard(input.solution),
    given: input.given.map((row) => [...row]),
    startedAt,
    lastActionAt: startedAt,
    moves: [],
    pauses: [],
    stats: {
      totalTimeMs: 0,
      hintsUsed: 0,
      checksUsed: 0,
      erasures: 0
    }
  };
}

export function resumeGameSession(session: GameSession, timestamp = Date.now()): GameSession {
  return {
    ...session,
    lastActionAt: timestamp
  };
}

export function recordGameAction(session: GameSession, input: RecordGameActionInput): GameSession {
  const timestamp = input.timestamp ?? Date.now();
  const msSincePrevious = Math.max(0, timestamp - (session.lastActionAt || session.startedAt || timestamp));
  const moveNumber = session.moves.length + 1;
  const move: GameMoveLog = {
    moveNumber,
    action: input.action,
    row: input.row,
    col: input.col,
    digit: input.digit,
    correct: input.correct,
    timestamp,
    msSincePrevious,
    boardBefore: cloneBoard(input.boardBefore),
    boardAfter: cloneBoard(input.boardAfter)
  };
  const pauses: GamePause[] =
    msSincePrevious >= PAUSE_THRESHOLD_MS && validCell(input.row, input.col)
      ? [
          ...session.pauses,
          {
            moveNumber,
            row: input.row,
            col: input.col,
            durationMs: msSincePrevious,
            startedAt: timestamp - msSincePrevious,
            endedAt: timestamp
          }
        ]
      : session.pauses;

  return {
    ...session,
    lastActionAt: timestamp,
    moves: [...session.moves, move],
    pauses,
    stats: {
      totalTimeMs: session.stats.totalTimeMs,
      hintsUsed: session.stats.hintsUsed + (input.action === "hint" ? 1 : 0),
      checksUsed: session.stats.checksUsed + (input.action === "check" ? 1 : 0),
      erasures: session.stats.erasures + (input.action === "erase" ? 1 : 0)
    }
  };
}

export function completeGameSession(session: GameSession, totalTimeMs: number, timestamp = Date.now()): GameSession {
  return {
    ...session,
    completedAt: timestamp,
    lastActionAt: timestamp,
    stats: {
      ...session.stats,
      totalTimeMs
    }
  };
}

export function candidatesFor(board: number[][], row: number, col: number): number[] {
  if (!validCell(row, col) || board[row][col] !== 0) return [];
  const blocked = new Set<number>();

  for (let index = 0; index < 9; index += 1) {
    if (board[row][index] > 0) blocked.add(board[row][index]);
    if (board[index][col] > 0) blocked.add(board[index][col]);
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      if (board[r][c] > 0) blocked.add(board[r][c]);
    }
  }

  return DIGITS.filter((digit) => !blocked.has(digit));
}

function allUnits(): Unit[] {
  const units: Unit[] = [];

  for (let row = 0; row < 9; row += 1) {
    units.push({
      type: "row",
      index: row,
      cells: Array.from({ length: 9 }, (_, col) => ({ row, col }))
    });
  }

  for (let col = 0; col < 9; col += 1) {
    units.push({
      type: "col",
      index: col,
      cells: Array.from({ length: 9 }, (_, row) => ({ row, col }))
    });
  }

  for (let block = 0; block < 9; block += 1) {
    const startRow = Math.floor(block / 3) * 3;
    const startCol = (block % 3) * 3;
    const cells: CellPosition[] = [];
    for (let row = startRow; row < startRow + 3; row += 1) {
      for (let col = startCol; col < startCol + 3; col += 1) {
        cells.push({ row, col });
      }
    }
    units.push({ type: "block", index: block, cells });
  }

  return units;
}

function unitName(unit: Unit): string {
  if (unit.type === "row") return `строке ${unit.index + 1}`;
  if (unit.type === "col") return `столбце ${unit.index + 1}`;
  return `блоке ${unit.index + 1}`;
}

export function findBestTechniqueMove(board: number[][]): TechniqueMove | null {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const candidates = candidatesFor(board, row, col);
      if (candidates.length === 1) {
        return {
          row,
          col,
          digit: candidates[0],
          technique: "naked-single",
          difficulty: 1,
          reason: `В клетке ${cellLabel(row, col)} остался единственный кандидат ${candidates[0]}.`
        };
      }
    }
  }

  for (const unit of allUnits()) {
    for (const digit of DIGITS) {
      const positions = unit.cells.filter((cell) => candidatesFor(board, cell.row, cell.col).includes(digit));
      if (positions.length === 1) {
        const cell = positions[0];
        return {
          row: cell.row,
          col: cell.col,
          digit,
          technique: "hidden-single",
          difficulty: 2,
          reason: `В ${unitName(unit)} цифра ${digit} доступна только в клетке ${cellLabel(cell.row, cell.col)}.`
        };
      }
    }
  }

  return null;
}

function sameMove(move: GameMoveLog, suggested: TechniqueMove | null): boolean {
  return Boolean(suggested && move.row === suggested.row && move.col === suggested.col && move.digit === suggested.digit);
}

function explainMove(move: GameMoveLog, suggested: TechniqueMove | null, quality: MoveQuality): string {
  if (move.action === "hint") {
    return suggested
      ? `Подсказка была взята, хотя был доступен ${techniqueLabel(suggested.technique)}: ${suggested.reason}`
      : "Подсказка была взята в позиции без простой одиночной техники.";
  }

  if (move.action === "check") return "Игрок использовал проверку текущей позиции.";
  if (move.action === "erase") return `Стирание в клетке ${cellLabel(move.row, move.col)}.`;

  if (quality === "mistake") {
    return suggested
      ? `Ошибка в ${cellLabel(move.row, move.col)}. Вместо этого был доступен ${techniqueLabel(suggested.technique)}: ${suggested.reason}`
      : `Ошибка в ${cellLabel(move.row, move.col)}. Простая одиночная техника в этот момент не найдена.`;
  }

  if (quality === "missed") {
    return suggested
      ? `Ход был долгим: можно было быстрее применить ${techniqueLabel(suggested.technique)} и поставить ${suggested.digit} в ${cellLabel(suggested.row, suggested.col)}.`
      : "Ход был долгим, но Naked Single или Hidden Single не обнаружены.";
  }

  if (quality === "optimal") {
    return suggested ? `Сильный ход: ${suggested.reason}` : "Верный ход.";
  }

  if (quality === "good") {
    return suggested ? `Верный ход после паузы. Техника: ${techniqueLabel(suggested.technique)}.` : "Верный ход после паузы.";
  }

  return "Нейтральное действие.";
}

function analyzeMove(move: GameMoveLog): MoveAnalysis {
  const suggested = findBestTechniqueMove(move.boardBefore);
  const wasPause = move.msSincePrevious >= PAUSE_THRESHOLD_MS;
  let quality: MoveQuality = "neutral";

  if (move.action === "hint") {
    quality = "assisted";
  } else if (move.action === "place" && !move.correct) {
    quality = "mistake";
  } else if (move.action === "place" && wasPause && !sameMove(move, suggested)) {
    quality = "missed";
  } else if (move.action === "place" && wasPause) {
    quality = "good";
  } else if (move.action === "place" && sameMove(move, suggested)) {
    quality = "optimal";
  } else if (move.action === "place" && move.correct) {
    quality = "good";
  }

  return {
    move,
    technique: suggested?.technique ?? "unknown",
    quality,
    suggestedMove: suggested,
    complexity: suggested?.difficulty ?? 0,
    explanation: explainMove(move, suggested, quality)
  };
}

function incrementArea(area: AreaPerformance[], index: number, durationMs: number, error: boolean): void {
  const item = area[index];
  const total = item.avgMs * item.moves + durationMs;
  item.moves += 1;
  item.errors += error ? 1 : 0;
  item.avgMs = Math.round(total / item.moves);
}

function buildHeatmap(cells: CellAccumulator[][]): HeatmapCell[][] {
  const maxAvg = Math.max(
    1,
    ...cells.flatMap((row) => row.map((cell) => (cell.moves > 0 ? Math.round(cell.totalMs / cell.moves) : 0)))
  );

  return cells.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const avgMs = cell.moves > 0 ? Math.round(cell.totalMs / cell.moves) : 0;
      const timeScore = cell.moves > 0 ? avgMs / maxAvg : 0.06;
      const errorScore = cell.errors > 0 ? 1 : 0;
      const pauseScore = cell.pauses > 0 ? 0.7 : 0;
      const intensity = Math.min(1, timeScore * 0.55 + errorScore * 0.35 + pauseScore * 0.25);
      return {
        row: rowIndex,
        col: colIndex,
        moves: cell.moves,
        errors: cell.errors,
        pauses: cell.pauses,
        avgMs,
        intensity
      };
    })
  );
}

function buildWeaknessProfile(session: GameSession): WeaknessProfile {
  const byBlock = emptyAreaStats();
  const byRow = emptyAreaStats();
  const byCol = emptyAreaStats();
  const byDigit = emptyAreaStats();
  const cells = emptyCellStats();
  const placements = session.moves.filter((move) => move.action === "place");

  for (const move of placements) {
    if (!validCell(move.row, move.col)) continue;
    const duration = move.msSincePrevious;
    const isError = !move.correct;
    const cell = cells[move.row][move.col];
    cell.moves += 1;
    cell.errors += isError ? 1 : 0;
    cell.pauses += duration >= PAUSE_THRESHOLD_MS ? 1 : 0;
    cell.totalMs += duration;

    incrementArea(byRow, move.row, duration, isError);
    incrementArea(byCol, move.col, duration, isError);
    incrementArea(byBlock, blockIndex(move.row, move.col), duration, isError);
    if (move.digit >= 1 && move.digit <= 9) incrementArea(byDigit, move.digit - 1, duration, isError);
  }

  const correct = placements.filter((move) => move.correct).length;
  const totalDuration = placements.reduce((total, move) => total + move.msSincePrevious, 0);
  const accuracy = placements.length > 0 ? Math.round((correct / placements.length) * 100) : 100;
  const averageMoveMs = placements.length > 0 ? Math.round(totalDuration / placements.length) : 0;
  const independence = placements.length > 0 ? Math.max(0, Math.round(((placements.length - session.stats.hintsUsed) / placements.length) * 100)) : 100;

  return {
    byBlock,
    byRow,
    byCol,
    byDigit,
    heatmap: buildHeatmap(cells),
    accuracy,
    averageMoveMs,
    independence
  };
}

function countMistakes(session: GameSession): number {
  return session.moves.filter((move) => move.action === "place" && !move.correct).length;
}

function calculateReviewScore(session: GameSession): number {
  const baseline = DIFFICULTY_BASELINE_MS[session.difficulty];
  const timePenalty = Math.max(0, Math.ceil((session.stats.totalTimeMs - baseline) / 30_000));
  const raw = 100 - countMistakes(session) * 5 - session.stats.hintsUsed * 10 - session.stats.checksUsed * 2 - timePenalty;
  return Math.max(0, Math.round(raw));
}

function momentDescription(analysis: MoveAnalysis | undefined): string {
  if (!analysis) return "Позиция сохранена в таймлайне партии.";
  if (analysis.suggestedMove) return analysis.explanation;
  return analysis.explanation;
}

function addUniqueMoment(moments: KeyMoment[], moment: KeyMoment): void {
  if (moments.some((item) => item.id === moment.id || item.moveNumber === moment.moveNumber)) return;
  moments.push(moment);
}

function buildKeyMoments(session: GameSession, analyses: MoveAnalysis[]): KeyMoment[] {
  const byMove = new Map(analyses.map((analysis) => [analysis.move.moveNumber, analysis]));
  const moments: KeyMoment[] = [];
  const longestPause = [...session.pauses].sort((a, b) => b.durationMs - a.durationMs)[0];

  if (longestPause) {
    const analysis = byMove.get(longestPause.moveNumber);
    addUniqueMoment(moments, {
      id: "longest-pause",
      moveNumber: longestPause.moveNumber,
      row: longestPause.row,
      col: longestPause.col,
      title: `Самая долгая пауза: ${formatReviewDuration(longestPause.durationMs)}`,
      description: momentDescription(analysis),
      technique: analysis?.technique ?? "unknown",
      suggestedMove: analysis?.suggestedMove ?? null,
      severity: "warning"
    });
  }

  const firstMistake = analyses.find((analysis) => analysis.move.action === "place" && !analysis.move.correct);
  if (firstMistake) {
    addUniqueMoment(moments, {
      id: "first-mistake",
      moveNumber: firstMistake.move.moveNumber,
      row: firstMistake.move.row,
      col: firstMistake.move.col,
      title: `Первая ошибка: ${cellLabel(firstMistake.move.row, firstMistake.move.col)}`,
      description: firstMistake.explanation,
      technique: firstMistake.technique,
      suggestedMove: firstMistake.suggestedMove,
      severity: "error"
    });
  }

  const hardest = [...analyses]
    .filter((analysis) => analysis.suggestedMove)
    .sort((a, b) => b.complexity - a.complexity || b.move.msSincePrevious - a.move.msSincePrevious)[0];
  if (hardest) {
    addUniqueMoment(moments, {
      id: "hardest-technique",
      moveNumber: hardest.move.moveNumber,
      row: hardest.suggestedMove?.row ?? hardest.move.row,
      col: hardest.suggestedMove?.col ?? hardest.move.col,
      title: `Техника партии: ${techniqueLabel(hardest.technique)}`,
      description: hardest.explanation,
      technique: hardest.technique,
      suggestedMove: hardest.suggestedMove,
      severity: "info"
    });
  }

  for (const analysis of analyses
    .filter((item) => item.quality === "missed" || item.quality === "assisted")
    .sort((a, b) => b.move.msSincePrevious - a.move.msSincePrevious)) {
    addUniqueMoment(moments, {
      id: `moment-${analysis.move.moveNumber}`,
      moveNumber: analysis.move.moveNumber,
      row: analysis.move.row,
      col: analysis.move.col,
      title: analysis.quality === "assisted" ? "Подсказка" : `Упущенный ход: ${cellLabel(analysis.move.row, analysis.move.col)}`,
      description: analysis.explanation,
      technique: analysis.technique,
      suggestedMove: analysis.suggestedMove,
      severity: analysis.quality === "assisted" ? "info" : "warning"
    });
    if (moments.length >= 5) break;
  }

  return moments.slice(0, 5);
}

function worstArea(area: AreaPerformance[]): AreaPerformance {
  return [...area].sort((a, b) => b.errors - a.errors || b.avgMs - a.avgMs || b.moves - a.moves)[0];
}

function buildRecommendations(session: GameSession, analyses: MoveAnalysis[], profile: WeaknessProfile): string[] {
  const recommendations: string[] = [];
  const weakBlock = worstArea(profile.byBlock);
  const missedTechniqueCounts = new Map<SudokuTechnique, number>();

  for (const analysis of analyses) {
    if ((analysis.quality === "missed" || analysis.quality === "mistake" || analysis.quality === "assisted") && analysis.technique !== "unknown") {
      missedTechniqueCounts.set(analysis.technique, (missedTechniqueCounts.get(analysis.technique) ?? 0) + 1);
    }
  }

  const technique = Array.from(missedTechniqueCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (technique) {
    recommendations.push(`Чаще всего проседает ${techniqueLabel(technique)}. Перед вводом числа быстро проверяй кандидатов в строке, столбце и блоке.`);
  }

  if (weakBlock && (weakBlock.errors > 0 || weakBlock.avgMs >= PAUSE_THRESHOLD_MS)) {
    recommendations.push(`Самая тяжёлая зона - блок ${weakBlock.index + 1}: средний ход ${formatReviewDuration(weakBlock.avgMs)}, ошибок ${weakBlock.errors}. Потренируй Hidden Single именно в этом блоке.`);
  }

  if (profile.accuracy < 90) {
    recommendations.push("Точность ниже 90%: перед каждым вводом делай одну финальную проверку строки и столбца.");
  }

  if (profile.averageMoveMs >= PAUSE_THRESHOLD_MS) {
    recommendations.push("Средний темп выше 10 секунд на ход. Ищи сначала Naked Single - это самый быстрый способ вернуть ритм.");
  }

  if (session.stats.hintsUsed > 0) {
    recommendations.push("Подсказки помогли закончить партию, но в разборе видно, какие из них можно заменить техникой одиночек.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Партия ровная: продолжай закреплять Naked Single и Hidden Single, затем можно добавлять пары.");
  }

  return recommendations.slice(0, 4);
}

export function analyzeGameSession(session: GameSession): GameReport {
  const moveAnalyses = session.moves.map(analyzeMove);
  const weaknessProfile = buildWeaknessProfile(session);

  return {
    session,
    score: calculateReviewScore(session),
    moveAnalyses,
    keyMoments: buildKeyMoments(session, moveAnalyses),
    weaknessProfile,
    recommendations: buildRecommendations(session, moveAnalyses, weaknessProfile)
  };
}
