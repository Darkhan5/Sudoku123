import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SABOTAGE_ABILITIES, calculateBoardProgress, mergeRoomState, pvpXpReward, type RoomState } from "../../lib/domain/arena";

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

  it("calculates board progress from editable correct cells", () => {
    const board = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));
    const solution = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 9));
    board[0][0] = 1;
    board[0][1] = 9;
    assert.equal(calculateBoardProgress({ board, given, solution }), 1);
  });

  it("rewards PvP wins with more XP than losses", () => {
    assert.ok(pvpXpReward(true, 3) > pvpXpReward(false, 0));
  });

  it("merges simultaneous room updates without dropping the other player state", () => {
    const current: RoomState = {
      code: "ROOM1",
      seed: "pvp:ROOM1:0",
      host: { name: "Host" },
      hostReady: true,
      guestReady: false,
      hostProgress: 35,
      guestProgress: 0,
      hostFinished: false,
      guestFinished: false,
      startedAt: 1_000,
      updatedAt: 900
    };
    const staleGuestWrite: RoomState = {
      ...current,
      hostReady: false,
      guest: { name: "Guest" },
      guestReady: true,
      hostProgress: 10,
      guestProgress: 20,
      startedAt: undefined,
      updatedAt: 950
    };

    const merged = mergeRoomState(current, staleGuestWrite, () => 1_100);

    assert.equal(merged.hostReady, true);
    assert.equal(merged.guestReady, true);
    assert.equal(merged.hostProgress, 35);
    assert.equal(merged.guestProgress, 20);
    assert.equal(merged.startedAt, 1_000);
    assert.equal(merged.guest?.name, "Guest");
  });
});
