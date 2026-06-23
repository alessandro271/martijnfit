"use client";

import type { StepProps } from "../wizard";

export function StepWelcome({ draft, update, onNext }: StepProps) {
  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <div className="text-4xl">👋</div>
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          Welcome to Martijn<span className="text-[var(--accent)]">fit</span>
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Your spreadsheet, upgraded. Auto-track every session, see your
          consistency at a glance, and plan next week in seconds.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          What should we call you?
        </label>
        <input
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Your name"
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!draft.name.trim()}
        className="w-full rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
      >
        Get started
      </button>
    </div>
  );
}
