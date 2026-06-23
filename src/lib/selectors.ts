import type { LoggedSession, SportId } from "./types";
import { toISODate, startOfWeek, addDays, parseISO } from "./date";

export function sessionsInRange(
  sessions: LoggedSession[],
  startISO: string,
  endISO: string
): LoggedSession[] {
  return sessions.filter((s) => s.date >= startISO && s.date <= endISO);
}

export function countThisWeek(sessions: LoggedSession[], today: Date): number {
  const start = toISODate(startOfWeek(today));
  const end = toISODate(addDays(startOfWeek(today), 6));
  return sessionsInRange(sessions, start, end).length;
}

export function countThisMonth(sessions: LoggedSession[], today: Date): number {
  const key = toISODate(today).slice(0, 7);
  return sessions.filter((s) => s.date.slice(0, 7) === key).length;
}

export function countThisYear(sessions: LoggedSession[], today: Date): number {
  const year = toISODate(today).slice(0, 4);
  return sessions.filter((s) => s.date.slice(0, 4) === year).length;
}

export function totalMinutes(sessions: LoggedSession[]): number {
  return sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
}

/** Set of Monday-week-start ISO dates that contain ≥1 session. */
function weeksWithSessions(sessions: LoggedSession[]): Set<string> {
  const set = new Set<string>();
  for (const s of sessions) {
    set.add(toISODate(startOfWeek(parseISO(s.date))));
  }
  return set;
}

/** Consecutive weeks (ending this/last week) with ≥1 session. */
export function currentStreakWeeks(sessions: LoggedSession[], today: Date): number {
  const weeks = weeksWithSessions(sessions);
  let cursor = startOfWeek(today);
  // allow the current week to not have started yet
  if (!weeks.has(toISODate(cursor))) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function longestStreakWeeks(sessions: LoggedSession[]): number {
  const keys = [...weeksWithSessions(sessions)].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const cur = parseISO(k);
    if (prev && toISODate(addDays(prev, 7)) === k) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

export interface SportStat {
  sport: SportId;
  count: number;
  minutes: number;
}

/** Per-sport totals, sorted by count desc. Optionally bounded to a range. */
export function sportBreakdown(
  sessions: LoggedSession[],
  range?: { start: string; end: string }
): SportStat[] {
  const subset = range
    ? sessionsInRange(sessions, range.start, range.end)
    : sessions;
  const map = new Map<SportId, SportStat>();
  for (const s of subset) {
    const cur = map.get(s.sport) ?? { sport: s.sport, count: 0, minutes: 0 };
    cur.count++;
    cur.minutes += s.durationMinutes;
    map.set(s.sport, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Map of ISO date → sessions that day (for the heatmap). */
export function sessionsByDate(
  sessions: LoggedSession[]
): Map<string, LoggedSession[]> {
  const map = new Map<string, LoggedSession[]>();
  for (const s of sessions) {
    const arr = map.get(s.date) ?? [];
    arr.push(s);
    map.set(s.date, arr);
  }
  return map;
}
