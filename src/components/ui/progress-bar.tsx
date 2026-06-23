import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  color = "var(--accent)",
  className,
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-white/5",
        className
      )}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
