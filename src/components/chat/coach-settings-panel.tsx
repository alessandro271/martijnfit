"use client";

import { CalendarDays, Watch } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import { WEEKDAY_LABELS } from "@/lib/date";

/** "What I know about your week" — read-only context the coach plans with. */
export function CoachSettingsPanel() {
  const store = useAppStore();
  const calendar = store.connections.find((c) => c.id === "google_calendar");
  const strava = store.connections.find((c) => c.id === "strava");

  return (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Recurring habits
        </h3>
        <div className="space-y-2">
          {store.habits.map((h) => {
            const cfg = SPORT_BY_ID[h.sport];
            const Icon = cfg.icon;
            return (
              <div
                key={h.id}
                className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.colorVar }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{h.label}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {h.days.map((d) => WEEKDAY_LABELS[d]).join(", ")} ·{" "}
                    {h.startTime}–{h.endTime}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Connected
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2">
            <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
            <span>Google Calendar</span>
            <span className="ml-auto text-xs text-[var(--success)]">
              {calendar?.connected ? "On" : "Off"}
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] px-3 py-2">
            <Watch className="h-4 w-4 text-[var(--accent)]" />
            <span>Strava</span>
            <span className="ml-auto text-xs text-[var(--success)]">
              {strava?.connected ? "Syncing" : "Off"}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Your coach plans around your meetings and your habits. Ask it to find a
        slot, plan a run, or move a session.
      </p>
    </div>
  );
}
