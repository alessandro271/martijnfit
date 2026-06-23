"use client";

import { useMemo } from "react";
import type { LoggedSession } from "@/lib/types";
import { SessionRow } from "./session-row";
import { formatMonthYear, monthKey } from "@/lib/date";

export function SessionList({
  sessions,
  onEdit,
}: {
  sessions: LoggedSession[];
  onEdit: (s: LoggedSession) => void;
}) {
  const groups = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
    const map = new Map<string, LoggedSession[]>();
    for (const s of sorted) {
      const key = monthKey(s.date);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--card-border)] py-16 text-center text-sm text-[var(--muted)]">
        No sessions match these filters.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(([key, items]) => (
        <div key={key}>
          <div className="sticky top-[57px] z-10 -mx-2 mb-1 flex items-center justify-between bg-[var(--background)]/90 px-2 py-1.5 backdrop-blur-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {formatMonthYear(`${key}-01`)}
            </h3>
            <span className="text-xs text-[var(--muted)]">
              {items.length} session{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-2">
            {items.map((s) => (
              <SessionRow key={s.id} session={s} onEdit={onEdit} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
