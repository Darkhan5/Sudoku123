import type { Difficulty, NumberStyle, ThemeName } from "@/types";
import {
  PASS_TASKS,
  SUDOKU_PASS_REWARD_LEVELS,
  getCurrentSudokuPassSeason,
  getPassProgressSnapshot,
  getThemeReward,
  getUnlockedPassRewards,
  isPassLevelUnlocked,
  taskForPuzzleSolved,
  type PassReward,
  type PassTaskId,
  type SudokuPassSeason
} from "@/lib/domain/sudokuPass";
import { safeJsonParse, todayIso } from "@/lib/utils/date";
import { getPlayer, updatePlayer } from "./player";

const PASS_KEY = "sl_sudoku_pass";

export interface SudokuPassTaskState {
  progress: number;
  completed: boolean;
}

export interface SudokuPassState {
  seasonId: string;
  xp: number;
  premiumActive: boolean;
  premiumActivatedAt?: string;
  claimedRewardIds: string[];
  dailyDate: string;
  tasks: Record<PassTaskId, SudokuPassTaskState>;
}

export interface SudokuPassView {
  season: SudokuPassSeason;
  state: SudokuPassState;
  progress: ReturnType<typeof getPassProgressSnapshot>;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitPassUpdate(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sl:sudoku-pass"));
  }
}

function emptyTasks(): Record<PassTaskId, SudokuPassTaskState> {
  return PASS_TASKS.reduce(
    (tasks, task) => ({
      ...tasks,
      [task.id]: {
        progress: 0,
        completed: false
      }
    }),
    {} as Record<PassTaskId, SudokuPassTaskState>
  );
}

function resetDailyTasks(tasks: Record<PassTaskId, SudokuPassTaskState>): Record<PassTaskId, SudokuPassTaskState> {
  return PASS_TASKS.reduce((next, task) => {
    next[task.id] = task.cadence === "daily" ? { progress: 0, completed: false } : tasks[task.id] ?? { progress: 0, completed: false };
    return next;
  }, {} as Record<PassTaskId, SudokuPassTaskState>);
}

function createState(season = getCurrentSudokuPassSeason(), date = todayIso()): SudokuPassState {
  return {
    seasonId: season.id,
    xp: 0,
    premiumActive: false,
    claimedRewardIds: [],
    dailyDate: date,
    tasks: emptyTasks()
  };
}

function normalizeState(raw: Partial<SudokuPassState> | null | undefined, season = getCurrentSudokuPassSeason(), date = todayIso()): SudokuPassState {
  if (!raw || raw.seasonId !== season.id) return createState(season, date);

  const baseTasks = emptyTasks();
  const incomingTasks = raw.tasks ?? baseTasks;
  const tasks = PASS_TASKS.reduce((next, task) => {
    const current = incomingTasks[task.id];
    next[task.id] = {
      progress: typeof current?.progress === "number" && Number.isFinite(current.progress) ? Math.max(0, Math.floor(current.progress)) : 0,
      completed: Boolean(current?.completed)
    };
    return next;
  }, {} as Record<PassTaskId, SudokuPassTaskState>);

  const state: SudokuPassState = {
    seasonId: season.id,
    xp: typeof raw.xp === "number" && Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp)) : 0,
    premiumActive: Boolean(raw.premiumActive),
    premiumActivatedAt: typeof raw.premiumActivatedAt === "string" ? raw.premiumActivatedAt : undefined,
    claimedRewardIds: Array.from(new Set(raw.claimedRewardIds ?? [])),
    dailyDate: typeof raw.dailyDate === "string" ? raw.dailyDate : date,
    tasks
  };

  if (state.dailyDate !== date) {
    return {
      ...state,
      dailyDate: date,
      tasks: resetDailyTasks(state.tasks)
    };
  }

  return state;
}

function readState(season = getCurrentSudokuPassSeason(), date = todayIso()): SudokuPassState {
  if (!hasStorage()) return createState(season, date);
  return normalizeState(safeJsonParse<Partial<SudokuPassState>>(localStorage.getItem(PASS_KEY), {}), season, date);
}

function writeState(state: SudokuPassState): SudokuPassState {
  if (hasStorage()) localStorage.setItem(PASS_KEY, JSON.stringify(state));
  emitPassUpdate();
  return state;
}

function cacheState(state: SudokuPassState): SudokuPassState {
  if (hasStorage()) localStorage.setItem(PASS_KEY, JSON.stringify(state));
  return state;
}

function syncPlayerPlanWithPass(state: SudokuPassState): void {
  const player = getPlayer();
  if (!player) return;
  if (player.plan === "sudoku-pass" && !state.premiumActive) updatePlayer({ plan: "free" });
  if (player.plan === "free" && state.premiumActive) updatePlayer({ plan: "sudoku-pass" });
}

function completeTask(state: SudokuPassState, taskId: PassTaskId): SudokuPassState {
  const task = PASS_TASKS.find((item) => item.id === taskId);
  if (!task) return state;

  const current = state.tasks[taskId] ?? { progress: 0, completed: false };
  if (current.completed) return state;

  const nextProgress = Math.min(task.goal, current.progress + 1);
  const completed = nextProgress >= task.goal;
  return {
    ...state,
    xp: completed ? state.xp + task.xp : state.xp,
    tasks: {
      ...state.tasks,
      [taskId]: {
        progress: nextProgress,
        completed
      }
    }
  };
}

function setTaskProgress(state: SudokuPassState, taskId: PassTaskId, progress: number): SudokuPassState {
  const task = PASS_TASKS.find((item) => item.id === taskId);
  if (!task) return state;
  const current = state.tasks[taskId] ?? { progress: 0, completed: false };
  if (current.completed) return state;

  const nextProgress = Math.min(task.goal, Math.max(current.progress, Math.floor(progress)));
  const completed = nextProgress >= task.goal;
  return {
    ...state,
    xp: completed ? state.xp + task.xp : state.xp,
    tasks: {
      ...state.tasks,
      [taskId]: {
        progress: nextProgress,
        completed
      }
    }
  };
}

export function getSudokuPassState(): SudokuPassState {
  const state = readState();
  syncPlayerPlanWithPass(state);
  return cacheState(state);
}

export function getSudokuPassView(): SudokuPassView {
  const season = getCurrentSudokuPassSeason();
  const state = getSudokuPassState();
  return {
    season,
    state,
    progress: getPassProgressSnapshot(state.xp)
  };
}

export function activateSudokuPassForCurrentSeason(): SudokuPassState {
  const state = getSudokuPassState();
  updatePlayer({ plan: "sudoku-pass" });
  return writeState({
    ...state,
    premiumActive: true,
    premiumActivatedAt: new Date().toISOString()
  });
}

export function isSudokuPassPremiumActive(): boolean {
  return getSudokuPassState().premiumActive;
}

export function recordPassPuzzleSolved(params: {
  mode: "daily" | "free" | "arena";
  difficulty: Difficulty;
  mistakes: number;
  arenaWin?: boolean;
}): SudokuPassState {
  let state = getSudokuPassState();
  for (const taskId of taskForPuzzleSolved(params)) {
    state = completeTask(state, taskId);
  }
  return writeState(state);
}

export function recordPassStreak(streak: number): SudokuPassState {
  const state = setTaskProgress(getSudokuPassState(), "season-seven-day-streak", streak);
  return writeState(state);
}

export function isPassRewardUnlocked(reward: PassReward): boolean {
  const state = getSudokuPassState();
  if (reward.track === "premium" && !state.premiumActive) return false;
  return isPassLevelUnlocked(state.xp, reward.level);
}

export function canUseExperiencePack(theme: ThemeName): boolean {
  if (theme === "standard") return true;
  const player = getPlayer();
  if (player?.plan === "diamond") return true;
  const state = readState();
  const reward = getThemeReward(theme);
  if (!reward) return player?.plan === "sudoku-pass" && state.premiumActive;
  if (reward.track === "premium" && !state.premiumActive) return false;
  return isPassLevelUnlocked(state.xp, reward.level);
}

export function claimUnlockedPassRewards(): PassReward[] {
  const state = getSudokuPassState();
  const rewards = getUnlockedPassRewards(state.xp, state.premiumActive).filter((reward) => !state.claimedRewardIds.includes(reward.id));
  if (!rewards.length) return [];

  const player = getPlayer();
  const ownedNumberPacks = new Set<NumberStyle>(player?.ownedNumberPacks ?? ["classic"]);
  let diamonds = player?.diamonds ?? 0;
  let title = player?.title;
  const seasonBadges = new Set(player?.seasonBadges ?? []);

  for (const reward of rewards) {
    if (reward.kind === "diamonds") diamonds += reward.diamonds ?? 0;
    if (reward.kind === "number_style" && reward.numberStyle) ownedNumberPacks.add(reward.numberStyle);
    if (reward.kind === "title") title = reward.title.replace(" title", "");
    if (["board_style", "animated_cosmetic", "kazakh_ornament", "pvp_effect", "xp_boost", "theme"].includes(reward.kind)) {
      seasonBadges.add(reward.title);
    }
  }

  if (player) {
    updatePlayer({
      diamonds,
      title,
      ownedNumberPacks: Array.from(ownedNumberPacks),
      seasonBadges: Array.from(seasonBadges)
    });
  }

  writeState({
    ...state,
    claimedRewardIds: Array.from(new Set([...state.claimedRewardIds, ...rewards.map((reward) => reward.id)]))
  });
  return rewards;
}

export function taskDefinitions() {
  return PASS_TASKS;
}

export function rewardLevels() {
  return SUDOKU_PASS_REWARD_LEVELS;
}
