import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

interface DayBusy {
  busyHint?: string;
}

/** Current week's Monday as YYYY-MM-DD (local components). */
function currentMonday(): string {
  const d = new Date();
  // Monday-based index: Mon=0 … Sun=6
  const mondayIdx = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayIdx);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD validity check; falls back to the current Monday otherwise. */
function normalizeWeekStart(raw: string | null): string {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return currentMonday();
}

/** Weekday key from a YYYY-MM-DD string (parsed at UTC noon to avoid TZ drift). */
function weekdayKeyFromISO(iso: string): Weekday {
  const d = new Date(`${iso}T12:00:00Z`);
  return WEEKDAYS[d.getUTCDay()];
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const weekStart = normalizeWeekStart(
    new URL(request.url).searchParams.get("weekStart")
  );

  try {
    const admin = createAdminClient();
    const { data: tokenRow } = await admin
      .from("provider_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", user.id)
      .eq("provider", "google_calendar")
      .maybeSingle();

    if (!tokenRow) {
      // No Google Calendar connection — planner falls back to mock hints.
      return Response.json({ days: {} });
    }

    let accessToken: string = tokenRow.access_token;

    // Refresh if expired or expiring within 60s.
    const expiresAtMs = tokenRow.expires_at
      ? new Date(tokenRow.expires_at).getTime()
      : 0;
    if (expiresAtMs <= Date.now() + 60_000) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret || !tokenRow.refresh_token) {
        return Response.json({ days: {} });
      }

      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenRow.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      if (!refreshRes.ok) {
        return Response.json({ days: {} });
      }
      const refreshed = (await refreshRes.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      if (!refreshed.access_token) {
        return Response.json({ days: {} });
      }
      accessToken = refreshed.access_token;
      const newExpiry = new Date(
        Date.now() + (refreshed.expires_in ?? 3600) * 1000
      ).toISOString();
      await admin
        .from("provider_tokens")
        .update({ access_token: accessToken, expires_at: newExpiry })
        .eq("user_id", user.id)
        .eq("provider", "google_calendar");
    }

    // Fetch the week's events.
    const timeMin = `${weekStart}T00:00:00Z`;
    const endDate = new Date(`${weekStart}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
    const timeMax = endDate.toISOString();

    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin,
      timeMax,
      maxResults: "100",
    });
    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!eventsRes.ok) {
      return Response.json({ days: {} });
    }
    const eventsJson = (await eventsRes.json()) as {
      items?: Array<{
        start?: { dateTime?: string; date?: string };
      }>;
    };
    const items = eventsJson.items ?? [];

    // Aggregate per weekday: count timed events + earliest..latest hour.
    const agg: Record<
      string,
      { count: number; earliest: number; latest: number }
    > = {};

    for (const ev of items) {
      const dateTime = ev.start?.dateTime;
      // Skip all-day events (only have .date, no .dateTime).
      if (!dateTime) continue;
      const start = new Date(dateTime);
      if (Number.isNaN(start.getTime())) continue;
      // Local weekday/hour of the event start.
      const iso = `${start.getFullYear()}-${String(
        start.getMonth() + 1
      ).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      const weekday = weekdayKeyFromISO(iso);
      const hour = start.getHours();
      const cur = agg[weekday] ?? {
        count: 0,
        earliest: hour,
        latest: hour,
      };
      cur.count += 1;
      cur.earliest = Math.min(cur.earliest, hour);
      cur.latest = Math.max(cur.latest, hour);
      agg[weekday] = cur;
    }

    const days: Record<string, DayBusy> = {};
    for (const [weekday, info] of Object.entries(agg)) {
      const label = info.count === 1 ? "meeting" : "meetings";
      const range = `${info.earliest}:00–${info.latest}:00`;
      days[weekday] = { busyHint: `${info.count} ${label} · ${range}` };
    }

    return Response.json({ days });
  } catch {
    return Response.json({ days: {} });
  }
}
