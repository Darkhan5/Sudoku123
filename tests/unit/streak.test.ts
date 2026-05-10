import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStreakCalendar, normalizePlayedDates } from "../../lib/domain/streak";

describe("streak calendar", () => {
  it("keeps unique played dates sorted chronologically", () => {
    assert.deepEqual(normalizePlayedDates(["2026-05-03", "2026-05-01", "2026-05-03"]), ["2026-05-01", "2026-05-03"]);
  });

  it("marks solved days inside the current month", () => {
    const calendar = buildStreakCalendar(["2026-05-01", "2026-05-03"], new Date("2026-05-10T12:00:00.000Z"));
    const solved = calendar.days.filter((day) => day.played).map((day) => day.date);

    assert.equal(calendar.monthLabel, "май 2026");
    assert.deepEqual(solved, ["2026-05-01", "2026-05-03"]);
  });
});
