"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type BusyDays = Record<string, { busyHint?: string }>;

/**
 * Fetch real Google Calendar busy hints for a week, keyed by weekday name
 * ("monday".."sunday"). Returns {} until loaded, on error, or when Supabase
 * is not configured (the planner then falls back to mock hints).
 */
export function useCalendarBusy(weekStartISO: string): BusyDays {
  const [days, setDays] = useState<BusyDays>({});

  useEffect(() => {
    if (!isSupabaseConfigured || !weekStartISO) {
      setDays({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/calendar/busy?weekStart=${encodeURIComponent(weekStartISO)}`
        );
        if (!res.ok) return;
        const json = (await res.json()) as { days?: BusyDays };
        if (!cancelled && json?.days) {
          setDays(json.days);
        }
      } catch {
        // Ignore — planner keeps its mock hints.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [weekStartISO]);

  return days;
}
