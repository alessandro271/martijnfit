"use client";

import { CalendarClock } from "lucide-react";
import type { WeekDay } from "@/lib/mock/week-plan";
import { useAppStore } from "@/lib/store";
import { PlannedItemCard } from "./planned-item-card";
import { QuickAddSession } from "./quick-add-session";
import { WEEKDAY_LABELS, formatDayShort } from "@/lib/date";
import { cn } from "@/lib/utils";

export function WeekBoard({ days }: { days: WeekDay[] }) {
  const store = useAppStore();
  const sessionById = (id?: string) =>
    id ? store.sessions.find((s) => s.id === id) : undefined;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((d) => (
        <div
          key={d.date}
          className={cn(
            "flex flex-col rounded-2xl border bg-[var(--card)] p-3",
            d.isToday
              ? "border-[var(--accent)]/40 ring-1 ring-[var(--accent)]/20"
              : "border-[var(--card-border)]"
          )}
        >
          <div className="mb-2">
            <div className="flex items-baseline justify-between">
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-wide",
                  d.isToday
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                {WEEKDAY_LABELS[d.weekday]}
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {formatDayShort(d.date)}
              </span>
            </div>
            {d.context.busyHint && (
              <p className="mt-1 flex items-start gap-1 text-[10px] leading-tight text-[var(--muted)]">
                <CalendarClock className="mt-px h-3 w-3 shrink-0" />
                {d.context.busyHint}
              </p>
            )}
            {d.context.note && (
              <p className="mt-1 text-[10px] leading-tight text-[var(--accent)]/80">
                {d.context.note}
              </p>
            )}
          </div>

          <div className="flex-1 space-y-2">
            {d.items.length === 0 && (
              <p className="py-3 text-center text-[10px] text-[var(--muted)]">
                Rest day
              </p>
            )}
            {d.items.map((item) => (
              <PlannedItemCard
                key={item.id}
                item={item}
                loggedSession={sessionById(item.loggedSessionId)}
                onConfirm={(i) => store.setPlanStatus(i.id, "confirmed")}
                onSkip={(i) => store.setPlanStatus(i.id, "skipped")}
                onRestore={(i) => store.setPlanStatus(i.id, "planned")}
              />
            ))}
          </div>

          <QuickAddSession date={d.date} />
        </div>
      ))}
    </div>
  );
}
