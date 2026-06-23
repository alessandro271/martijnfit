import type { SupabaseClient } from "@supabase/supabase-js";
import { stravaToSport, intensityFromStrava } from "@/lib/integrations/sport-map";
import { SPORT_BY_ID } from "@/lib/mock/sports";

/**
 * Strava integration helpers (server-only — called from route handlers).
 *
 * provider_tokens has NO client RLS policies, so these MUST be called with the
 * admin (service-role) Supabase client. Never import this into a Client Component.
 */

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

interface TokenRow {
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
  scope: string | null;
  athlete_id: string | null;
}

interface StravaActivity {
  id: number;
  name?: string;
  type?: string;
  sport_type?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  start_date?: string;
  start_date_local?: string;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
}

/**
 * Read the user's Strava token; refresh it if it is expired (or within 60s of
 * expiry) and persist the new token. Returns a valid access_token, or null if
 * the user has no stored Strava token / refresh fails.
 */
export async function getValidStravaToken(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from("provider_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .maybeSingle();

  if (error || !data) return null;
  const row = data as TokenRow;

  const expiresAtMs = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  const stillValid = expiresAtMs > Date.now() + 60_000;
  if (stillValid && row.access_token) return row.access_token;

  // Token expired (or about to) — refresh it.
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret || !row.refresh_token) {
    // Can't refresh; fall back to whatever we have (may be stale).
    return row.access_token ?? null;
  }

  try {
    const res = await globalThis.fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: row.refresh_token,
      }),
    });
    if (!res.ok) return row.access_token ?? null;

    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
    if (!json.access_token) return row.access_token ?? null;

    await admin
      .from("provider_tokens")
      .update({
        access_token: json.access_token,
        refresh_token: json.refresh_token ?? row.refresh_token,
        expires_at: json.expires_at
          ? new Date(json.expires_at * 1000).toISOString()
          : row.expires_at,
      })
      .eq("user_id", userId)
      .eq("provider", "strava");

    return json.access_token;
  } catch {
    return row.access_token ?? null;
  }
}

/**
 * Fetch the user's recent Strava activities, map them to our sessions, and
 * upsert them (merge on user_id,external_id). Also bumps connections.last_synced
 * and pulls profiles.tracking_since back to the earliest imported activity.
 * Returns the number of sessions imported/updated.
 */
export async function syncStravaActivities(
  admin: SupabaseClient,
  userId: string
): Promise<number> {
  const token = await getValidStravaToken(admin, userId);
  if (!token) return 0;

  const PER_PAGE = 200;
  const MAX_PAGES = 4;
  const rows: Record<string, unknown>[] = [];
  let minDate: string | null = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    let activities: StravaActivity[];
    try {
      const res = await globalThis.fetch(
        `${STRAVA_ACTIVITIES_URL}?per_page=${PER_PAGE}&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) break;
      activities = (await res.json()) as StravaActivity[];
    } catch {
      break;
    }

    if (!Array.isArray(activities) || activities.length === 0) break;

    for (const a of activities) {
      const sport = stravaToSport(a.sport_type ?? a.type ?? "");
      if (!sport) continue;

      const date = (a.start_date_local || a.start_date || "").slice(0, 10);
      if (!date) continue;
      if (minDate === null || date < minDate) minDate = date;

      const hasDistance = SPORT_BY_ID[sport].hasDistance;
      const distanceKm =
        hasDistance && a.distance ? Math.round(a.distance / 100) / 10 : null;

      rows.push({
        user_id: userId,
        external_id: String(a.id),
        date,
        sport,
        duration_minutes: Math.round((a.moving_time || a.elapsed_time || 0) / 60),
        distance_km: distanceKm,
        intensity: intensityFromStrava(a),
        source: "strava",
        notes: a.name ?? null,
      });
    }

    // Fewer than a full page means we've reached the end of the history window.
    if (activities.length < PER_PAGE) break;
  }

  if (rows.length > 0) {
    await admin
      .from("sessions")
      .upsert(rows, { onConflict: "user_id,external_id", ignoreDuplicates: false });
  }

  // Mark the connection as freshly synced.
  await admin
    .from("connections")
    .update({ last_synced: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "strava");

  // Pull tracking_since back to the earliest imported activity, if earlier.
  if (minDate) {
    const { data: prof } = await admin
      .from("profiles")
      .select("tracking_since")
      .eq("id", userId)
      .maybeSingle();
    const existing = (prof as { tracking_since: string | null } | null)?.tracking_since;
    const earliest = existing && existing < minDate ? existing : minDate;
    if (earliest !== existing) {
      await admin.from("profiles").update({ tracking_since: earliest }).eq("id", userId);
    }
  }

  return rows.length;
}
