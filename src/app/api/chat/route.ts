import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import * as q from "@/lib/db/queries";
import { buildWeekPlan, habitItemId, type WeekDay } from "@/lib/mock/week-plan";
import {
  countThisMonth,
  countThisWeek,
  currentStreakWeeks,
  sportBreakdown,
} from "@/lib/selectors";
import { startOfWeek, toISODate, formatDuration } from "@/lib/date";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import type { SportId, Weekday } from "@/lib/types";

const MODEL = "claude-sonnet-4-6";

const WEEKDAY_ORDER: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const SPORTS = "football, tennis, padel, running, gym, skiing";

interface ChatBody {
  message?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

/** Anthropic tool definitions. The model uses these to act on the plan. */
const TOOLS: Anthropic.Tool[] = [
  {
    name: "add_adhoc_session",
    description:
      "Add a one-off (ad-hoc) training session to the plan on a specific date. Use this to book a slot the user asked for (e.g. a tennis slot Thursday, or a Friday morning run).",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "ISO date YYYY-MM-DD for the session.",
        },
        sport: {
          type: "string",
          enum: ["football", "tennis", "padel", "running", "gym", "skiing"],
          description: "The sport for the session.",
        },
        startTime: { type: "string", description: "Start time HH:MM (24h)." },
        endTime: { type: "string", description: "End time HH:MM (24h)." },
        label: {
          type: "string",
          description: "Short label for the session, e.g. 'Tennis (ad-hoc)'.",
        },
      },
      required: ["date", "sport", "startTime", "endTime", "label"],
    },
  },
  {
    name: "move_session",
    description:
      "Move a recurring (habit) session this week to a different weekday. Finds the matching habit item in the current week, skips it on its original day, and re-books it on the target weekday.",
    input_schema: {
      type: "object",
      properties: {
        sport: {
          type: "string",
          enum: ["football", "tennis", "padel", "running", "gym", "skiing"],
          description: "The sport of the recurring session to move.",
        },
        toWeekday: {
          type: "string",
          enum: WEEKDAY_ORDER,
          description: "The weekday to move the session to.",
        },
      },
      required: ["sport", "toWeekday"],
    },
  },
  {
    name: "get_consistency",
    description:
      "Get the user's training consistency stats: sessions this week, this month, current weekly streak, and per-sport breakdown.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_week",
    description:
      "Get the user's planned items for the current week (sports, days, and times).",
    input_schema: { type: "object", properties: {} },
  },
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Compact JSON of this week's planned items, for the system prompt context. */
function weekSummary(week: WeekDay[]) {
  return week
    .map((d) => ({
      weekday: d.weekday,
      date: d.date,
      items: d.items
        .filter((i) => i.status !== "missed")
        .map((i) => ({
          sport: i.sport,
          start: i.startTime || null,
          status: i.status,
          origin: i.origin,
        })),
    }))
    .filter((d) => d.items.length > 0);
}

function weekText(week: WeekDay[]): string {
  const lines: string[] = [];
  for (const d of week) {
    const planned = d.items.filter((i) => i.status !== "missed" && i.startTime);
    if (planned.length === 0) continue;
    const label = planned
      .map(
        (i) =>
          `${SPORT_BY_ID[i.sport].label}${i.startTime ? ` ${i.startTime}` : ""}`
      )
      .join(", ");
    lines.push(`• ${cap(d.weekday)}: ${label}`);
  }
  return lines.length ? lines.join("\n") : "Nothing planned yet this week.";
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ text: "AI coach not configured yet.", changed: false });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
  const message = (body.message ?? "").trim();
  if (!message) {
    return new Response("Bad Request", { status: 400 });
  }

  // ── Load context ───────────────────────────────────────────────────
  const data = await q.loadUserData(supabase);
  const today = new Date();
  const weekStart = startOfWeek(today);

  const buildWeek = () =>
    buildWeekPlan({
      weekStart,
      habits: data.habits,
      adHoc: data.adHoc,
      statusOverrides: data.overrides,
      sessions: data.sessions,
      today,
    });

  const week = buildWeek();

  const recentCounts = {
    thisWeek: countThisWeek(data.sessions, today),
    thisMonth: countThisMonth(data.sessions, today),
    streakWeeks: currentStreakWeeks(data.sessions, today),
  };

  const system = `You are Martijnfit's multi-sport coach for ${
    data.profile.name || "Martijn"
  }. Sports: ${SPORTS}. You help plan the upcoming week around recurring habits and the calendar, and answer consistency questions. Be concise and friendly. Use tools to actually change the plan.

Today is ${toISODate(today)} (${cap(week.find((d) => d.isToday)?.weekday ?? "")}). This week's start (Monday) is ${toISODate(weekStart)}. When the user names a weekday, resolve it to the matching date in this week (use the dates in the plan JSON). Never plan into the past.

This week's planned items (JSON):
${JSON.stringify(weekSummary(week))}

Recent activity: ${recentCounts.thisWeek} sessions this week, ${recentCounts.thisMonth} this month, ${recentCounts.streakWeeks}-week streak.`;

  // ── Tool handlers (server-side, user-scoped) ──────────────────────
  let changed = false;

  async function runTool(
    name: string,
    input: Record<string, unknown>
  ): Promise<string> {
    if (name === "add_adhoc_session") {
      const sport = input.sport as SportId;
      const date = String(input.date ?? "");
      const startTime = String(input.startTime ?? "");
      const endTime = String(input.endTime ?? "");
      const label = String(input.label ?? `${SPORT_BY_ID[sport]?.label ?? sport} (ad-hoc)`);
      if (!SPORT_BY_ID[sport] || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return "Error: invalid sport or date.";
      }
      if (date < toISODate(today)) {
        return "Error: that date is in the past — pick today or later.";
      }
      const created = await q.insertAdHoc(supabase, {
        date,
        sport,
        startTime,
        endTime,
        label,
      });
      if (!created) return "Error: could not add the session.";
      changed = true;
      return `Added ${SPORT_BY_ID[sport].label} on ${date} at ${startTime}.`;
    }

    if (name === "move_session") {
      const sport = input.sport as SportId;
      const toWeekday = input.toWeekday as Weekday;
      if (!SPORT_BY_ID[sport] || !WEEKDAY_ORDER.includes(toWeekday)) {
        return "Error: invalid sport or weekday.";
      }
      const todayISO = toISODate(today);
      // Find the first upcoming habit item this week for that sport.
      const freshWeek = buildWeek();
      let source:
        | { date: string; startTime: string; endTime: string; label: string; habitId?: string; itemId: string }
        | undefined;
      for (const d of freshWeek) {
        if (d.date < todayISO) continue;
        const item = d.items.find(
          (i) => i.origin === "habit" && i.sport === sport && i.status !== "done"
        );
        if (item) {
          source = {
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            label: item.label,
            habitId: item.habitId,
            itemId: item.id,
          };
          break;
        }
      }
      if (!source) {
        return `No upcoming ${SPORT_BY_ID[sport].label} session found this week to move.`;
      }
      const dest = freshWeek.find(
        (d) => d.weekday === toWeekday && d.date >= todayISO
      );
      if (!dest) {
        return `Couldn't find ${cap(toWeekday)} (today or later) in this week.`;
      }
      // Skip the original habit occurrence, re-book on the target day.
      const overrideId = source.habitId
        ? habitItemId(source.habitId, source.date)
        : source.itemId;
      await q.upsertOverride(supabase, user!.id, overrideId, "skipped");
      const created = await q.insertAdHoc(supabase, {
        date: dest.date,
        sport,
        startTime: source.startTime,
        endTime: source.endTime,
        label: source.label,
      });
      if (!created) return "Error: could not move the session.";
      changed = true;
      return `Moved ${SPORT_BY_ID[sport].label} to ${cap(toWeekday)} (${dest.date}) at ${source.startTime}.`;
    }

    if (name === "get_consistency") {
      const top = sportBreakdown(data.sessions).slice(0, 3);
      const sportsLine = top
        .map((s) => `${SPORT_BY_ID[s.sport].label} ${s.count}`)
        .join(", ");
      return `This week: ${recentCounts.thisWeek} sessions. This month: ${recentCounts.thisMonth}. Current streak: ${recentCounts.streakWeeks} weeks. Top sports all-time: ${sportsLine || "none yet"}.`;
    }

    if (name === "get_week") {
      const totalMin = buildWeek()
        .flatMap((d) => d.items)
        .filter((i) => i.loggedSessionId)
        .reduce((sum, i) => {
          const s = data.sessions.find((x) => x.id === i.loggedSessionId);
          return sum + (s?.durationMinutes ?? 0);
        }, 0);
      return `${weekText(buildWeek())}${
        totalMin ? `\n\nLogged so far: ${formatDuration(totalMin)}.` : ""
      }`;
    }

    return "Error: unknown tool.";
  }

  // ── Tool-use loop ──────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages: Anthropic.MessageParam[] = [
    ...(body.history ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let finalText = "";
  try {
    for (let turn = 0; turn < 6; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: TOOLS,
        messages,
      });

      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const textBlocks = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (textBlocks) finalText = textBlocks;

      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const result = await runTool(
          tu.name,
          (tu.input ?? {}) as Record<string, unknown>
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }
  } catch {
    return Response.json({
      text: "Sorry — I hit a snag reaching the coach. Try again in a moment.",
      changed,
    });
  }

  return Response.json({
    text: finalText || "Done.",
    changed,
  });
}
