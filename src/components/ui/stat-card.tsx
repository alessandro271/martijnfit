import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint = "var(--accent)",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  tint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 lg:p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-heading)] text-3xl font-bold tabular-nums leading-none">
            {value}
          </p>
          {sub && (
            <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">{sub}</p>
          )}
        </div>
        {Icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, ${tint} 15%, transparent)`,
              color: tint,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
