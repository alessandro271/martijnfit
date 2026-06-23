import type { DeviceConnection } from "@/lib/types";

/**
 * Integrations. Strava is the active auto-sync source (also pulls in Garmin
 * activities); Google Calendar drives the planner (read-only). Everything else
 * is "Coming soon".
 */
export function defaultConnections(today: Date): DeviceConnection[] {
  const thisMorning = new Date(today.getTime() - 5 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: "strava",
      name: "Strava",
      active: true,
      connected: false,
      comingSoon: false,
      note: "Auto-imports your activities (incl. Garmin) from Strava.",
    },
    {
      id: "google_calendar",
      name: "Google Calendar",
      active: true,
      connected: true,
      comingSoon: false,
      lastSynced: thisMorning,
      note: "Read-only — used to plan around your meetings.",
    },
    { id: "apple_watch", name: "Apple Watch", active: false, connected: false, comingSoon: true },
    { id: "whoop", name: "WHOOP", active: false, connected: false, comingSoon: true },
    { id: "garmin", name: "Garmin", active: false, connected: false, comingSoon: true },
    { id: "polar", name: "Polar", active: false, connected: false, comingSoon: true },
    { id: "coros", name: "COROS", active: false, connected: false, comingSoon: true },
    { id: "fitbit", name: "Fitbit", active: false, connected: false, comingSoon: true },
    { id: "oura", name: "Oura", active: false, connected: false, comingSoon: true },
    { id: "suunto", name: "Suunto", active: false, connected: false, comingSoon: true },
  ];
}
