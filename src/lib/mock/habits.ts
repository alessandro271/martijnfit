import type { RecurringHabit, DayContext, Weekday } from "@/lib/types";

/** Martijn's recurring weekly habits — the backbone of the planner. */
export const MARTIJN_HABITS: RecurringHabit[] = [
  {
    id: "h-gym",
    sport: "gym",
    days: ["monday", "tuesday", "wednesday", "thursday"],
    startTime: "07:30",
    endTime: "08:15",
    label: "Morning gym before work",
  },
  {
    id: "h-football",
    sport: "football",
    days: ["wednesday"],
    startTime: "20:00",
    endTime: "21:00",
    label: "Football with the lads",
  },
  {
    id: "h-run-fri",
    sport: "running",
    days: ["friday"],
    startTime: "07:30",
    endTime: "08:10",
    label: "WFH Friday morning run",
  },
  {
    id: "h-run-sun",
    sport: "running",
    days: ["sunday"],
    startTime: "10:00",
    endTime: "11:00",
    label: "Sunday long run",
  },
];

/** Mocked Google Calendar context per weekday — makes the planner feel calendar-aware. */
export const DAY_CONTEXT: Record<Weekday, DayContext> = {
  monday: { busyHint: "Standup 9:00 · Meetings 10–12" },
  tuesday: { busyHint: "Meetings 14–16" },
  wednesday: { busyHint: "1:1s 11–12" },
  thursday: { busyHint: "Workshop 15–17" },
  friday: { note: "WFH — great for a morning run" },
  saturday: { note: "Free — courts usually open" },
  sunday: { note: "Easy day" },
};
