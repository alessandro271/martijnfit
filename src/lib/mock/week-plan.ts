import type {
  RecurringHabit,
  PlanItem,
  PlanStatus,
  LoggedSession,
  DayContext,
  Weekday,
} from "@/lib/types";
import { DAY_CONTEXT } from "./habits";
import {
  addDays,
  toISODate,
  weekdayName,
  parseISO,
  WEEKDAY_ORDER,
} from "@/lib/date";

export interface WeekDay {
  date: string; // ISO
  weekday: Weekday;
  isToday: boolean;
  isPast: boolean;
  context: DayContext;
  items: PlanItem[];
}

interface BuildOpts {
  weekStart: Date; // a Monday
  habits: RecurringHabit[];
  adHoc: PlanItem[];
  statusOverrides: Record<string, PlanStatus>;
  sessions: LoggedSession[];
  today: Date;
}

/** Deterministic id for a habit-derived plan item on a given date. */
export function habitItemId(habitId: string, dateISO: string): string {
  return `habit:${habitId}:${dateISO}`;
}

/**
 * Expand habits + ad-hoc items into a 7-day board (Mon–Sun) and reconcile
 * past days against logged sessions for planned-vs-actual.
 */
export function buildWeekPlan(opts: BuildOpts): WeekDay[] {
  const { weekStart, habits, adHoc, statusOverrides, sessions, today } = opts;
  const todayISO = toISODate(today);

  const days: WeekDay[] = [];

  for (let i = 0; i < 7; i++) {
    const dateObj = addDays(weekStart, i);
    const dateISO = toISODate(dateObj);
    const weekday = weekdayName(dateObj);
    const isToday = dateISO === todayISO;
    const isPast = dateISO < todayISO;

    // sessions logged on this day, claimable for reconciliation
    const daySessions = sessions.filter((s) => s.date === dateISO);
    const claimed = new Set<string>();

    const items: PlanItem[] = [];

    // 1. Habit-derived items
    for (const habit of habits) {
      if (!habit.days.includes(weekday)) continue;
      const id = habitItemId(habit.id, dateISO);
      items.push({
        id,
        date: dateISO,
        sport: habit.sport,
        startTime: habit.startTime,
        endTime: habit.endTime,
        label: habit.label,
        status: statusOverrides[id] ?? "planned",
        origin: "habit",
        habitId: habit.id,
      });
    }

    // 2. Ad-hoc items on this date
    for (const item of adHoc) {
      if (item.date !== dateISO) continue;
      items.push({
        ...item,
        status: statusOverrides[item.id] ?? item.status,
      });
    }

    // 3. Reconcile against logged sessions
    for (const item of items) {
      if (item.status === "skipped") continue;
      const match = daySessions.find(
        (s) => s.sport === item.sport && !claimed.has(s.id)
      );
      if (match) {
        claimed.add(match.id);
        item.status = "done";
        item.loggedSessionId = match.id;
      } else if (isPast) {
        item.status = "missed";
      }
    }

    // 4. Surface unplanned logged sessions (Strava caught something extra)
    for (const s of daySessions) {
      if (claimed.has(s.id)) continue;
      items.push({
        id: `logged:${s.id}`,
        date: dateISO,
        sport: s.sport,
        startTime: "",
        endTime: "",
        label: "Logged via Strava",
        status: "done",
        origin: "adhoc",
        loggedSessionId: s.id,
      });
    }

    // sort by start time (timed items first), keep unplanned at the end
    items.sort((a, b) => (a.startTime || "zz").localeCompare(b.startTime || "zz"));

    days.push({
      date: dateISO,
      weekday,
      isToday,
      isPast,
      context: DAY_CONTEXT[weekday],
      items,
    });
  }

  return days;
}

/** Week summary counts for the summary bar. */
export function summarizeWeek(days: WeekDay[]) {
  let planned = 0;
  let confirmed = 0;
  let done = 0;
  for (const d of days) {
    for (const item of d.items) {
      if (item.status === "done") done++;
      else if (item.status === "confirmed") confirmed++;
      else if (item.status === "planned") planned++;
    }
  }
  return { planned, confirmed, done };
}

export { WEEKDAY_ORDER, parseISO };
