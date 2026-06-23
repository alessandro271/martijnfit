import type { WeekDay } from "@/lib/mock/week-plan";
import { summarizeWeek } from "@/lib/mock/week-plan";

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="font-[family-name:var(--font-heading)] text-lg font-bold tabular-nums"
        style={{ color }}
      >
        {n}
      </span>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

export function WeekSummaryBar({ days }: { days: WeekDay[] }) {
  const { planned, confirmed, done } = summarizeWeek(days);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
      <Stat n={done} label="done" color="var(--success)" />
      <span className="h-4 w-px bg-[var(--card-border)]" />
      <Stat n={confirmed} label="confirmed" color="var(--accent)" />
      <span className="h-4 w-px bg-[var(--card-border)]" />
      <Stat n={planned} label="to review" color="var(--muted-foreground)" />
    </div>
  );
}
