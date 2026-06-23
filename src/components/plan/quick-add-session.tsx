"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SportSelect } from "@/components/ui/sport-select";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import type { SportId } from "@/lib/types";

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function QuickAddSession({ date }: { date: string }) {
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState<SportId | null>(null);
  const [time, setTime] = useState("18:00");

  const reset = () => {
    setOpen(false);
    setSport(null);
    setTime("18:00");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--card-border)] py-1.5 text-[10px] text-[var(--muted)] transition-colors hover:border-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <Plus className="h-3 w-3" />
        Add
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-elevated)] p-2">
      <SportSelect value={sport} onChange={setSport} placeholder="Sport" />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
      />
      <div className="flex gap-1.5">
        <button
          disabled={!sport}
          onClick={() => {
            if (!sport) return;
            const cfg = SPORT_BY_ID[sport];
            store.addAdHoc({
              date,
              sport,
              startTime: time,
              endTime: addMinutes(time, cfg.defaultDurationMin),
              label: `${cfg.label} (ad-hoc)`,
            });
            reset();
          }}
          className="flex-1 rounded-lg bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
        >
          Add
        </button>
        <button
          onClick={reset}
          className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-[11px] text-[var(--muted-foreground)] transition-colors hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
