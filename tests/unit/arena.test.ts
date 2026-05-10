import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SABOTAGE_ABILITIES, calculateBoardProgress, pvpXpReward } from "../../lib/domain/arena";

const given = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => false));

describe("arena rules", () => {
  it("keeps sabotage visual, limited, and cooldown based", () => {
    assert.deepEqual(
      SABOTAGE_ABILITIES.map((ability) => ability.id),
      ["fog", "remove-notes", "hidden-combination"]
    );
    assert.deepEqual(
      SABOTAGE_ABILITIES.map((ability) => ability.cooldown),
      [25, 35, 30]
    );
    assert.ok(SABOTAGE_ABILITIES.every((ability) => ability.cooldown > 0 && ability.duration > 0));
  });

  it("calculates board progress from editable filled cells", () => {
    const board = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
    board[0][0] = 1;
    board[0][1] = 2;
    assert.equal(calculateBoardProgress({ board, given }), 2);
  });

  it("rewards PvP wins with more XP than losses", () => {
    assert.ok(pvpXpReward(true, 3) > pvpXpReward(false, 0));
  });
});
