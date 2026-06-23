import { Flame, CalendarRange, CalendarDays, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { LoggedSession } from "@/lib/types";
import {
  countThisWeek,
  countThisMonth,
  countThisYear,
  currentStreakWeeks,
  longestStreakWeeks,
  sessionsInRange,
  totalMinutes,
} from "@/lib/selectors";
import { toISODate, startOfWeek, addDays } from "@/lib/date";

export function HeroStats({
  sessions,
  today,
  plannedThisWeek,
}: {
  sessions: LoggedSession[];
  today: Date;
  plannedThisWeek: number;
}) {
  const week = countThisWeek(sessions, today);
  const month = countThisMonth(sessions, today);
  const year = countThisYear(sessions, today);
  const streak = currentStreakWeeks(sessions, today);
  const longest = longestStreakWeeks(sessions);

  const monthKey = toISODate(today).slice(0, 7);
  const monthSessions = sessions.filter((s) => s.date.slice(0, 7) === monthKey);
  const monthHours = Math.round(totalMinutes(monthSessions) / 60);

  const yearSessions = sessions.filter(
    (s) => s.date.slice(0, 4) === toISODate(today).slice(0, 4)
  );
  const sportsThisYear = new Set(yearSessions.map((s) => s.sport)).size;

  const weekStart = toISODate(startOfWeek(today));
  const weekEnd = toISODate(addDays(startOfWeek(today), 6));
  void sessionsInRange(sessions, weekStart, weekEnd); // (week count already computed)

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="This week"
        value={week}
        sub={`of ${plannedThisWeek} planned`}
        icon={CalendarRange}
        tint="var(--accent)"
      />
      <StatCard
        label="This month"
        value={month}
        sub={`${monthHours} h of training`}
        icon={CalendarDays}
        tint="var(--sport-running)"
      />
      <StatCard
        label="This year"
        value={year}
        sub={`across ${sportsThisYear} sports`}
        icon={TrendingUp}
        tint="var(--sport-padel)"
      />
      <StatCard
        label="Current streak"
        value={`${streak}w`}
        sub={`longest: ${longest}w`}
        icon={Flame}
        tint="#f59e0b"
      />
    </div>
  );
}
