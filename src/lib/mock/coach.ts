// ─────────────────────────────────────────────────────────────────────
// Scripted AI coach (mock). Front-end only — no API, no LLM.
//
// UPGRADE PATH TO CLAUDE: replace getCoachReply() with a POST to an API
// route that runs Claude with tool-use. The INTENTS below map 1:1 to tool
// definitions, and each CoachAction maps to a store mutator — so the wiring
// (action → mutator) stays identical; only reply generation moves server-side.
// ─────────────────────────────────────────────────────────────────────

import type { LoggedSession, SportId, Weekday, PlanItem } from "@/lib/types";
import type { WeekDay } from "./week-plan";
import { SPORT_BY_ID } from "./sports";
import {
  countThisMonth,
  currentStreakWeeks,
  sportBreakdown,
} from "@/lib/selectors";
import { formatDuration, toISODate } from "@/lib/date";

export const SUGGESTION_CHIPS = [
  "Find me a tennis slot Thursday",
  "Plan a Friday morning run",
  "Move football to Friday",
  "How consistent was I this month?",
  "What's on my plan this week?",
] as const;

export type CoachAction =
  | {
      kind: "addAdHoc";
      item: { date: string; sport: SportId; startTime: string; endTime: string; label: string };
    }
  | { kind: "move"; item: PlanItem; newDateISO: string };

export interface CoachReply {
  text: string;
  action?: CoachAction;
  /** short label for the inline confirmation card */
  confirmation?: string;
}

export interface CoachContext {
  today: Date;
  sessions: LoggedSession[];
  /** the current calendar week (Mon–Sun) */
  week: WeekDay[];
  /** a 2-week horizon (this week + next) for scheduling into the future */
  horizon: WeekDay[];
}

const WEEKDAYS: Weekday[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

function findWeekday(text: string): Weekday | null {
  const lower = text.toLowerCase();
  return WEEKDAYS.find((d) => lower.includes(d)) ?? null;
}

/** Next occurrence of `weekday` that is today or later (so we never plan into the past). */
function dayFor(ctx: CoachContext, weekday: Weekday): WeekDay | undefined {
  const todayISO = toISODate(ctx.today);
  return ctx.horizon.find((d) => d.weekday === weekday && d.date >= todayISO);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Intent {
  id: string;
  test: (text: string) => boolean;
  respond: (text: string, ctx: CoachContext) => CoachReply;
}

const INTENTS: Intent[] = [
  // Find a slot for a racquet sport
  {
    id: "find_slot",
    test: (t) => /(tennis|padel)/.test(t) && /(slot|free|when|find|book|play|fit)/.test(t),
    respond: (text, ctx) => {
      const sport: SportId = /padel/.test(text) ? "padel" : "tennis";
      const weekday = findWeekday(text) ?? "thursday";
      const day = dayFor(ctx, weekday);
      const cfg = SPORT_BY_ID[sport];
      if (!day) {
        return { text: `Hmm, I couldn't find ${cap(weekday)} in this week. Try another day?` };
      }
      const start = "18:00";
      const end = sport === "padel" ? "19:30" : "19:15";
      return {
        text: `${cap(weekday)} looks open in the evening — ${day.context.busyHint ? `your calendar clears after work (${day.context.busyHint}), so ` : ""}${start} works well and courts are usually free then. Penciling in ${cfg.label}.`,
        action: {
          kind: "addAdHoc",
          item: { date: day.date, sport, startTime: start, endTime: end, label: `${cfg.label} (ad-hoc)` },
        },
        confirmation: `Added ${cfg.label} · ${cap(weekday)} ${start}`,
      };
    },
  },
  // Friday morning run
  {
    id: "morning_run",
    test: (t) => /run/.test(t) && /(morning|friday|wfh|early)/.test(t),
    respond: (text, ctx) => {
      const weekday = findWeekday(text) ?? "friday";
      const day = dayFor(ctx, weekday);
      if (!day) return { text: `Couldn't find ${cap(weekday)} this week.` };
      return {
        text: `Good call — you're WFH ${cap(weekday)}, so a 7:30 run fits nicely before the day starts. Added a 35-min easy run.`,
        action: {
          kind: "addAdHoc",
          item: { date: day.date, sport: "running", startTime: "07:30", endTime: "08:05", label: "Easy morning run (ad-hoc)" },
        },
        confirmation: `Added Running · ${cap(weekday)} 07:30`,
      };
    },
  },
  // Move a session
  {
    id: "move_session",
    test: (t) => /(move|reschedule|shift|swap)/.test(t),
    respond: (text, ctx) => {
      const sport = (Object.keys(SPORT_BY_ID) as SportId[]).find((s) => text.includes(s));
      const targetDay = findWeekday(text);
      const todayISO = toISODate(ctx.today);
      // find the first upcoming matching habit item to move
      let found: PlanItem | undefined;
      for (const d of ctx.horizon) {
        if (d.date < todayISO) continue;
        found = d.items.find(
          (i) => i.origin === "habit" && (!sport || i.sport === sport) && i.status !== "done"
        );
        if (found) break;
      }
      if (!found) return { text: `I couldn't find a${sport ? ` ${sport}` : ""} session to move this week.` };
      const dest = targetDay ? dayFor(ctx, targetDay) : undefined;
      if (!dest) return { text: `Where should I move your ${SPORT_BY_ID[found.sport].label} session? Try "move it to Friday".` };
      return {
        text: `Done — moved ${SPORT_BY_ID[found.sport].label} to ${cap(dest.weekday)} at ${found.startTime}. The original slot is now free.`,
        action: { kind: "move", item: found, newDateISO: dest.date },
        confirmation: `Moved ${SPORT_BY_ID[found.sport].label} → ${cap(dest.weekday)}`,
      };
    },
  },
  // Consistency / stats question
  {
    id: "consistency",
    test: (t) => /(consistent|streak|how many|this month|this year|progress|doing)/.test(t),
    respond: (_text, ctx) => {
      const month = countThisMonth(ctx.sessions, ctx.today);
      const streak = currentStreakWeeks(ctx.sessions, ctx.today);
      const top = sportBreakdown(ctx.sessions).slice(0, 3);
      const sportsLine = top
        .map((s) => `${SPORT_BY_ID[s.sport].label} ${s.count}`)
        .join(" · ");
      return {
        text: `You've trained ${month} times this month across ${new Set(ctx.sessions.map((s) => s.sport)).size} sports. 🔥 You're on a ${streak}-week streak — keep it rolling.\n\nAll-time leaders: ${sportsLine}.`,
      };
    },
  },
  // What's on this week
  {
    id: "this_week",
    test: (t) => /(this week|what'?s on|my plan|schedule|coming up)/.test(t),
    respond: (_text, ctx) => {
      const lines: string[] = [];
      for (const d of ctx.week) {
        const planned = d.items.filter(
          (i) => i.status !== "missed" && i.startTime
        );
        if (planned.length === 0) continue;
        const label = planned
          .map((i) => `${SPORT_BY_ID[i.sport].label}${i.startTime ? ` ${i.startTime}` : ""}`)
          .join(", ");
        lines.push(`• ${cap(d.weekday)}: ${label}`);
      }
      const totalMin = ctx.week
        .flatMap((d) => d.items)
        .filter((i) => i.loggedSessionId)
        .reduce((sum, i) => {
          const s = ctx.sessions.find((x) => x.id === i.loggedSessionId);
          return sum + (s?.durationMinutes ?? 0);
        }, 0);
      return {
        text: `Here's your week:\n${lines.join("\n")}${totalMin ? `\n\nDone so far: ${formatDuration(totalMin)} logged.` : ""}`,
      };
    },
  },
];

const GREETING: CoachReply = {
  text: "Hey Martijn 👋 I can help you plan your week. Try asking me to find a slot for tennis, plan a morning run, move a session, or check how consistent you've been.",
};

export function getCoachIntro(): string {
  return GREETING.text;
}

export function getCoachReply(message: string, ctx: CoachContext): CoachReply {
  const text = message.toLowerCase().trim();
  if (!text) return GREETING;
  for (const intent of INTENTS) {
    if (intent.test(text)) return intent.respond(text, ctx);
  }
  return {
    text: "I can help with planning your week — try \"find me a tennis slot Thursday\", \"plan a Friday morning run\", \"move football to Friday\", or \"how consistent was I this month?\".",
  };
}
