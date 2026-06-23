"use client";

import { Check } from "lucide-react";
import type { StepProps } from "../wizard";
import { SPORTS } from "@/lib/mock/sports";
import type { SportId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StepSports({ draft, update, onNext }: StepProps) {
  const toggle = (id: SportId) => {
    const set = new Set(draft.sports);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    update({ sports: [...set] });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          Which sports do you do?
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Pick everything you play or train. You can change this later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SPORTS.map((s) => {
          const active = draft.sports.includes(s.id);
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted)]"
              )}
            >
              <Icon className="h-6 w-6" style={{ color: s.colorVar }} />
              <span className="font-medium">{s.label}</span>
              {active && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={draft.sports.length === 0}
        className="w-full rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
