import { SPORT_BY_ID } from "@/lib/mock/sports";
import type { SportId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SportDot({
  sport,
  className,
}: {
  sport: SportId;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: SPORT_BY_ID[sport].colorVar }}
    />
  );
}

/** Rounded tinted square with the sport icon (avatar style). */
export function SportIcon({
  sport,
  size = 40,
  className,
}: {
  sport: SportId;
  size?: number;
  className?: string;
}) {
  const cfg = SPORT_BY_ID[sport];
  const Icon = cfg.icon;
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-xl", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: `color-mix(in srgb, ${cfg.color} 18%, transparent)`,
        color: cfg.color,
      }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}

/** Compact tinted pill: icon + label. */
export function SportBadge({
  sport,
  withIcon = true,
  className,
}: {
  sport: SportId;
  withIcon?: boolean;
  className?: string;
}) {
  const cfg = SPORT_BY_ID[sport];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
        color: cfg.color,
      }}
    >
      {withIcon && <Icon className="h-3.5 w-3.5" />}
      {cfg.label}
    </span>
  );
}
