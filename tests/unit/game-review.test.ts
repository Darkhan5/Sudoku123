import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeGameSession, createGameSession, findBestTechniqueMove, recordGameAction } from "../../lib/domain/gameReview";

const puzzle = [
  [1, 2, 3, 4, 5, 6, 7, 8, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0]
];

const solution = [
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

const given = puzzle.map((row) => row.map((value) => value !== 0));

describe("game review analysis", () => {
  it("detects a naked single as the next best technique", () => {
    const next = findBestTechniqueMove(puzzle);

    assert.equal(next?.technique, "naked-single");
    assert.equal(next?.row, 0);
    assert.equal(next?.col, 8);
    assert.equal(next?.digit, 9);
  });

  it("records pauses and builds a scored report", () => {
    const session = createGameSession({
      mode: "daily",
      difficulty: "medium",
      puzzle,
      solution,
      given,
      startedAt: 1_000
    });
    const nextBoard = puzzle.map((row) => [...row]);
    nextBoard[0][8] = 8;
    const logged = recordGameAction(session, {
      action: "place",
      row: 0,
      col: 8,
      digit: 8,
      correct: false,
      boardBefore: puzzle,
      boardAfter: nextBoard,
      timestamp: 13_500
    });
    const report = analyzeGameSession(logged);

    assert.equal(logged.pauses.length, 1);
    assert.equal(report.moveAnalyses[0].quality, "mistake");
    assert.equal(report.keyMoments.length > 0, true);
    assert.equal(report.score < 100, true);
  });
});
