"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CellPosition, CollectibleIcon, Difficulty, GameReport, GameSession, Player, Settings, SudokuPuzzle } from "@/types";
import { rollIcon } from "@/lib/data/icons";
import { analyzeGameSession, completeGameSession, createGameSession, recordGameAction, resumeGameSession } from "@/lib/domain/gameReview";
import { calculatePuzzleDiamondReward } from "@/lib/domain/economy";
import { scoreFor } from "@/lib/domain/leaderboard";
import { calculateProgressionReward, rankLabel } from "@/lib/domain/progression";
import { chooseFirstDailyTitle } from "@/lib/domain/titles";
import { getDailyState, saveDailyState } from "@/lib/storage/daily";
import { addDiamonds } from "@/lib/storage/economy";
import { submitLeaderboardResult } from "@/lib/storage/leaderboard";
import { getPlayer, initPlayer, recordSolvedGame, updatePlayer } from "@/lib/storage/player";
import { getSettings, markOrnamentIntroSeen, setOrnamentMode } from "@/lib/storage/settings";
import { recordPassPuzzleSolved } from "@/lib/storage/sudokuPass";
import { playFeedback } from "@/lib/utils/feedback";
import { todayIso } from "@/lib/utils/date";
import { generatePuzzle, generateWithSeed } from "@/lib/sudoku/generator";
import { getConflicts, isBoardComplete } from "@/lib/sudoku/validator";
import { canUseOrnamentMode, getOrnament, type Ornament } from "@/lib/domain/ornaments";
import { AICoach } from "@/components/coach/AICoach";
import { OrnamentInfoCard } from "@/components/ornaments/OrnamentInfoCard";
import { OrnamentIntro } from "@/components/ornaments/OrnamentIntro";
import { OrnamentLegend } from "@/components/ornaments/OrnamentLegend";
import { OrnamentPreview } from "@/components/ornaments/OrnamentPreview";
import { CompletionModal } from "@/components/ui/CompletionModal";
import { DiamondModal } from "@/components/ui/DiamondModal";
import { FeatureTour } from "@/components/onboarding/FeatureTour";
import { Board } from "./Board";
import { Controls } from "./Controls";
import { Timer } from "./Timer";

type GameMode = "daily" | "free";

interface GameShellProps {
  mode: GameMode;
  initialDifficulty?: Difficulty;
}

interface Snapshot {
  board: number[][];
  notes: number[][][];
  mistakes: number;
  hintsUsed: number;
  elapsed: number;
}

const DIFFICULTIES: Array<{ value: Difficulty; label: string }> = [
  { value: "easy", label: "Лёгкая" },
  { value: "medium", label: "Средняя" },
  { value: "hard", label: "Сложная" },
  { value: "expert", label: "Эксперт" }
];

const COMBO_MILESTONES: Record<number, string> = {
  5: "Отлично!",
  10: "Серия!",
  20: "Идеально!",
  50: "Монстр Судоку!"
};

const EMPTY_BOARD = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
const EMPTY_GIVEN = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false));

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

function emptyNotes(): Set<number>[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
}

function serializeNotes(notes: Set<number>[][]): number[][][] {
  return notes.map((row) => row.map((cell) => Array.from(cell)));
}

function hydrateNotes(notes?: number[][][]): Set<number>[][] {
  if (!notes) return emptyNotes();
  return notes.map((row) => row.map((cell) => new Set(cell)));
}

function snapshotFrom(board: number[][], notes: Set<number>[][], mistakes: number, hintsUsed: number, elapsed: number): Snapshot {
  return {
    board: cloneBoard(board),
    notes: serializeNotes(notes),
    mistakes,
    hintsUsed,
    elapsed
  };
}

function countNotes(notes: Set<number>[][]): number {
  return notes.reduce((total, row) => total + row.reduce((rowTotal, cell) => rowTotal + cell.size, 0), 0);
}

function keyOf(cell: CellPosition): string {
  return `${cell.row}:${cell.col}`;
}

function firstEmpty(board: number[][], given: boolean[][]): CellPosition | null {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (!given[row][col] && board[row][col] === 0) return { row, col };
    }
  }
  return null;
}

export function GameShell({ mode, initialDifficulty = "medium" }: GameShellProps) {
  const [ready, setReady] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [puzzle, setPuzzle] = useState<SudokuPuzzle | null>(null);
  const [board, setBoard] = useState<number[][]>(EMPTY_BOARD);
  const [initialBoard, setInitialBoard] = useState<number[][]>(EMPTY_BOARD);
  const [given, setGiven] = useState<boolean[][]>(EMPTY_GIVEN);
  const [notes, setNotes] = useState<Set<number>[][]>(() => emptyNotes());
  const [notesUsed, setNotesUsed] = useState(0);
  const [selected, setSelected] = useState<CellPosition | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [checksUsed, setChecksUsed] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [complete, setComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [gameReport, setGameReport] = useState<GameReport | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [reward, setReward] = useState(0);
  const [xpReward, setXpReward] = useState(0);
  const [iconReward, setIconReward] = useState<CollectibleIcon | null>(null);
  const [rankUpLabel, setRankUpLabel] = useState("");
  const [awardedTitle, setAwardedTitle] = useState("");
  const [diamondOpen, setDiamondOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachRequestId, setCoachRequestId] = useState(0);
  const [gameSeed, setGameSeed] = useState(0);
  const [dailyDate, setDailyDate] = useState(() => todayIso());
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [leaderboardNotice, setLeaderboardNotice] = useState("");
  const [ornamentMode, setOrnamentModeState] = useState(false);
  const [ornamentIntroOpen, setOrnamentIntroOpen] = useState(false);
  const [ornamentPreviewOpen, setOrnamentPreviewOpen] = useState(false);
  const [ornamentLegendOpen, setOrnamentLegendOpen] = useState(false);
  const [ornamentInfo, setOrnamentInfo] = useState<Ornament | null>(null);
  const [finalOrnamentValue, setFinalOrnamentValue] = useState<number | null>(null);
  const [settings, setSettings] = useState<Settings>({
    theme: "standard",
    language: "ru",
    numberStyle: "classic",
    reducedMotion: false,
    screenShake: true,
    sound: true,
    accessibility: {
      errorCell: {
        color: "#b91c1c",
        texture: "diagonal",
        pattern: "warning"
      },
      selectedCell: {
        outlineColor: "#2563eb",
        borderThickness: 4
      },
      relatedCells: {
        dottedTexture: true,
        highlightColor: "#64748b"
      }
    }
  });
  const [comboStreak, setComboStreak] = useState(0);
  const [comboMessage, setComboMessage] = useState("");
  const [comboCells, setComboCells] = useState<Set<string>>(() => new Set());
  const [shakeActive, setShakeActive] = useState(false);

  const locked = mode === "daily" && complete;
  const playLocked = locked || !gameStarted;

  const triggerScreenShake = useCallback(() => {
    if (!settings.screenShake || settings.reducedMotion) return;
    setShakeActive(true);
    window.setTimeout(() => setShakeActive(false), 180);
  }, [settings.reducedMotion, settings.screenShake]);

  const loadPuzzle = useCallback(
    (nextDifficulty: Difficulty, forceFresh = false) => {
      const currentPlayer = initPlayer();
      setPlayer(currentPlayer);

      if (mode === "daily") {
        const date = dailyDate;
        const saved = getDailyState(date);
        const generated = generateWithSeed(date, "medium");

        if (!forceFresh && saved?.board && saved.solution && saved.given) {
          setPuzzle({ puzzle: saved.board, solution: saved.solution, given: saved.given, difficulty: saved.difficulty ?? "medium" });
          setBoard(cloneBoard(saved.board));
          setInitialBoard(cloneBoard(generated.puzzle));
          setGiven(saved.given);
          setNotes(hydrateNotes(saved.notes));
          setNotesUsed(saved.notesUsed ?? 0);
          setMistakes(saved.mistakes);
          setHintsUsed(saved.hintsUsed);
          setChecksUsed(saved.checksUsed ?? 0);
          setElapsed(saved.time);
          setComplete(saved.completed);
          setGameStarted(saved.completed);
          setGameSession(saved.reviewSession ? (saved.completed ? saved.reviewSession : resumeGameSession(saved.reviewSession)) : null);
          setGameReport(saved.reviewSession && saved.completed ? analyzeGameSession(saved.reviewSession) : null);
          setLeaderboardRank(null);
          setLeaderboardNotice("");
          setAwardedTitle("");
          setComboStreak(0);
          setComboMessage("");
          setComboCells(new Set());
          setSelected(firstEmpty(saved.board, saved.given));
          setReady(true);
          return;
        }

        setPuzzle(generated);
        setBoard(cloneBoard(generated.puzzle));
        setInitialBoard(cloneBoard(generated.puzzle));
        setGiven(generated.given);
        setNotes(emptyNotes());
        setNotesUsed(0);
        setMistakes(0);
        setHintsUsed(0);
        setChecksUsed(0);
        setElapsed(0);
        setComplete(false);
        setGameStarted(false);
        setGameSession(null);
        setGameReport(null);
        setLeaderboardRank(null);
        setLeaderboardNotice("");
        setAwardedTitle("");
        setComboStreak(0);
        setComboMessage("");
        setComboCells(new Set());
        setSelected(firstEmpty(generated.puzzle, generated.given));
        setReady(true);
        return;
      }

      const generated = generatePuzzle(nextDifficulty, `free:${Date.now()}:${gameSeed}`);
      setPuzzle(generated);
      setBoard(cloneBoard(generated.puzzle));
      setInitialBoard(cloneBoard(generated.puzzle));
      setGiven(generated.given);
      setNotes(emptyNotes());
      setNotesUsed(0);
      setMistakes(0);
      setHintsUsed(0);
      setChecksUsed(0);
      setElapsed(0);
      setComplete(false);
      setGameStarted(false);
      setGameSession(null);
      setGameReport(null);
      setLeaderboardRank(null);
      setLeaderboardNotice("");
      setAwardedTitle("");
      setHistory([]);
      setComboStreak(0);
      setComboMessage("");
      setComboCells(new Set());
      setSelected(firstEmpty(generated.puzzle, generated.given));
      setReady(true);
    },
    [dailyDate, gameSeed, mode]
  );

  useEffect(() => {
    loadPuzzle(difficulty);
  }, [difficulty, loadPuzzle]);

  useEffect(() => {
    if (mode !== "daily") return;
    const interval = window.setInterval(() => {
      setDailyDate((current) => {
        const next = todayIso();
        return current === next ? current : next;
      });
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    function syncPlayer() {
      setPlayer(getPlayer() ?? initPlayer());
    }

    function syncSettings() {
      const next = getSettings();
      setSettings(next);
      setOrnamentModeState(Boolean(next.ornamentMode));
    }

    syncPlayer();
    syncSettings();
    window.addEventListener("sl:player", syncPlayer);
    window.addEventListener("sl:settings", syncSettings);
    window.addEventListener("storage", syncPlayer);
    return () => {
      window.removeEventListener("sl:player", syncPlayer);
      window.removeEventListener("sl:settings", syncSettings);
      window.removeEventListener("storage", syncPlayer);
    };
  }, []);

  const persistDaily = useCallback(
    (
      nextBoard = board,
      nextNotes = notes,
      nextComplete = complete,
      nextTime = elapsed,
      nextMistakes = mistakes,
      nextHints = hintsUsed,
      nextNotesUsed = notesUsed,
      nextChecks = checksUsed,
      nextReviewSession = gameSession
    ) => {
      if (mode !== "daily" || !puzzle) return;
      const date = dailyDate;
      saveDailyState({
        date,
        completed: nextComplete,
        time: nextTime,
        mistakes: nextMistakes,
        hintsUsed: nextHints,
        checksUsed: nextChecks,
        score: scoreFor(nextTime, nextMistakes, nextHints),
        board: nextBoard,
        solution: puzzle.solution,
        given,
        notes: serializeNotes(nextNotes),
        notesUsed: nextNotesUsed,
        difficulty: puzzle.difficulty,
        reviewSession: nextReviewSession ?? undefined
      });
    },
    [board, checksUsed, complete, dailyDate, elapsed, gameSession, given, hintsUsed, mistakes, mode, notes, notesUsed, puzzle]
  );

  useEffect(() => {
    if (ready && mode === "daily" && puzzle && !complete) {
      persistDaily(board, notes, false, elapsed, mistakes, hintsUsed, notesUsed, checksUsed, gameSession);
    }
  }, [board, checksUsed, complete, elapsed, gameSession, hintsUsed, mistakes, mode, notes, notesUsed, persistDaily, puzzle, ready]);

  const errors = useMemo(() => {
    if (!puzzle) return [];
    const byKey = new Map<string, CellPosition>();
    for (const conflict of getConflicts(board)) byKey.set(keyOf(conflict), conflict);
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (!given[row][col] && board[row][col] !== 0 && board[row][col] !== puzzle.solution[row][col]) {
          byKey.set(`${row}:${col}`, { row, col });
        }
      }
    }
    return Array.from(byKey.values());
  }, [board, given, puzzle]);

  const disabledNumbers = useMemo(() => {
    const counts = Array.from({ length: 10 }, () => 0);
    board.flat().forEach((value) => {
      counts[value] += 1;
    });
    return counts.map((count, value) => (value > 0 && count >= 9 ? value : 0)).filter(Boolean);
  }, [board]);

  const pushHistory = useCallback(() => {
    setHistory((current) => {
      const next = [...current, snapshotFrom(board, notes, mistakes, hintsUsed, elapsed)];
      return next.slice(-50);
    });
  }, [board, elapsed, hintsUsed, mistakes, notes]);

  const startGame = useCallback(() => {
    if (!puzzle || complete) return;
    const timestamp = Date.now();
    const activeSession =
      gameSession && gameSession.moves.length > 0
        ? resumeGameSession(gameSession, timestamp)
        : createGameSession({
            mode,
            difficulty: puzzle.difficulty,
            puzzle: initialBoard,
            solution: puzzle.solution,
            given,
            startedAt: timestamp
          });

    setGameSession(activeSession);
    setGameReport(null);
    setGameStarted(true);
  }, [complete, gameSession, given, initialBoard, mode, puzzle]);

  const finishIfSolved = useCallback(
    (
      nextBoard: number[][],
      nextNotes: Set<number>[][],
      nextMistakes: number,
      nextHints: number,
      nextElapsed: number,
      finalValue?: number,
      finalSession?: GameSession | null
    ) => {
      if (!puzzle || complete || !isBoardComplete(nextBoard, puzzle.solution)) return;

      const date = mode === "daily" ? dailyDate : todayIso();
      const previousDaily = mode === "daily" ? getDailyState(date) : null;
      const shouldReward = mode !== "daily" || !previousDaily?.completed;
      const current = getPlayer() ?? initPlayer();
      const icon = shouldReward ? rollIcon(current.icons) : null;

      if (icon) {
        updatePlayer({ icons: [...current.icons, icon.id], activeIcon: icon.id });
      }
      const progression = calculateProgressionReward(
        {
          difficulty: puzzle.difficulty,
          time: nextElapsed,
          mistakes: nextMistakes,
          hintsUsed: nextHints,
          streak: current.streak
        },
        current.xp ?? 0
      );
      const completedPlayer = recordSolvedGame({ time: nextElapsed, mistakes: nextMistakes, hintsUsed: nextHints, date, difficulty: puzzle.difficulty });
      recordPassPuzzleSolved({ mode, difficulty: puzzle.difficulty, mistakes: nextMistakes });
      const rewardBreakdown = shouldReward
        ? calculatePuzzleDiamondReward({
            difficulty: puzzle.difficulty,
            time: nextElapsed,
            mistakes: nextMistakes,
            streak: completedPlayer.streak,
            isNewStreakDay: current.lastPlayedDate !== date,
            achievementUnlocked: (completedPlayer.achievements?.length ?? 0) > (current.achievements?.length ?? 0)
          })
        : { total: 0 };
      const diamondsEarned = rewardBreakdown.total;
      if (diamondsEarned > 0) addDiamonds(diamondsEarned);
      const updatedPlayer = getPlayer() ?? completedPlayer;
      const rankChanged = (current.rank ?? "bronze-i") !== (updatedPlayer.rank ?? "bronze-i");
      const firstDailyTitle =
        mode === "daily" && !current.firstTitleClaimed
          ? chooseFirstDailyTitle({
              time: nextElapsed,
              mistakes: nextMistakes,
              hintsUsed: nextHints,
              notesCount: Math.max(notesUsed, countNotes(nextNotes))
            })
          : "";
      const profilePlayer = firstDailyTitle ? updatePlayer({ title: firstDailyTitle, firstTitleClaimed: true }) : updatedPlayer;
      const completedSession = finalSession ? completeGameSession(finalSession, nextElapsed * 1000) : null;
      const report = completedSession ? analyzeGameSession(completedSession) : null;

      setComplete(true);
      setGameSession(completedSession);
      setGameReport(report);
      setReward(diamondsEarned);
      setXpReward(progression.xp);
      setIconReward(icon);
      setRankUpLabel(rankChanged ? rankLabel(updatedPlayer.rank ?? "bronze-i") : "");
      setAwardedTitle(firstDailyTitle);
      setFinalOrnamentValue(finalValue ?? null);
      setCompletionOpen(true);
      setPlayer(profilePlayer);
      playFeedback(settings, rankChanged ? "rank-up" : "victory");

      if (mode === "daily") {
        setLeaderboardNotice("Сохраняем результат в рейтинг...");
        submitLeaderboardResult({
          player: profilePlayer,
          date,
          time: nextElapsed,
          mistakes: nextMistakes,
          hintsUsed: nextHints
        })
          .then((rank) => {
            setLeaderboardRank(rank);
            setLeaderboardNotice(rank ? "Результат сохранён в рейтинг." : "Рейтинг не вернул место игрока.");
          })
          .catch((error) => {
            setLeaderboardRank(null);
            setLeaderboardNotice(error instanceof Error ? error.message : "Не удалось сохранить результат в рейтинг.");
          });

        saveDailyState({
          date,
          completed: true,
          time: nextElapsed,
          mistakes: nextMistakes,
          hintsUsed: nextHints,
          checksUsed,
          score: scoreFor(nextElapsed, nextMistakes, nextHints),
          board: nextBoard,
          solution: puzzle.solution,
          given,
          notes: serializeNotes(nextNotes),
          notesUsed,
          difficulty: puzzle.difficulty,
          reviewSession: completedSession ?? undefined
        });
      }
    },
    [checksUsed, complete, dailyDate, given, mode, notesUsed, puzzle, settings]
  );

  const placeNumber = useCallback(
    (value: number) => {
      if (!gameStarted || !selected || !puzzle || locked || given[selected.row][selected.col]) return;

      if (notesMode) {
        pushHistory();
        const nextNotes = notes.map((row) => row.map((cell) => new Set(cell)));
        const cell = nextNotes[selected.row][selected.col];
        const addingNote = !cell.has(value);
        if (addingNote) cell.add(value);
        else cell.delete(value);
        const nextNotesUsed = notesUsed + (addingNote ? 1 : 0);
        if (addingNote) setNotesUsed(nextNotesUsed);
        setNotes(nextNotes);
        persistDaily(board, nextNotes, false, elapsed, mistakes, hintsUsed, nextNotesUsed, checksUsed, gameSession);
        playFeedback(settings, "tap");
        return;
      }

      const nextBoard = cloneBoard(board);
      const nextNotes = notes.map((row) => row.map((cell) => new Set(cell)));
      const previousValue = nextBoard[selected.row][selected.col];
      const wasDifferent = previousValue !== value;
      if (!wasDifferent) {
        playFeedback(settings, "tap");
        return;
      }

      pushHistory();
      const timestamp = Date.now();
      nextBoard[selected.row][selected.col] = value;
      nextNotes[selected.row][selected.col].clear();
      const correct = value === puzzle.solution[selected.row][selected.col];
      const nextMistakes = wasDifferent && !correct ? mistakes + 1 : mistakes;
      const baseSession =
        gameSession ??
        createGameSession({
          mode,
          difficulty: puzzle.difficulty,
          puzzle: initialBoard,
          solution: puzzle.solution,
          given,
          startedAt: timestamp
        });
      const nextSession = recordGameAction(baseSession, {
        action: "place",
        row: selected.row,
        col: selected.col,
        digit: value,
        correct,
        boardBefore: board,
        boardAfter: nextBoard,
        timestamp
      });
      const comboKey = keyOf(selected);
      let nextCombo = comboStreak;

      if (correct && !comboCells.has(comboKey)) {
        nextCombo = comboStreak + 1;
        setComboCells((current) => new Set(current).add(comboKey));
        setComboStreak(nextCombo);
        if (COMBO_MILESTONES[nextCombo]) {
          setComboMessage(COMBO_MILESTONES[nextCombo]);
          window.setTimeout(() => setComboMessage(""), 1200);
        }
      } else if (!correct) {
        nextCombo = 0;
        setComboStreak(0);
        setComboMessage("");
      }

      if (!correct && wasDifferent) triggerScreenShake();
      playFeedback(settings, correct ? (nextCombo >= 3 ? "combo" : "success") : "error");

      setBoard(nextBoard);
      setNotes(nextNotes);
      setMistakes(nextMistakes);
      setGameSession(nextSession);
      persistDaily(nextBoard, nextNotes, false, elapsed, nextMistakes, hintsUsed, notesUsed, checksUsed, nextSession);
      finishIfSolved(nextBoard, nextNotes, nextMistakes, hintsUsed, elapsed, value, nextSession);
    },
    [board, checksUsed, comboCells, comboStreak, elapsed, finishIfSolved, gameSession, gameStarted, given, hintsUsed, initialBoard, locked, mistakes, mode, notes, notesMode, notesUsed, persistDaily, pushHistory, puzzle, selected, settings, triggerScreenShake]
  );

  const eraseSelected = useCallback(() => {
    if (!gameStarted || !selected || locked || given[selected.row][selected.col] || !puzzle) return;
    pushHistory();
    const nextBoard = cloneBoard(board);
    const nextNotes = notes.map((row) => row.map((cell) => new Set(cell)));
    const previousValue = nextBoard[selected.row][selected.col];
    nextBoard[selected.row][selected.col] = 0;
    nextNotes[selected.row][selected.col].clear();
    const timestamp = Date.now();
    const nextSession =
      previousValue !== 0
        ? recordGameAction(
            gameSession ??
              createGameSession({
                mode,
                difficulty: puzzle.difficulty,
                puzzle: initialBoard,
                solution: puzzle.solution,
                given,
                startedAt: timestamp
              }),
            {
              action: "erase",
              row: selected.row,
              col: selected.col,
              digit: 0,
              correct: true,
              boardBefore: board,
              boardAfter: nextBoard,
              timestamp
            }
          )
        : gameSession;
    setBoard(nextBoard);
    setNotes(nextNotes);
    if (nextSession !== gameSession) setGameSession(nextSession);
    playFeedback(settings, "tap");
    persistDaily(nextBoard, nextNotes, false, elapsed, mistakes, hintsUsed, notesUsed, checksUsed, nextSession);
  }, [board, checksUsed, elapsed, gameSession, gameStarted, given, hintsUsed, initialBoard, locked, mistakes, mode, notes, notesUsed, persistDaily, pushHistory, puzzle, selected, settings]);

  const undo = useCallback(() => {
    if (!gameStarted) return;
    setHistory((current) => {
      const last = current[current.length - 1];
      if (!last) return current;
      setBoard(cloneBoard(last.board));
      setNotes(hydrateNotes(last.notes));
      setMistakes(last.mistakes);
      setHintsUsed(last.hintsUsed);
      setElapsed(last.elapsed);
      persistDaily(cloneBoard(last.board), hydrateNotes(last.notes), false, last.elapsed, last.mistakes, last.hintsUsed);
      return current.slice(0, -1);
    });
  }, [gameStarted, persistDaily]);

  const restart = useCallback(() => {
    if (!puzzle || locked) return;
    setBoard(cloneBoard(initialBoard));
    setNotes(emptyNotes());
    setMistakes(0);
    setHintsUsed(0);
    setChecksUsed(0);
    setElapsed(0);
    setComplete(false);
    setGameStarted(false);
    setGameSession(null);
    setGameReport(null);
    setComboStreak(0);
    setComboMessage("");
    setComboCells(new Set());
    setLeaderboardRank(null);
    setLeaderboardNotice("");
    setHistory([]);
    setSelected(firstEmpty(initialBoard, given));
  }, [given, initialBoard, locked, puzzle]);

  const newFreeGame = useCallback(() => {
    setGameSeed((seed) => seed + 1);
  }, []);

  const requestHint = useCallback(() => {
    if (!gameStarted) return;
    if (!selected) setSelected(firstEmpty(board, given));
    setCoachOpen(true);
    setCoachRequestId((id) => id + 1);
  }, [board, gameStarted, given, selected]);

  const onHintUsed = useCallback(() => {
    if (!puzzle) return;
    const target = selected ?? firstEmpty(board, given) ?? { row: -1, col: -1 };
    const timestamp = Date.now();
    const nextSession = recordGameAction(
      gameSession ??
        createGameSession({
          mode,
          difficulty: puzzle.difficulty,
          puzzle: initialBoard,
          solution: puzzle.solution,
          given,
          startedAt: timestamp
        }),
      {
        action: "hint",
        row: target.row,
        col: target.col,
        digit: target.row >= 0 && target.col >= 0 ? puzzle.solution[target.row][target.col] : 0,
        correct: true,
        boardBefore: board,
        boardAfter: board,
        timestamp
      }
    );
    setGameSession(nextSession);
    setHintsUsed((current) => {
      const next = current + 1;
      persistDaily(board, notes, false, elapsed, mistakes, next, notesUsed, checksUsed, nextSession);
      return next;
    });
  }, [board, checksUsed, elapsed, gameSession, given, initialBoard, mistakes, mode, notes, notesUsed, persistDaily, puzzle, selected]);

  const checkBoard = useCallback(() => {
    if (!gameStarted || locked || !puzzle) return;
    const target = selected ?? firstEmpty(board, given) ?? { row: -1, col: -1 };
    const timestamp = Date.now();
    const nextSession = recordGameAction(
      gameSession ??
        createGameSession({
          mode,
          difficulty: puzzle.difficulty,
          puzzle: initialBoard,
          solution: puzzle.solution,
          given,
          startedAt: timestamp
        }),
      {
        action: "check",
        row: target.row,
        col: target.col,
        digit: target.row >= 0 && target.col >= 0 ? board[target.row][target.col] : 0,
        correct: errors.length === 0,
        boardBefore: board,
        boardAfter: board,
        timestamp
      }
    );
    const nextChecks = checksUsed + 1;
    setChecksUsed(nextChecks);
    setGameSession(nextSession);
    persistDaily(board, notes, false, elapsed, mistakes, hintsUsed, notesUsed, nextChecks, nextSession);
    playFeedback(settings, errors.length === 0 ? "success" : "error");
  }, [board, checksUsed, elapsed, errors.length, gameSession, gameStarted, given, hintsUsed, initialBoard, locked, mistakes, mode, notes, notesUsed, persistDaily, puzzle, selected, settings]);

  const canUseOrnaments = canUseOrnamentMode(player?.plan ?? "free");

  const toggleOrnamentMode = useCallback(() => {
    if (!canUseOrnaments) {
      setOrnamentPreviewOpen(true);
      return;
    }

    const settings = getSettings();
    if (!settings.ornamentIntroSeen && !settings.ornamentMode) {
      setOrnamentIntroOpen(true);
      return;
    }

    const next = setOrnamentMode(!ornamentMode).ornamentMode ?? false;
    setOrnamentModeState(next);
  }, [canUseOrnaments, ornamentMode]);

  function startOrnamentMode() {
    markOrnamentIntroSeen();
    setOrnamentModeState(setOrnamentMode(true).ornamentMode ?? true);
    setOrnamentIntroOpen(false);
  }

  function skipOrnamentIntro() {
    markOrnamentIntroSeen();
    setOrnamentIntroOpen(false);
  }

  function showOrnamentInfo(value: number) {
    setOrnamentInfo(getOrnament(value));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
      if (!ready) return;
      if (!gameStarted) {
        if (event.key === "Enter") {
          event.preventDefault();
          startGame();
        }
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        placeNumber(Number(event.key));
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        eraseSelected();
        return;
      }

      if (event.key === "Escape") {
        setSelected(null);
        setCoachOpen(false);
        return;
      }

      if (!selected) return;
      const deltas: Record<string, CellPosition> = {
        ArrowUp: { row: -1, col: 0 },
        ArrowDown: { row: 1, col: 0 },
        ArrowLeft: { row: 0, col: -1 },
        ArrowRight: { row: 0, col: 1 }
      };
      const delta = deltas[event.key];
      if (delta) {
        event.preventDefault();
        setSelected({
          row: Math.max(0, Math.min(8, selected.row + delta.row)),
          col: Math.max(0, Math.min(8, selected.col + delta.col))
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [eraseSelected, gameStarted, placeNumber, ready, selected, startGame]);

  if (!ready || !puzzle) {
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="board-skeleton" aria-label="Загрузка доски" />
      </div>
    );
  }

  return (
    <div className={`mx-auto grid max-w-6xl gap-6 px-4 py-6 md:px-6 lg:px-8 ${shakeActive ? "screen-shake" : ""}`}>
      {comboMessage ? <div className="combo-celebration">{comboMessage}</div> : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            {mode === "daily" ? "Ежедневный" : "Свободная игра"}
          </p>
          <h1 className="text-2xl font-black text-slate-950 md:text-3xl">
            {mode === "daily" ? "Ежедневный судоку" : "Свободная игра"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Timer seconds={elapsed} running={gameStarted && !complete} onTick={setElapsed} />
          {comboStreak >= 2 ? <span className="combo-badge">Комбо ×{comboStreak}</span> : null}
          <span className="badge-soft">Ошибки: {mistakes}</span>
          <span className="badge-soft">Подсказки: {hintsUsed}</span>
          <span className="badge-soft">Проверки: {checksUsed}</span>
        </div>
      </div>

      {mode === "free" ? (
        <div className="toolbar-band">
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
            Сложность
            <select className="select-control" value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)}>
              {DIFFICULTIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-secondary" onClick={newFreeGame}>
            Новая игра
          </button>
          <button type="button" className="btn-secondary" onClick={restart}>
            Рестарт
          </button>
        </div>
      ) : complete ? (
        <div className="toolbar-band">
          <span className="font-semibold text-slate-700">Ежедневный судоку уже решён: {elapsed ? `${Math.floor(elapsed / 60)} мин ${elapsed % 60} сек` : "готово"}</span>
          <span className="text-sm text-slate-500">
            {leaderboardRank ? `Место в рейтинге Казахстана: #${leaderboardRank}` : leaderboardNotice || "Результат сохранён в рейтинг"}
          </span>
        </div>
      ) : null}

      {!complete && !gameStarted ? (
        <section className="start-game-panel" aria-live="polite">
          <div>
            <p>Готов к старту?</p>
            <h2>{mode === "daily" ? "Начать ежедневный судоку?" : "Начать обычную игру?"}</h2>
            <span>Таймер начнёт идти только после ответа «Да».</span>
          </div>
          <button type="button" className="btn-primary" onClick={startGame}>
            Да, начать
          </button>
        </section>
      ) : null}

      <div className="game-layout">
        <div className="game-board-wrap">
          <Board
            board={board}
            given={given}
            notes={notes}
            selected={selected}
            errors={errors}
            complete={complete}
            locked={playLocked}
            ornamentMode={ornamentMode && canUseOrnaments}
            numberStyle={settings.numberStyle ?? player?.numberStyle ?? "classic"}
            onSelect={(row, col) => {
              if (!playLocked) setSelected({ row, col });
            }}
            onOrnamentInfo={showOrnamentInfo}
          />
        </div>

        <div className="game-side-panel">
          <Controls
            notesMode={notesMode}
            disabledNumbers={disabledNumbers}
            canUndo={history.length > 0}
            locked={playLocked}
            ornamentMode={ornamentMode && canUseOrnaments}
            canUseOrnament={canUseOrnaments}
            numberStyle={settings.numberStyle ?? player?.numberStyle ?? "classic"}
            onNumber={placeNumber}
            onUndo={undo}
            onToggleNotes={() => setNotesMode((current) => !current)}
            onErase={eraseSelected}
            onCheck={checkBoard}
            onHint={requestHint}
            onToggleOrnament={toggleOrnamentMode}
            onOpenOrnamentLegend={() => setOrnamentLegendOpen(true)}
          />

          <section className="game-status-card" aria-label="Статус партии">
            <div className="game-status-head">
              <p>Партия</p>
              <strong>{mode === "daily" ? "Ежедневный режим" : "Тренировка"}</strong>
            </div>
            <div className="game-status-list">
              <span>
                <small>Сложность</small>
                <strong>{DIFFICULTIES.find((item) => item.value === puzzle.difficulty)?.label}</strong>
              </span>
              <span>
                <small>Ранг</small>
                <strong>{rankLabel(player?.rank ?? "bronze-i")}</strong>
              </span>
              <span>
                <small>Рейтинг</small>
                <strong>{leaderboardRank ? `#${leaderboardRank}` : "после финиша"}</strong>
              </span>
              <span>
                <small>Подсказки</small>
                <strong>{player?.plan === "diamond" || player?.plan === "sudoku-pass" ? "без лимита" : `${hintsUsed} / 3 сегодня`}</strong>
              </span>
              <span>
                <small>Проверки</small>
                <strong>{checksUsed}</strong>
              </span>
              <span>
                <small>Профиль</small>
                <strong>{player?.plan === "diamond" || player?.plan === "sudoku-pass" ? "Пасс" : "Бесплатно"}</strong>
              </span>
            </div>
            <p className="game-status-callout">
              {mode === "daily"
                ? "После решения результат появится в рейтинге Казахстана. Подсказка не ломает игру, но влияет на итоговый разбор."
                : "Свободная игра подходит для тренировки: меняй сложность, проверяй поле и проси ИИ-подсказку, когда застрял."}
            </p>
          </section>
        </div>
      </div>

      <AICoach
        open={coachOpen}
        requestId={coachRequestId}
        board={board}
        solution={puzzle.solution}
        selectedCell={selected}
        difficulty={puzzle.difficulty}
        mistakes={mistakes}
        elapsed={elapsed}
        hintsUsed={hintsUsed}
        plan={player?.plan ?? "free"}
        onClose={() => setCoachOpen(false)}
        onLimit={() => setDiamondOpen(true)}
        onHintUsed={onHintUsed}
      />

      <CompletionModal
        open={completionOpen}
        time={elapsed}
        mistakes={mistakes}
        hintsUsed={hintsUsed}
        checksUsed={checksUsed}
        reward={reward}
        xpReward={xpReward}
        iconReward={iconReward}
        rank={leaderboardRank}
        rankUpLabel={rankUpLabel}
        awardedTitle={awardedTitle}
        plan={player?.plan ?? "free"}
        report={gameReport}
        onClose={() => setCompletionOpen(false)}
        onOpenDiamond={() => setDiamondOpen(true)}
        ornamentMode={ornamentMode && canUseOrnaments}
        finalOrnament={finalOrnamentValue ? getOrnament(finalOrnamentValue) : null}
      />

      <DiamondModal open={diamondOpen} onClose={() => setDiamondOpen(false)} onUpgrade={() => setPlayer(getPlayer())} />
      <FeatureTour mode={mode} plan={player?.plan ?? "free"} />
      <OrnamentPreview
        open={ornamentPreviewOpen}
        onClose={() => setOrnamentPreviewOpen(false)}
        onOpenDiamond={() => {
          setOrnamentPreviewOpen(false);
          setDiamondOpen(true);
        }}
      />
      <OrnamentIntro open={ornamentIntroOpen} onStart={startOrnamentMode} onSkip={skipOrnamentIntro} />
      <OrnamentLegend
        open={ornamentLegendOpen}
        onClose={() => setOrnamentLegendOpen(false)}
        onSelect={(ornament) => {
          setOrnamentInfo(ornament);
          setOrnamentLegendOpen(false);
        }}
      />
      <OrnamentInfoCard ornament={ornamentInfo} onClose={() => setOrnamentInfo(null)} />
    </div>
  );
}
