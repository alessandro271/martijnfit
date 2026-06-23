"use client";

import { useState, useMemo } from "react";
import type { LoggedSession, SportId } from "@/lib/types";
import { SPORTS, SPORT_BY_ID } from "@/lib/mock/sports";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import {
  toISODate,
  startOfWeek,
  addDays,
  parseISO,
  monthShort,
  formatDayLong,
  formatDuration,
} from "@/lib/date";
import { sessionsByDate } from "@/lib/selectors";

type View = "year" | "6m";

interface Cell {
  date: string | null; // null = future / out of range
  sessions: LoggedSession[];
}

function dominantSport(sessions: LoggedSession[]): SportId | null {
  if (sessions.length === 0) return null;
  return [...sessions].sort((a, b) => b.durationMinutes - a.durationMinutes)[0]
    .sport;
}

function fillFor(count: number, color: string): string {
  const pct = count >= 3 ? 100 : count === 2 ? 72 : 46;
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export function ConsistencyHeatmap({
  sessions,
  today,
}: {
  sessions: LoggedSession[];
  today: Date;
}) {
  const [view, setView] = useState<View>("year");
  const [hover, setHover] = useState<string | null>(null);

  const byDate = useMemo(() => sessionsByDate(sessions), [sessions]);

  const weeks = useMemo(() => {
    const rangeDays = view === "year" ? 364 : 182;
    const rangeStart = startOfWeek(addDays(today, -rangeDays));
    const minDate = sessions.reduce(
      (min, s) => (s.date < min ? s.date : min),
      toISODate(today)
    );
    const dataStart = startOfWeek(parseISO(minDate));
    const start =
      toISODate(dataStart) > toISODate(rangeStart) ? dataStart : rangeStart;
    const todayISO = toISODate(today);

    const cols: { weekStart: Date; cells: Cell[] }[] = [];
    let cursor = start;
    const lastWeek = startOfWeek(today);
    for (let w = 0; w < 60; w++) {
      const cells: Cell[] = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(cursor, i);
        const iso = toISODate(d);
        if (iso > todayISO) cells.push({ date: null, sessions: [] });
        else cells.push({ date: iso, sessions: byDate.get(iso) ?? [] });
      }
      cols.push({ weekStart: cursor, cells });
      if (toISODate(cursor) === toISODate(lastWeek)) break;
      cursor = addDays(cursor, 7);
    }
    return cols;
  }, [view, sessions, today, byDate]);

  const hoverInfo = useMemo(() => {
    if (!hover) return null;
    const ses = byDate.get(hover) ?? [];
    const label = formatDayLong(hover);
    if (ses.length === 0) return `${label} · rest`;
    const parts = ses
      .map((s) => `${SPORT_BY_ID[s.sport].label} ${formatDuration(s.durationMinutes)}`)
      .join(", ");
    return `${label} · ${parts}`;
  }, [hover, byDate]);

  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">
            Consistency
          </h2>
          <p className="mt-0.5 h-4 text-xs text-[var(--muted-foreground)]">
            {hoverInfo ?? "Every session, every day — at a glance."}
          </p>
        </div>
        <SegmentedToggle<View>
          value={view}
          onChange={setView}
          options={[
            { value: "6m", label: "6 months" },
            { value: "year", label: "Year" },
          ]}
        />
      </div>

      <div className="overflow-x-auto scrollbar-hide pb-1">
        <div className="inline-block min-w-max">
          {/* Month labels */}
          <div className="mb-1 flex pl-7">
            {weeks.map((wk, i) => {
              const m = wk.weekStart.getMonth();
              const prevM = i > 0 ? weeks[i - 1].weekStart.getMonth() : -1;
              const show = m !== prevM;
              return (
                <div
                  key={i}
                  className="w-[15px] shrink-0 text-[10px] text-[var(--muted)]"
                >
                  <span className="whitespace-nowrap">
                    {show ? monthShort(m) : ""}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex">
            {/* Weekday labels */}
            <div className="mr-1 flex w-6 shrink-0 flex-col justify-between text-[9px] text-[var(--muted)]">
              {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
                <div key={i} className="h-3 leading-3">
                  {d}
                </div>
              ))}
            </div>

            {/* Week columns */}
            <div className="flex gap-[3px]">
              {weeks.map((wk, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {wk.cells.map((cell, ci) => {
                    if (!cell.date) {
                      return <div key={ci} className="h-3 w-3" />;
                    }
                    const sport = dominantSport(cell.sessions);
                    const filled = sport
                      ? fillFor(cell.sessions.length, SPORT_BY_ID[sport].color)
                      : undefined;
                    return (
                      <div
                        key={ci}
                        onMouseEnter={() => setHover(cell.date)}
                        onMouseLeave={() => setHover(null)}
                        className="h-3 w-3 rounded-[3px] transition-transform hover:scale-125"
                        style={{
                          backgroundColor: filled ?? "rgba(255,255,255,0.04)",
                          outline:
                            cell.date === toISODate(today)
                              ? "1px solid var(--accent)"
                              : "none",
                          outlineOffset: "1px",
                        }}
                        title={
                          cell.sessions.length
                            ? `${formatDayLong(cell.date)} · ${cell.sessions
                                .map((s) => SPORT_BY_ID[s.sport].label)
                                .join(", ")}`
                            : formatDayLong(cell.date)
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend: sport key */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {SPORTS.map((s) => (
          <span
            key={s.id}
            className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]"
          >
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </section>
  );
}
