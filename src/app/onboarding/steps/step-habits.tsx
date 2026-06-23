"use client";

import { Plus, Trash2 } from "lucide-react";
import type { StepProps } from "../wizard";
import { SportSelect } from "@/components/ui/sport-select";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import { WEEKDAY_ORDER, WEEKDAY_LABELS } from "@/lib/date";
import type { RecurringHabit, SportId, Weekday } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StepHabits({ draft, update, onNext }: StepProps) {
  const setHabits = (habits: RecurringHabit[]) => update({ habits });

  const updateHabit = (id: string, patch: Partial<RecurringHabit>) =>
    setHabits(draft.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  const removeHabit = (id: string) =>
    setHabits(draft.habits.filter((h) => h.id !== id));

  const addHabit = () => {
    const sport = draft.sports[0] ?? "gym";
    setHabits([
      ...draft.habits,
      {
        id: `h-${Math.random().toString(36).slice(2, 8)}`,
        sport,
        days: [],
        startTime: "18:00",
        endTime: "19:00",
        label: "",
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          Your weekly routine
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          The sessions you do most weeks. We&rsquo;ll pre-fill these every week so
          you just confirm.
        </p>
      </div>

      <div className="space-y-3">
        {draft.habits.map((h) => (
          <div
            key={h.id}
            className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SportSelect
                  value={h.sport}
                  onChange={(sport: SportId) => updateHabit(h.id, { sport })}
                  allowed={draft.sports}
                />
              </div>
              <button
                onClick={() => removeHabit(h.id)}
                className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--destructive)]"
                aria-label="Remove habit"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_ORDER.map((d: Weekday) => {
                const on = h.days.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() =>
                      updateHabit(h.id, {
                        days: on
                          ? h.days.filter((x) => x !== d)
                          : [...h.days, d],
                      })
                    }
                    className={cn(
                      "h-8 w-9 rounded-lg text-xs font-medium transition-colors",
                      on
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-[var(--muted)]"
                    )}
                  >
                    {WEEKDAY_LABELS[d].slice(0, 2)}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="time"
                value={h.startTime}
                onChange={(e) => updateHabit(h.id, { startTime: e.target.value })}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-elevated)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[var(--muted)]">–</span>
              <input
                type="time"
                value={h.endTime}
                onChange={(e) => updateHabit(h.id, { endTime: e.target.value })}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--card-elevated)] px-2 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>

            <input
              value={h.label}
              onChange={(e) => updateHabit(h.id, { label: e.target.value })}
              placeholder={`e.g. ${SPORT_BY_ID[h.sport].label} session`}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
        ))}
      </div>

      <button
        onClick={addHabit}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--card-border)] py-3 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <Plus className="h-4 w-4" />
        Add a habit
      </button>

      <button
        onClick={() => {
          // ensure each habit has a label
          update({
            habits: draft.habits.map((h) => ({
              ...h,
              label: h.label.trim() || `${SPORT_BY_ID[h.sport].label} session`,
            })),
          });
          onNext();
        }}
        className="w-full rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white transition-all hover:brightness-110"
      >
        Continue
      </button>
    </div>
  );
}
