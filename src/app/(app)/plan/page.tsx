"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useChatContext } from "@/components/shell/dashboard-shell";
import { WeekBoard } from "@/components/plan/week-board";
import { WeekSummaryBar } from "@/components/plan/week-summary-bar";
import { useCalendarBusy } from "@/lib/hooks/use-calendar-busy";
import { startOfWeek, addDays, formatDayShort, toISODate } from "@/lib/date";

export default function PlanPage() {
  const store = useAppStore();
  const { setChatOpen } = useChatContext();
  const [offset, setOffset] = useState(0);

  // Compute the visible week's Monday up-front so the calendar hook (which must
  // run unconditionally) can fetch real busy hints for it.
  const weekStart = startOfWeek(addDays(store.today, offset * 7));
  const weekStartISO = toISODate(weekStart);
  const busyOverrides = useCalendarBusy(weekStartISO);

  if (!store.hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-48 rounded-lg bg-white/5" />
        <div className="h-12 rounded-xl bg-white/5" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const weekEnd = addDays(weekStart, 6);
  // Merge real Google Calendar busy hints over the mock day contexts: where a
  // real busyHint exists for a weekday, override it; otherwise keep the mock.
  const days = store.getWeekPlan(weekStart).map((d) => {
    const override = busyOverrides[d.weekday]?.busyHint;
    return override
      ? { ...d, context: { ...d.context, busyHint: override } }
      : d;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            Plan your week
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Your habits are pre-filled — confirm, skip, or add a session.
          </p>
        </div>
        <button
          onClick={() => setChatOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/15"
        >
          <Sparkles className="h-4 w-4" />
          Ask your coach
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="rounded-lg border border-[var(--card-border)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-medium">
            {formatDayShort(toISODate(weekStart))} – {formatDayShort(toISODate(weekEnd))}
          </span>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="rounded-lg border border-[var(--card-border)] p-2 text-[var(--muted-foreground)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10"
            >
              This week
            </button>
          )}
        </div>
        <WeekSummaryBar days={days} />
      </div>

      <WeekBoard days={days} />
    </div>
  );
}
