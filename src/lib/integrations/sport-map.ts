import type { SportId, Intensity } from "@/lib/types";

/**
 * Map a Strava activity type (sport_type or legacy type) to one of our 6 sports.
 * Returns null for activities outside Martijn's tracked sports (skipped on import).
 */
export function stravaToSport(stravaType: string): SportId | null {
  switch (stravaType) {
    case "Run":
    case "TrailRun":
    case "VirtualRun":
      return "running";
    case "Soccer":
    case "Football": // (American football is rare; treat as soccer for our set)
      return "football";
    case "Tennis":
      return "tennis";
    case "Padel":
    case "Pickleball":
    case "Racquetball":
    case "Squash":
    case "Badminton":
      return "padel"; // court racquet sports grouped under padel
    case "WeightTraining":
    case "Workout":
    case "Crossfit":
    case "HighIntensityIntervalTraining":
    case "Elliptical":
    case "StairStepper":
      return "gym";
    case "AlpineSki":
    case "BackcountrySki":
    case "NordicSki":
    case "Snowboard":
      return "skiing";
    default:
      return null;
  }
}

/** Estimate intensity from Strava's relative effort / heart-rate / pace signals. */
export function intensityFromStrava(a: {
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
}): Intensity {
  if (typeof a.suffer_score === "number") {
    if (a.suffer_score >= 100) return "hard";
    if (a.suffer_score >= 40) return "moderate";
    return "easy";
  }
  if (typeof a.average_heartrate === "number") {
    if (a.average_heartrate >= 155) return "hard";
    if (a.average_heartrate >= 130) return "moderate";
    return "easy";
  }
  return "moderate";
}
