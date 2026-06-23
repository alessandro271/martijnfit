"use client";

import { useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { DeviceConnection } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  strava: Activity,
  google_calendar: CalendarDays,
};

function syncedLabel(iso?: string, now?: Date): string {
  if (!iso || !now) return "";
  const diffH = Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.round(diffH / 24)}d ago`;
}

function DeviceCard({ device }: { device: DeviceConnection }) {
  const store = useAppStore();
  const [notified, setNotified] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [working, setWorking] = useState(false);
  const Icon = ICONS[device.id];

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/strava/sync", { method: "POST" });
      await store.reload();
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setWorking(true);
    try {
      await fetch("/api/strava/disconnect", { method: "POST" });
      await store.reload();
    } finally {
      setWorking(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 transition-colors",
        device.connected
          ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
          : "border-[var(--card-border)] bg-[var(--card)]"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
            device.connected
              ? "bg-[var(--accent)]/15 text-[var(--accent)]"
              : "bg-white/5 text-[var(--muted-foreground)]"
          )}
        >
          {Icon ? <Icon className="h-5 w-5" /> : device.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{device.name}</p>
          {device.connected && (
            <p className="text-[11px] text-[var(--success)]">
              Connected
              {device.lastSynced
                ? ` · synced ${syncedLabel(device.lastSynced, store.today)}`
                : ""}
            </p>
          )}
          {device.comingSoon && (
            <p className="text-[11px] text-[var(--muted)]">Coming soon</p>
          )}
        </div>
      </div>

      {device.note && (
        <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
          {device.note}
        </p>
      )}

      {/* Strava — real OAuth + sync */}
      {device.id === "strava" && device.active && (
        <div className="mt-auto flex flex-col gap-2">
          {device.connected ? (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110 disabled:opacity-60"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", syncing && "animate-spin")}
                />
                {syncing ? "Syncing…" : "Sync now"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={working}
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-white/5 disabled:opacity-60"
              >
                {working ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                window.location.href = "/api/strava/connect";
              }}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-110"
            >
              Connect
            </button>
          )}
        </div>
      )}

      {/* Google Calendar — granted at sign-in */}
      {device.id === "google_calendar" && device.active && (
        <div className="mt-auto">
          {device.connected ? (
            <button
              disabled
              className="w-full cursor-default rounded-lg border border-[var(--accent)]/30 px-3 py-1.5 text-xs font-semibold text-[var(--accent)]"
            >
              Connected
            </button>
          ) : (
            <a
              href="/login"
              className="block rounded-lg bg-[var(--accent)] px-3 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:brightness-110"
            >
              Connect
            </a>
          )}
        </div>
      )}

      {device.comingSoon && (
        <button
          onClick={() => setNotified((n) => !n)}
          className={cn(
            "mt-auto flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            notified
              ? "border-[var(--accent)]/30 text-[var(--accent)]"
              : "border-[var(--card-border)] text-[var(--muted-foreground)] hover:bg-white/5"
          )}
        >
          {notified ? (
            <>
              <Check className="h-3.5 w-3.5" /> We&rsquo;ll let you know
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> Notify me
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function ConnectionsGrid({ devices }: { devices: DeviceConnection[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {devices.map((d) => (
        <DeviceCard key={d.id} device={d} />
      ))}
    </div>
  );
}
