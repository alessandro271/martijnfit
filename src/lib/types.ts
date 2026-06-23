// ─── Core domain types for Martijnfit ────────────────────────────────

export type SportId =
  | "football"
  | "tennis"
  | "padel"
  | "running"
  | "gym"
  | "skiing";

export type Intensity = "easy" | "moderate" | "hard";

export type SessionSource = "strava" | "manual";

/** A completed session — the "row" that replaces Martijn's Excel sheet. */
export interface LoggedSession {
  id: string;
  date: string; // ISO date "YYYY-MM-DD"
  sport: SportId;
  durationMinutes: number;
  source: SessionSource;
  intensity?: Intensity;
  distanceKm?: number; // running only
  notes?: string;
  /** true when a synced session was adjusted manually */
  edited?: boolean;
  /** external provider id (e.g. Strava activity id) for dedup */
  externalId?: string;
}

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** A recurring habit (e.g. football every Wed 20:00–21:00). */
export interface RecurringHabit {
  id: string;
  sport: SportId;
  days: Weekday[];
  startTime: string; // "20:00"
  endTime: string; // "21:00"
  label: string;
}

export type PlanStatus =
  | "planned" // expanded from a habit / added, not yet acted on
  | "confirmed" // Martijn confirmed it for the week
  | "skipped" // Martijn skipped it this week
  | "done" // reconciled against a real logged session
  | "missed"; // a past planned item with no matching session

export type PlanOrigin = "habit" | "adhoc";

/** A single planned slot on the weekly board. */
export interface PlanItem {
  id: string;
  date: string; // ISO date
  sport: SportId;
  startTime: string;
  endTime: string;
  label: string;
  status: PlanStatus;
  origin: PlanOrigin;
  habitId?: string;
  loggedSessionId?: string; // set when reconciled to a session
}

/** Mocked calendar context shown on a day card. */
export interface DayContext {
  busyHint?: string; // "Meetings 9–11"
  note?: string; // "WFH — good for a morning run"
}

export interface Profile {
  name: string;
  sports: SportId[];
  trackingSince: string; // ISO date of first session
  onboarded: boolean;
}

export interface DeviceConnection {
  id: string;
  name: string;
  active: boolean; // a real integration exists
  connected: boolean; // the user has connected it
  comingSoon: boolean;
  lastSynced?: string; // ISO datetime
  note?: string;
}
