import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DIAMOND_PLAN,
  canUseCoach,
  canUseTheme,
  getCoachLimit,
  getThemeCatalog,
  isDiamondSubscriber
} from "../../lib/domain/subscription";

describe("subscription access", () => {
  it("exposes only one premium subscription named Diamond", () => {
    assert.equal(DIAMOND_PLAN.id, "diamond");
    assert.equal(DIAMOND_PLAN.name, "Diamond");
    assert.deepEqual(DIAMOND_PLAN.features, ["Подсказки без лимита", "3 темы доски", "Режим Өрнек"]);
  });

  it("gives Diamond users unlimited AI Coach access", () => {
    assert.equal(getCoachLimit("diamond"), Number.POSITIVE_INFINITY);
    assert.equal(canUseCoach("diamond", 10_000), true);
    assert.equal(isDiamondSubscriber({ plan: "diamond" }), true);
  });

  it("keeps free users on a finite coach limit", () => {
    assert.equal(getCoachLimit("free"), 3);
    assert.equal(canUseCoach("free", 2), true);
    assert.equal(canUseCoach("free", 3), false);
  });

  it("unlocks exactly three switchable profile and board themes for Diamond", () => {
    const themes = getThemeCatalog();

    assert.equal(themes.length, 3);
    assert.ok(themes.every((theme) => theme.subscription === "diamond"));
    assert.deepEqual(
      themes.map((theme) => theme.id),
      ["diamond-white", "diamond-black", "diamond-felt"]
    );
    assert.deepEqual(
      themes.map((theme) => theme.name),
      ["Белая доска", "Чёрная доска", "Войлочная доска"]
    );
    assert.ok(themes.every((theme) => canUseTheme("diamond", theme.id)));
    assert.equal(canUseTheme("free", themes[0].id), false);
  });
});
