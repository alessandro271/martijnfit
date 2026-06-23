"use client";

import { useState } from "react";
import { Plus, Watch } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { HeroStats } from "@/components/tracker/hero-stats";
import { ConsistencyHeatmap } from "@/components/tracker/consistency-heatmap";
import { SportBreakdown } from "@/components/tracker/sport-breakdown";
import { RecentSessions } from "@/components/tracker/recent-sessions";
import { SessionForm } from "@/components/log/session-form";
import type { LoggedSession } from "@/lib/types";
import { startOfWeek, formatMonthYear } from "@/lib/date";

export default function TrackerPage() {
  const store = useAppStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LoggedSession | null>(null);

  if (!store.hydrated) return <TrackerSkeleton />;

  const week = store.getWeekPlan(startOfWeek(store.today));
  const plannedThisWeek = week
    .flatMap((d) => d.items)
    .filter((i) => i.startTime !== "").length;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: LoggedSession) => {
    setEditing(s);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            {store.profile.name}&rsquo;s training
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Tracking since {formatMonthYear(store.profile.trackingSince)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] sm:flex">
            <Watch className="h-3.5 w-3.5 text-[var(--accent)]" />
            Strava · synced 2h ago
          </span>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add session
          </button>
        </div>
      </div>

      <HeroStats
        sessions={store.sessions}
        today={store.today}
        plannedThisWeek={plannedThisWeek}
      />

      <ConsistencyHeatmap sessions={store.sessions} today={store.today} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SportBreakdown sessions={store.sessions} today={store.today} />
        <RecentSessions
          sessions={store.sessions}
          today={store.today}
          onEdit={openEdit}
        />
      </div>

      <SessionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />
    </div>
  );
}

function TrackerSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-56 rounded-lg bg-white/5" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-white/5" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-white/5" />
        <div className="h-64 rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}
