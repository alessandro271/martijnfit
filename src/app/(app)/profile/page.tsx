"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plug,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Clock,
  LogOut,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import { WEEKDAY_LABELS, formatMonthYear, formatDuration } from "@/lib/date";
import { totalMinutes } from "@/lib/selectors";

export default function ProfilePage() {
  const store = useAppStore();
  const router = useRouter();

  if (!store.hydrated) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  }

  const connectedCount = store.connections.filter((c) => c.connected).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/15 font-[family-name:var(--font-heading)] text-2xl font-bold text-[var(--accent)]">
          {store.profile.name.slice(0, 1)}
        </div>
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-bold">
            {store.profile.name}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tracking since {formatMonthYear(store.profile.trackingSince)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <Clock className="h-3.5 w-3.5" />
            {store.sessions.length} sessions ·{" "}
            {Math.round(totalMinutes(store.sessions) / 60)} h all-time
          </p>
        </div>
      </div>

      {/* Sports */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          My sports
        </h2>
        <div className="flex flex-wrap gap-2">
          {store.profile.sports.map((id) => {
            const cfg = SPORT_BY_ID[id];
            const Icon = cfg.icon;
            return (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
                style={{
                  backgroundColor: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
                  color: cfg.color,
                }}
              >
                <Icon className="h-4 w-4" />
                {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Habits */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Recurring habits
        </h2>
        <div className="space-y-2">
          {store.habits.map((h) => {
            const cfg = SPORT_BY_ID[h.sport];
            const Icon = cfg.icon;
            return (
              <div key={h.id} className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" style={{ color: cfg.colorVar }} />
                <span className="flex-1 text-sm">{h.label}</span>
                <span className="text-xs text-[var(--muted)]">
                  {h.days.map((d) => WEEKDAY_LABELS[d]).join(", ")} · {h.startTime}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connections link */}
      <Link
        href="/profile/connections"
        className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 transition-colors hover:border-[var(--muted)]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
          <Plug className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Connections</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {connectedCount} connected · Strava, Google Calendar
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
      </Link>

      {/* Account controls */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {store.signedIn ? "Account" : "Demo"}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => router.push("/onboarding")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            <Sparkles className="h-4 w-4" />
            Replay onboarding
          </button>
          {store.signedIn ? (
            <button
              onClick={() => {
                void store.signOut();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm("Reset all demo data to a fresh seeded history?")) {
                  store.resetDemo();
                }
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-white/5"
            >
              <RefreshCw className="h-4 w-4" />
              Reset demo data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
