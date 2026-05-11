import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCurrentSudokuPassSeason,
  getPassProgressSnapshot,
  SUDOKU_PASS_REWARD_LEVELS,
  getThemeReward,
  taskForPuzzleSolved
} from "../../lib/domain/sudokuPass";

describe("Sudoku Pass domain", () => {
  it("uses 30-day seasons starting on May 11, 2026", () => {
    const season = getCurrentSudokuPassSeason(new Date("2026-05-11T12:00:00.000Z"));

    assert.equal(season.id, "season-1");
    assert.equal(season.levelCount, 30);
    assert.equal(season.startsAt, "2026-05-11T00:00:00.000Z");
    assert.equal(season.endsAt, "2026-06-10T00:00:00.000Z");
  });

  it("maps XP to pass levels and next-level progress", () => {
    const progress = getPassProgressSnapshot(250);

    assert.equal(progress.level, 3);
    assert.equal(progress.nextLevelXp, 375);
    assert.equal(progress.xpToNextLevel, 125);
  });

  it("places Cyber Grid and Library Ink on the premium track", () => {
    assert.equal(getThemeReward("cyber-grid")?.level, 1);
    assert.equal(getThemeReward("library-ink")?.level, 7);
  });

  it("gives every level a free and premium reward", () => {
    assert.equal(SUDOKU_PASS_REWARD_LEVELS.length, 30);
    assert.ok(SUDOKU_PASS_REWARD_LEVELS.every((level) => level.free.length > 0));
    assert.ok(SUDOKU_PASS_REWARD_LEVELS.every((level) => level.premium.length > 0));
  });

  it("turns solved puzzles into daily and seasonal task progress", () => {
    assert.deepEqual(taskForPuzzleSolved({ mode: "daily", difficulty: "expert", mistakes: 0 }), [
      "daily-solve-puzzle",
      "season-solve-50",
      "daily-solve-daily",
      "daily-no-mistakes",
      "season-solve-expert"
    ]);
  });
});
