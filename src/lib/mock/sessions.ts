import type { LoggedSession, SportId, Intensity } from "@/lib/types";
import { SPORT_BY_ID } from "./sports";
import { addDays, toISODate, weekdayName, startOfWeek } from "@/lib/date";

// ─── Tiny seeded PRNG (mulberry32) ───────────────────────────────────
// Deterministic so the generated history is identical on every reload.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 20260531;
const HISTORY_DAYS = 287; // ~9.5 months

function pickIntensity(weights: [number, number, number], r: number): Intensity {
  const [e, m] = weights;
  if (r < e) return "easy";
  if (r < e + m) return "moderate";
  return "hard";
}

function jitter(base: number, pct: number, rnd: () => number): number {
  const delta = base * pct;
  return Math.round(base - delta + rnd() * delta * 2);
}

/**
 * Generate a realistic ~9-month session history ending at `today`.
 * Mirrors Martijn's habits (gym Mon–Thu, football Wed, runs Fri+Sun) with
 * realistic adherence, plus occasional ad-hoc tennis/padel and winter skiing.
 */
export function generateSessions(today: Date): LoggedSession[] {
  const rnd = mulberry32(SEED);
  const sessions: LoggedSession[] = [];
  const start = startOfWeek(addDays(today, -HISTORY_DAYS));

  let cursor = start;
  while (toISODate(cursor) <= toISODate(today)) {
    const iso = toISODate(cursor);
    const wd = weekdayName(cursor);
    const month = cursor.getMonth();

    const add = (sport: SportId, opts?: { intensity?: Intensity }) => {
      const cfg = SPORT_BY_ID[sport];
      const intensity = opts?.intensity ?? pickIntensity(cfg.intensityWeights, rnd());
      const duration = jitter(cfg.defaultDurationMin, 0.2, rnd);
      const session: LoggedSession = {
        id: `gen-${iso}-${sport}-${sessions.length}`,
        date: iso,
        sport,
        durationMinutes: duration,
        intensity,
        source: rnd() < 0.12 ? "manual" : "strava",
      };
      if (cfg.hasDistance) {
        // ~ duration / pace; easier = slower
        const pace = intensity === "hard" ? 4.8 : intensity === "moderate" ? 5.4 : 6.1;
        session.distanceKm = Math.round((duration / pace) * 10) / 10;
      }
      sessions.push(session);
    };

    // Gym: Mon–Thu mornings, ~72% adherence
    if (["monday", "tuesday", "wednesday", "thursday"].includes(wd) && rnd() < 0.72) {
      add("gym");
    }
    // Football: Wednesday evenings, ~85%
    if (wd === "wednesday" && rnd() < 0.85) add("football");
    // Running: Friday ~65%, Sunday ~62%, occasional other days
    if (wd === "friday" && rnd() < 0.65) add("running", { intensity: "easy" });
    if (wd === "sunday" && rnd() < 0.62) add("running");
    if (!["friday", "sunday"].includes(wd) && rnd() < 0.07) add("running", { intensity: "easy" });
    // Tennis: more likely on weekends
    if (rnd() < (wd === "saturday" || wd === "sunday" ? 0.16 : 0.05)) add("tennis");
    // Padel: occasional, weekday evenings
    if (rnd() < 0.045) add("padel");
    // Skiing: winter weekends only, as a treat
    if ([11, 0, 1, 2].includes(month) && (wd === "saturday" || wd === "sunday") && rnd() < 0.08) {
      add("skiing");
    }

    cursor = addDays(cursor, 1);
  }

  return sessions;
}

/** Earliest session date (for "Tracking since …"). */
export function trackingSince(sessions: LoggedSession[]): string {
  if (sessions.length === 0) return toISODate(new Date());
  return sessions.reduce((min, s) => (s.date < min ? s.date : min), sessions[0].date);
}
