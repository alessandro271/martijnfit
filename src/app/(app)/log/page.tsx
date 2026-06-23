"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SessionList } from "@/components/log/session-list";
import { SessionForm } from "@/components/log/session-form";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { SPORTS } from "@/lib/mock/sports";
import type { LoggedSession, SportId, SessionSource } from "@/lib/types";
import { cn } from "@/lib/utils";

type SourceFilter = "all" | SessionSource;

export default function LogPage() {
  const store = useAppStore();
  const [sportFilter, setSportFilter] = useState<Set<SportId>>(new Set());
  const [source, setSource] = useState<SourceFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LoggedSession | null>(null);

  const filtered = useMemo(() => {
    return store.sessions.filter((s) => {
      if (sportFilter.size > 0 && !sportFilter.has(s.sport)) return false;
      if (source !== "all" && s.source !== source) return false;
      return true;
    });
  }, [store.sessions, sportFilter, source]);

  if (!store.hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-9 w-40 rounded-lg bg-white/5" />
        <div className="h-10 rounded-xl bg-white/5" />
        <div className="h-96 rounded-2xl bg-white/5" />
      </div>
    );
  }

  const toggleSport = (id: SportId) => {
    setSportFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            Session log
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {`${store.sessions.length} sessions logged — auto-synced & manual.`}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add session
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSportFilter(new Set())}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            sportFilter.size === 0
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
              : "border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-[var(--muted)]"
          )}
        >
          All sports
        </button>
        {SPORTS.map((s) => {
          const active = sportFilter.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggleSport(s.id)}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                active
                  ? {
                      borderColor: s.color,
                      backgroundColor: `color-mix(in srgb, ${s.color} 14%, transparent)`,
                      color: s.color,
                    }
                  : undefined
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className={active ? "" : "text-[var(--muted-foreground)]"}>
                {s.label}
              </span>
            </button>
          );
        })}
        <div className="ml-auto">
          <SegmentedToggle<SourceFilter>
            value={source}
            onChange={setSource}
            options={[
              { value: "all", label: "All" },
              { value: "strava", label: "Strava" },
              { value: "manual", label: "Manual" },
            ]}
          />
        </div>
      </div>

      <SessionList
        sessions={filtered}
        onEdit={(s) => {
          setEditing(s);
          setFormOpen(true);
        }}
      />

      <SessionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
      />
    </div>
  );
}
