import type { PlanStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<PlanStatus, { label: string; cls: string }> = {
  planned: { label: "Planned", cls: "bg-white/5 text-[var(--muted-foreground)]" },
  confirmed: { label: "Confirmed", cls: "bg-[var(--accent)]/15 text-[var(--accent)]" },
  skipped: { label: "Skipped", cls: "bg-white/5 text-[var(--muted)]" },
  done: { label: "Done", cls: "bg-[var(--success)]/15 text-[var(--success)]" },
  missed: { label: "Missed", cls: "bg-[var(--destructive)]/10 text-[var(--destructive)]" },
};

export function StatusPill({
  status,
  className,
}: {
  status: PlanStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        s.cls,
        className
      )}
    >
      {s.label}
    </span>
  );
}
