"use client";

import { Check, X, RotateCcw, Watch } from "lucide-react";
import type { PlanItem, LoggedSession } from "@/lib/types";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDuration } from "@/lib/date";
import { cn } from "@/lib/utils";

export function PlannedItemCard({
  item,
  loggedSession,
  onConfirm,
  onSkip,
  onRestore,
}: {
  item: PlanItem;
  loggedSession?: LoggedSession;
  onConfirm: (i: PlanItem) => void;
  onSkip: (i: PlanItem) => void;
  onRestore: (i: PlanItem) => void;
}) {
  const cfg = SPORT_BY_ID[item.sport];
  const Icon = cfg.icon;
  const { status } = item;
  const muted = status === "missed" || status === "skipped";

  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 transition-colors",
        status === "done" && "border-[var(--success)]/25 bg-[var(--success)]/5",
        status === "confirmed" && "border-[var(--accent)]/30 bg-[var(--accent)]/5",
        status === "planned" && "border-[var(--card-border)] bg-[var(--card-elevated)]",
        muted && "border-[var(--card-border)] opacity-60"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.colorVar }} />
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-xs font-semibold",
            muted && "line-through"
          )}
        >
          {cfg.label}
        </p>
      </div>
      <p className="mt-0.5 text-[10px] text-[var(--muted)]">
        {item.startTime ? `${item.startTime}–${item.endTime}` : "logged"}
        {item.origin === "adhoc" && item.label.includes("ad-hoc")
          ? " · ad-hoc"
          : ""}
      </p>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        <StatusPill status={status} />
        {status === "done" && loggedSession && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--success)]">
            <Watch className="h-3 w-3" />
            {formatDuration(loggedSession.durationMinutes)}
          </span>
        )}
      </div>

      {status === "planned" && (
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={() => onConfirm(item)}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--accent)] px-2 py-1 text-[11px] font-semibold text-white transition-all hover:brightness-110"
          >
            <Check className="h-3 w-3" />
            Confirm
          </button>
          <button
            onClick={() => onSkip(item)}
            className="flex items-center justify-center rounded-lg border border-[var(--card-border)] px-2 py-1 text-[11px] text-[var(--muted-foreground)] transition-colors hover:bg-white/5"
            aria-label="Skip"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {status === "confirmed" && (
        <button
          onClick={() => onSkip(item)}
          className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <X className="h-3 w-3" />
          Skip this week
        </button>
      )}

      {status === "skipped" && (
        <button
          onClick={() => onRestore(item)}
          className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <RotateCcw className="h-3 w-3" />
          Restore
        </button>
      )}
    </div>
  );
}
