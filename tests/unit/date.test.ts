import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { todayIso, yesterdayIso } from "../../lib/utils/date";

describe("Kazakhstan date keys", () => {
  it("changes the app day at midnight in Kazakhstan", () => {
    assert.equal(todayIso(new Date("2026-05-10T18:59:59.000Z")), "2026-05-10");
    assert.equal(todayIso(new Date("2026-05-10T19:00:00.000Z")), "2026-05-11");
  });

  it("calculates yesterday by Kazakhstan day", () => {
    assert.equal(yesterdayIso(new Date("2026-05-10T19:00:00.000Z")), "2026-05-10");
  });
});
