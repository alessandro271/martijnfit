"use client";

import { useState, useMemo } from "react";
import type { LoggedSession } from "@/lib/types";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { sportBreakdown } from "@/lib/selectors";
import { toISODate, startOfWeek, addDays, formatDuration } from "@/lib/date";

type Range = "month" | "year" | "all";

export function SportBreakdown({
  sessions,
  today,
}: {
  sessions: LoggedSession[];
  today: Date;
}) {
  const [range, setRange] = useState<Range>("year");

  const stats = useMemo(() => {
    if (range === "all") return sportBreakdown(sessions);
    if (range === "month") {
      const key = toISODate(today).slice(0, 7);
      return sportBreakdown(sessions.filter((s) => s.date.slice(0, 7) === key));
    }
    const start = toISODate(addDays(startOfWeek(today), -364));
    return sportBreakdown(
      sessions.filter((s) => s.date >= start),
    );
  }, [sessions, today, range]);

  const maxCount = stats[0]?.count ?? 1;

  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">
          By sport
        </h2>
        <SegmentedToggle<Range>
          value={range}
          onChange={setRange}
          options={[
            { value: "month", label: "Month" },
            { value: "year", label: "Year" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      <div className="space-y-3.5">
        {stats.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No sessions in this range yet.</p>
        )}
        {stats.map((s) => {
          const cfg = SPORT_BY_ID[s.sport];
          const Icon = cfg.icon;
          return (
            <div key={s.sport}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: cfg.colorVar }} />
                  <span className="font-medium">{cfg.label}</span>
                </span>
                <span className="text-[var(--muted-foreground)] tabular-nums">
                  <span className="font-semibold text-[var(--foreground)]">
                    {s.count}
                  </span>{" "}
                  · {formatDuration(s.minutes)}
                </span>
              </div>
              <ProgressBar value={s.count} max={maxCount} color={cfg.color} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
