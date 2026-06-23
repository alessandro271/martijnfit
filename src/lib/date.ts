import type { Weekday } from "./types";

// Pure, client-safe date helpers. We format dates from LOCAL components
// (never toISOString, which is UTC) to avoid off-by-one day bugs, and we
// parse ISO dates at local noon to dodge timezone edge cases.

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format a Date as "YYYY-MM-DD" using local components. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" into a Date at local noon. */
export function parseISO(iso: string): Date {
  return new Date(`${iso}T12:00:00`);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function weekdayName(d: Date): Weekday {
  return WEEKDAYS[d.getDay()];
}

/** Monday-based weekday index: Mon=0 … Sun=6. */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Start of the week (Monday) at local noon. */
export function startOfWeek(d: Date): Date {
  const r = parseISO(toISODate(d));
  return addDays(r, -mondayIndex(r));
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b);
}

/** All dates from start to end (inclusive). */
export function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let cur = parseISO(toISODate(start));
  const last = toISODate(end);
  // guard against runaway loops
  for (let i = 0; i < 1000; i++) {
    out.push(cur);
    if (toISODate(cur) === last) break;
    cur = addDays(cur, 1);
  }
  return out;
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex];
}

export function monthShort(monthIndex: number): string {
  return MONTHS[monthIndex].slice(0, 3);
}

/** "Wed 12 Mar" */
export function formatDayLong(iso: string): string {
  const d = parseISO(iso);
  const wd = WEEKDAYS[d.getDay()].slice(0, 3);
  const cap = wd.charAt(0).toUpperCase() + wd.slice(1);
  return `${cap} ${d.getDate()} ${monthShort(d.getMonth())}`;
}

/** "2 Jun" */
export function formatDayShort(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${monthShort(d.getMonth())}`;
}

/** "June 2026" */
export function formatMonthYear(iso: string): string {
  const d = parseISO(iso);
  return `${monthName(d.getMonth())} ${d.getFullYear()}`;
}

/** "2026-06" month key for grouping. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Relative label: Today / Yesterday / Wed 12 Mar. */
export function formatRelative(iso: string, today: Date): number | string {
  const days = Math.round(
    (parseISO(toISODate(today)).getTime() - parseISO(iso).getTime()) /
      86_400_000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return `${days} days ago`;
  return formatDayLong(iso);
}

/** "20:00–21:00" → "1h" / "45m" helper for minutes. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const WEEKDAY_ORDER: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};
