import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ORNAMENTS, canUseOrnamentMode, getOrnament } from "../../lib/domain/ornaments";

describe("Өрнек ornament mode", () => {
  it("maps the nine Sudoku values to nine named Kazakh ornaments", () => {
    assert.equal(ORNAMENTS.length, 9);
    assert.deepEqual(
      ORNAMENTS.map((ornament) => ornament.value),
      [1, 2, 3, 4, 5, 6, 7, 8, 9]
    );
    assert.deepEqual(
      ORNAMENTS.map((ornament) => ornament.kazakhName),
      ["Қос мүйіз", "Құсқанат", "Гүл өрнек", "Төрт құлақ", "Жебе", "Тұмарша", "Шаршы", "Сыңар мүйіз", "Айналма"]
    );
  });

  it("uses the renamed asset files in Sudoku value order", () => {
    assert.deepEqual(
      ORNAMENTS.map((ornament) => ornament.assetPath),
      [
        "/ornaments/ornament_1.svg",
        "/ornaments/ornament_2.svg",
        "/ornaments/ornament_3.svg",
        "/ornaments/ornament_4.svg",
        "/ornaments/ornament_5.svg",
        "/ornaments/ornament_6.svg",
        "/ornaments/ornament_7.svg",
        "/ornaments/ornament_8.svg",
        "/ornaments/ornament_9.svg"
      ]
    );
  });

  it("keeps ornament mode exclusive to Diamond", () => {
    assert.equal(canUseOrnamentMode("free"), false);
    assert.equal(canUseOrnamentMode("diamond"), true);
  });

  it("returns meaning metadata for a completed symbol", () => {
    const ornament = getOrnament(6);

    assert.equal(ornament?.kazakhName, "Тұмарша");
    assert.equal(ornament?.russianName, "Амулет");
    assert.match(ornament?.description ?? "", /круглый орнамент/);
  });
});
