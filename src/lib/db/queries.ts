import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LoggedSession,
  RecurringHabit,
  PlanItem,
  PlanStatus,
  Profile,
  SportId,
  SessionSource,
  Intensity,
  Weekday,
} from "@/lib/types";

// ─── Row shapes (snake_case as stored in Postgres) ───────────────────
interface SessionRow {
  id: string;
  date: string;
  sport: string;
  duration_minutes: number;
  source: string;
  intensity: string | null;
  distance_km: number | null;
  notes: string | null;
  edited: boolean;
  external_id: string | null;
}
interface HabitRow {
  id: string;
  sport: string;
  days: string[];
  start_time: string;
  end_time: string;
  label: string;
}
interface AdHocRow {
  id: string;
  date: string;
  sport: string;
  start_time: string;
  end_time: string;
  label: string;
  status: string;
  origin: string;
}
interface OverrideRow {
  item_id: string;
  status: string;
}
interface ConnectionRow {
  provider: string;
  connected: boolean;
  last_synced: string | null;
}
interface ProfileRow {
  id: string;
  name: string;
  sports: string[];
  tracking_since: string | null;
  onboarded: boolean;
}

// ─── Mappers (row → app type) ────────────────────────────────────────
export function rowToSession(r: SessionRow): LoggedSession {
  return {
    id: r.id,
    date: r.date,
    sport: r.sport as SportId,
    durationMinutes: r.duration_minutes,
    source: r.source as SessionSource,
    intensity: (r.intensity as Intensity) ?? undefined,
    distanceKm: r.distance_km ?? undefined,
    notes: r.notes ?? undefined,
    edited: r.edited,
    externalId: r.external_id ?? undefined,
  };
}
function rowToHabit(r: HabitRow): RecurringHabit {
  return {
    id: r.id,
    sport: r.sport as SportId,
    days: r.days as Weekday[],
    startTime: r.start_time,
    endTime: r.end_time,
    label: r.label,
  };
}
function rowToAdHoc(r: AdHocRow): PlanItem {
  return {
    id: r.id,
    date: r.date,
    sport: r.sport as SportId,
    startTime: r.start_time,
    endTime: r.end_time,
    label: r.label,
    status: r.status as PlanStatus,
    origin: "adhoc",
  };
}

export interface UserData {
  profile: Profile;
  sessions: LoggedSession[];
  habits: RecurringHabit[];
  adHoc: PlanItem[];
  overrides: Record<string, PlanStatus>;
  connections: Record<string, { connected: boolean; lastSynced?: string }>;
}

/** Load everything for the signed-in user in parallel (RLS scopes to them). */
export async function loadUserData(supabase: SupabaseClient): Promise<UserData> {
  const [profileRes, sessionsRes, habitsRes, adHocRes, overridesRes, connRes] =
    await Promise.all([
      supabase.from("profiles").select("*").single(),
      supabase.from("sessions").select("*"),
      supabase.from("habits").select("*"),
      supabase.from("ad_hoc_items").select("*"),
      supabase.from("plan_overrides").select("*"),
      supabase.from("connections").select("*"),
    ]);

  const p = (profileRes.data ?? null) as ProfileRow | null;
  const profile: Profile = {
    name: p?.name ?? "Athlete",
    sports: (p?.sports as SportId[]) ?? [],
    trackingSince: p?.tracking_since ?? "",
    onboarded: p?.onboarded ?? false,
  };

  const overrides: Record<string, PlanStatus> = {};
  for (const o of (overridesRes.data ?? []) as OverrideRow[]) {
    overrides[o.item_id] = o.status as PlanStatus;
  }
  const connections: Record<string, { connected: boolean; lastSynced?: string }> = {};
  for (const c of (connRes.data ?? []) as ConnectionRow[]) {
    connections[c.provider] = {
      connected: c.connected,
      lastSynced: c.last_synced ?? undefined,
    };
  }

  return {
    profile,
    sessions: ((sessionsRes.data ?? []) as SessionRow[]).map(rowToSession),
    habits: ((habitsRes.data ?? []) as HabitRow[]).map(rowToHabit),
    adHoc: ((adHocRes.data ?? []) as AdHocRow[]).map(rowToAdHoc),
    overrides,
    connections,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────
export async function insertSession(
  supabase: SupabaseClient,
  s: Omit<LoggedSession, "id">
): Promise<LoggedSession | null> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      date: s.date,
      sport: s.sport,
      duration_minutes: s.durationMinutes,
      source: s.source,
      intensity: s.intensity ?? null,
      distance_km: s.distanceKm ?? null,
      notes: s.notes ?? null,
      edited: s.edited ?? false,
      external_id: s.externalId ?? null,
    })
    .select()
    .single();
  if (error || !data) return null;
  return rowToSession(data as SessionRow);
}

export async function updateSessionRow(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<LoggedSession>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.sport !== undefined) row.sport = patch.sport;
  if (patch.durationMinutes !== undefined) row.duration_minutes = patch.durationMinutes;
  if (patch.source !== undefined) row.source = patch.source;
  if (patch.intensity !== undefined) row.intensity = patch.intensity;
  if (patch.distanceKm !== undefined) row.distance_km = patch.distanceKm ?? null;
  if (patch.notes !== undefined) row.notes = patch.notes ?? null;
  if (patch.edited !== undefined) row.edited = patch.edited;
  await supabase.from("sessions").update(row).eq("id", id);
}

export async function deleteSessionRow(supabase: SupabaseClient, id: string) {
  await supabase.from("sessions").delete().eq("id", id);
}

/** Replace the user's full habit list (used by onboarding). */
export async function replaceHabits(
  supabase: SupabaseClient,
  userId: string,
  habits: RecurringHabit[]
): Promise<RecurringHabit[]> {
  await supabase.from("habits").delete().eq("user_id", userId);
  if (habits.length === 0) return [];
  const { data } = await supabase
    .from("habits")
    .insert(
      habits.map((h) => ({
        user_id: userId,
        sport: h.sport,
        days: h.days,
        start_time: h.startTime,
        end_time: h.endTime,
        label: h.label,
      }))
    )
    .select();
  return ((data ?? []) as HabitRow[]).map(rowToHabit);
}

export async function upsertOverride(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  status: PlanStatus
) {
  await supabase
    .from("plan_overrides")
    .upsert({ user_id: userId, item_id: itemId, status }, { onConflict: "user_id,item_id" });
}

export async function insertAdHoc(
  supabase: SupabaseClient,
  item: { date: string; sport: SportId; startTime: string; endTime: string; label: string }
): Promise<PlanItem | null> {
  const { data } = await supabase
    .from("ad_hoc_items")
    .insert({
      date: item.date,
      sport: item.sport,
      start_time: item.startTime,
      end_time: item.endTime,
      label: item.label,
      status: "confirmed",
      origin: "adhoc",
    })
    .select()
    .single();
  return data ? rowToAdHoc(data as AdHocRow) : null;
}

export async function deleteAdHoc(supabase: SupabaseClient, id: string) {
  await supabase.from("ad_hoc_items").delete().eq("id", id);
}

export async function updateAdHocDate(supabase: SupabaseClient, id: string, date: string) {
  await supabase.from("ad_hoc_items").update({ date }).eq("id", id);
}

export async function updateProfile(
  supabase: SupabaseClient,
  patch: { name?: string; sports?: SportId[]; onboarded?: boolean; trackingSince?: string }
) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.sports !== undefined) row.sports = patch.sports;
  if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
  if (patch.trackingSince !== undefined) row.tracking_since = patch.trackingSince;
  const { data: u } = await supabase.auth.getUser();
  if (u.user) await supabase.from("profiles").update(row).eq("id", u.user.id);
}
