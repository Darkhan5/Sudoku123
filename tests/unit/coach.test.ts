import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSimpleCoachHint } from "../../lib/domain/coach";

const board = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

const solution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

describe("simple AI hint", () => {
  it("explains a wrong value and returns a hidden answer value", () => {
    const hint = buildSimpleCoachHint({
      board,
      solution,
      selectedCell: { row: 0, col: 2 },
      currentValue: 9
    });

    assert.equal(hint.answer, 4);
    assert.match(hint.explanation, /9 здесь не подходит/);
    assert.match(hint.explanation, /Подходящие кандидаты/);
  });

  it("gives a short candidate explanation for an empty cell", () => {
    const hint = buildSimpleCoachHint({
      board,
      solution,
      selectedCell: { row: 0, col: 2 },
      currentValue: null
    });

    assert.equal(hint.answer, 4);
    assert.match(hint.explanation, /Клетка пустая/);
  });
});
