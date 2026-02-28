/**
 * Count consecutive days with sessions going backward from today.
 * If today has no session yet, start counting from yesterday.
 */
export function computeStreak(sessionTimestamps: number[], now: number = Date.now()): number {
  if (sessionTimestamps.length === 0) return 0;

  const sessionDays = new Set(
    sessionTimestamps.map((ts) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );

  const today = new Date(now);
  let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;

  // If no session today, start from yesterday
  if (!sessionDays.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (sessionDays.has(key)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
