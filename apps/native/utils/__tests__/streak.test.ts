import { computeStreak } from "../streak";

describe("computeStreak", () => {
  it("returns 0 for no sessions", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("returns 1 when only today has a session", () => {
    const now = new Date(2026, 1, 28, 10, 0, 0).getTime(); // Feb 28, 10am
    const todaySession = new Date(2026, 1, 28, 8, 0, 0).getTime();
    expect(computeStreak([todaySession], now)).toBe(1);
  });

  it("returns 3 for three consecutive days ending today", () => {
    const now = new Date(2026, 1, 28, 10, 0, 0).getTime();
    const sessions = [
      new Date(2026, 1, 28, 8, 0, 0).getTime(),
      new Date(2026, 1, 27, 9, 0, 0).getTime(),
      new Date(2026, 1, 26, 7, 0, 0).getTime(),
    ];
    expect(computeStreak(sessions, now)).toBe(3);
  });

  it("starts from yesterday if no session today", () => {
    const now = new Date(2026, 1, 28, 10, 0, 0).getTime();
    const sessions = [
      new Date(2026, 1, 27, 9, 0, 0).getTime(),
      new Date(2026, 1, 26, 7, 0, 0).getTime(),
    ];
    expect(computeStreak(sessions, now)).toBe(2);
  });

  it("breaks on a gap day", () => {
    const now = new Date(2026, 1, 28, 10, 0, 0).getTime();
    const sessions = [
      new Date(2026, 1, 28, 8, 0, 0).getTime(),
      // gap on Feb 27
      new Date(2026, 1, 26, 7, 0, 0).getTime(),
    ];
    expect(computeStreak(sessions, now)).toBe(1);
  });

  it("counts multiple sessions on same day as one", () => {
    const now = new Date(2026, 1, 28, 20, 0, 0).getTime();
    const sessions = [
      new Date(2026, 1, 28, 8, 0, 0).getTime(),
      new Date(2026, 1, 28, 14, 0, 0).getTime(),
      new Date(2026, 1, 27, 9, 0, 0).getTime(),
    ];
    expect(computeStreak(sessions, now)).toBe(2);
  });

  it("returns 0 when no recent consecutive sessions", () => {
    const now = new Date(2026, 1, 28, 10, 0, 0).getTime();
    // Only a session 5 days ago
    const sessions = [new Date(2026, 1, 23, 8, 0, 0).getTime()];
    expect(computeStreak(sessions, now)).toBe(0);
  });
});
