"use client";

import type { Draft } from "../wizard";
import { useAppStore } from "@/lib/store";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import { WEEKDAY_LABELS } from "@/lib/date";

export function StepReview({
  draft,
  onFinish,
}: {
  draft: Draft;
  onFinish: () => void;
}) {
  const store = useAppStore();
  const connected = store.connections.filter((c) => c.connected).length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          You&rsquo;re all set, {draft.name} 🎉
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Here&rsquo;s your setup. You can tweak anything later by talking to your
          coach.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Sports
          </p>
          <div className="flex flex-wrap gap-2">
            {draft.sports.map((id) => {
              const cfg = SPORT_BY_ID[id];
              const Icon = cfg.icon;
              return (
                <span
                  key={id}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
                    color: cfg.color,
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Weekly habits
          </p>
          <div className="space-y-1.5">
            {draft.habits.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{h.label}</span>
                <span className="text-xs text-[var(--muted)]">
                  {h.days.map((d) => WEEKDAY_LABELS[d]).join(", ") || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--card-border)] pt-3 text-sm text-[var(--muted-foreground)]">
          {connected} connections active · {store.sessions.length} sessions
          already in your history
        </div>
      </div>

      <button
        onClick={onFinish}
        className="w-full rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white transition-all hover:brightness-110"
      >
        Go to my tracker
      </button>
    </div>
  );
}
