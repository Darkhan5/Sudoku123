import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NUMBER_PACKS, getNumberPack, isNumberPackUnlocked } from "../../lib/domain/cosmetics";

describe("cosmetic customization", () => {
  it("offers four locked number packs with diamond costs", () => {
    assert.deepEqual(
      NUMBER_PACKS.map((pack) => pack.id),
      ["classic", "neon", "pixel", "handwritten"]
    );
    assert.deepEqual(
      NUMBER_PACKS.map((pack) => pack.requiredDiamonds),
      [5, 10, 15, 25]
    );
    assert.equal(getNumberPack("neon").name, "Неоновый пак");
  });

  it("blocks selection until a pack is owned", () => {
    assert.equal(isNumberPackUnlocked(["classic"], "classic"), true);
    assert.equal(isNumberPackUnlocked(["classic"], "pixel"), false);
  });
});
