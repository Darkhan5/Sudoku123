import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SUDOKU_PASS_PLAN,
  canUseCoach,
  canUseTheme,
  getCoachLimit,
  getThemeCatalog,
  isSudokuPassSubscriber
} from "../../lib/domain/subscription";

describe("subscription access", () => {
  it("exposes Sudoku Pass as the premium product", () => {
    assert.equal(SUDOKU_PASS_PLAN.id, "sudoku-pass");
    assert.equal(SUDOKU_PASS_PLAN.name, "Sudoku Pass");
    assert.equal(SUDOKU_PASS_PLAN.priceMonthly, "2 500 tg/month");
    assert.ok(SUDOKU_PASS_PLAN.features.some((feature) => feature.includes("Premium reward track")));
  });

  it("gives Sudoku Pass users unlimited AI Coach access", () => {
    assert.equal(getCoachLimit("sudoku-pass"), Number.POSITIVE_INFINITY);
    assert.equal(canUseCoach("sudoku-pass", 10_000), true);
    assert.equal(isSudokuPassSubscriber({ plan: "sudoku-pass" }), true);
  });

  it("keeps free users on a finite coach limit", () => {
    assert.equal(getCoachLimit("free"), 3);
    assert.equal(canUseCoach("free", 2), true);
    assert.equal(canUseCoach("free", 3), false);
  });

  it("unlocks Experience Pack themes for Sudoku Pass", () => {
    const themes = getThemeCatalog();

    assert.ok(themes.length >= 5);
    assert.ok(themes.every((theme) => theme.subscription === "sudoku-pass"));
    assert.ok(themes.some((theme) => theme.id === "cyber-grid"));
    assert.ok(themes.some((theme) => theme.id === "library-ink"));
    assert.ok(themes.every((theme) => canUseTheme("sudoku-pass", theme.id)));
    assert.equal(canUseTheme("free", "cyber-grid"), false);
  });
});
