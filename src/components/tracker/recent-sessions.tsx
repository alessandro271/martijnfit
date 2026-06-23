"use client";

import Link from "next/link";
import { Pencil, Watch, ArrowRight } from "lucide-react";
import type { LoggedSession } from "@/lib/types";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import { SportIcon } from "@/components/ui/sport-badge";
import { formatRelative, formatDuration } from "@/lib/date";

export function RecentSessions({
  sessions,
  today,
  onEdit,
  limit = 8,
}: {
  sessions: LoggedSession[];
  today: Date;
  onEdit: (s: LoggedSession) => void;
  limit?: number;
}) {
  const recent = [...sessions]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);

  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-heading)] text-base font-bold">
          Recent sessions
        </h2>
        <Link
          href="/log"
          className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-[var(--card-border)]">
        {recent.map((s) => {
          const cfg = SPORT_BY_ID[s.sport];
          return (
            <div
              key={s.id}
              className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <SportIcon sport={s.sport} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{cfg.label}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatRelative(s.date, today)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm tabular-nums">
                  {formatDuration(s.durationMinutes)}
                  {s.distanceKm ? (
                    <span className="text-[var(--muted-foreground)]">
                      {" "}
                      · {s.distanceKm} km
                    </span>
                  ) : null}
                </p>
                <p className="flex items-center justify-end gap-1 text-[10px] text-[var(--muted)]">
                  {s.source === "manual" ? (
                    "Manual"
                  ) : (
                    <>
                      <Watch className="h-3 w-3" /> Strava
                      {s.edited ? " · edited" : ""}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => onEdit(s)}
                className="rounded-lg p-2 text-[var(--muted)] opacity-0 transition-all hover:bg-white/5 hover:text-[var(--foreground)] group-hover:opacity-100"
                aria-label="Edit session"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
