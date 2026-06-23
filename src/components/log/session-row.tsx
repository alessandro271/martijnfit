"use client";

import { Pencil, Watch } from "lucide-react";
import type { LoggedSession, Intensity } from "@/lib/types";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import { SportIcon } from "@/components/ui/sport-badge";
import { formatDayLong, formatDuration } from "@/lib/date";

const INTENSITY_COLOR: Record<Intensity, string> = {
  easy: "var(--success)",
  moderate: "#eab308",
  hard: "var(--destructive)",
};

export function SessionRow({
  session,
  onEdit,
}: {
  session: LoggedSession;
  onEdit: (s: LoggedSession) => void;
}) {
  const cfg = SPORT_BY_ID[session.sport];
  return (
    <button
      onClick={() => onEdit(session)}
      className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-white/5"
    >
      <SportIcon sport={session.sport} size={38} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {cfg.label}
          {session.intensity && (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: INTENSITY_COLOR[session.intensity] }}
              title={session.intensity}
            />
          )}
        </p>
        <p className="text-xs text-[var(--muted)]">
          {formatDayLong(session.date)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm tabular-nums">
          {formatDuration(session.durationMinutes)}
          {session.distanceKm ? (
            <span className="text-[var(--muted-foreground)]">
              {" "}
              · {session.distanceKm} km
            </span>
          ) : null}
        </p>
        <p className="flex items-center justify-end gap-1 text-[10px] text-[var(--muted)]">
          {session.source === "manual" ? (
            "Manual"
          ) : (
            <>
              <Watch className="h-3 w-3" /> Strava{session.edited ? " · edited" : ""}
            </>
          )}
        </p>
      </div>
      <Pencil className="h-4 w-4 shrink-0 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
