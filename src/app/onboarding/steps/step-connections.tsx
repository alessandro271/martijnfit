"use client";

import type { StepProps } from "../wizard";
import { useAppStore } from "@/lib/store";
import { ConnectionsGrid } from "@/components/profile/connections-grid";

export function StepConnections({ onNext }: StepProps) {
  const store = useAppStore();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          Connect your tools
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Strava auto-imports every session so you never log by hand. Your
          calendar helps the coach plan around your week.
        </p>
      </div>

      <ConnectionsGrid devices={store.connections} />

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white transition-all hover:brightness-110"
      >
        Continue
      </button>
    </div>
  );
}
