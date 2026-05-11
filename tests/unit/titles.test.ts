import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIRST_DAILY_TITLES, chooseFirstDailyTitle } from "../../lib/domain/titles";

describe("first daily title rewards", () => {
  it("offers the ten short first-success titles", () => {
    assert.deepEqual(FIRST_DAILY_TITLES, [
      "Первый решатель",
      "Исследователь сетки",
      "Искатель чисел",
      "Новичок головоломок",
      "Старт логики",
      "Мастер клеток",
      "Быстрый ум",
      "Странник судоку",
      "Охотник за узорами",
      "Светлый ум"
    ]);
  });

  it("assigns titles from the player's solving style", () => {
    assert.equal(chooseFirstDailyTitle({ time: 300, mistakes: 1, hintsUsed: 0, notesCount: 4 }), "Быстрый ум");
    assert.equal(chooseFirstDailyTitle({ time: 820, mistakes: 2, hintsUsed: 0, notesCount: 30 }), "Охотник за узорами");
    assert.equal(chooseFirstDailyTitle({ time: 1100, mistakes: 0, hintsUsed: 0, notesCount: 8 }), "Мастер клеток");
    assert.equal(chooseFirstDailyTitle({ time: 700, mistakes: 0, hintsUsed: 1, notesCount: 2 }), "Светлый ум");
  });
});
