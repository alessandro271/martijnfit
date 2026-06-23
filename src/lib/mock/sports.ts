import {
  Volleyball,
  CircleDot,
  CircleDashed,
  Footprints,
  Dumbbell,
  Snowflake,
  type LucideIcon,
} from "lucide-react";
import type { SportId, Intensity } from "@/lib/types";

export interface SportConfig {
  id: SportId;
  label: string;
  color: string; // hex (matches a --sport-* CSS var)
  colorVar: string; // e.g. "var(--sport-football)"
  icon: LucideIcon;
  defaultDurationMin: number;
  hasDistance: boolean;
  /** average sessions per week — drives the mock history generator */
  weeklyFreq: number;
  /** [easy, moderate, hard] intensity distribution */
  intensityWeights: [number, number, number];
  /** months (0–11) the sport happens in; undefined = all year */
  seasonMonths?: number[];
}

export const SPORTS: SportConfig[] = [
  {
    id: "football",
    label: "Football",
    color: "#22c55e",
    colorVar: "var(--sport-football)",
    icon: Volleyball,
    defaultDurationMin: 60,
    hasDistance: false,
    weeklyFreq: 1,
    intensityWeights: [0.1, 0.5, 0.4],
  },
  {
    id: "tennis",
    label: "Tennis",
    color: "#eab308",
    colorVar: "var(--sport-tennis)",
    icon: CircleDot,
    defaultDurationMin: 75,
    hasDistance: false,
    weeklyFreq: 0.8,
    intensityWeights: [0.2, 0.5, 0.3],
  },
  {
    id: "padel",
    label: "Padel",
    color: "#06b6d4",
    colorVar: "var(--sport-padel)",
    icon: CircleDashed,
    defaultDurationMin: 90,
    hasDistance: false,
    weeklyFreq: 0.5,
    intensityWeights: [0.3, 0.5, 0.2],
  },
  {
    id: "running",
    label: "Running",
    color: "#f97316",
    colorVar: "var(--sport-running)",
    icon: Footprints,
    defaultDurationMin: 40,
    hasDistance: true,
    weeklyFreq: 1.6,
    intensityWeights: [0.55, 0.3, 0.15],
  },
  {
    id: "gym",
    label: "Gym",
    color: "#a855f7",
    colorVar: "var(--sport-gym)",
    icon: Dumbbell,
    defaultDurationMin: 45,
    hasDistance: false,
    weeklyFreq: 3.4,
    intensityWeights: [0.25, 0.5, 0.25],
  },
  {
    id: "skiing",
    label: "Skiing",
    color: "#3b82f6",
    colorVar: "var(--sport-skiing)",
    icon: Snowflake,
    defaultDurationMin: 240,
    hasDistance: false,
    weeklyFreq: 0.4,
    intensityWeights: [0.2, 0.5, 0.3],
    seasonMonths: [0, 1, 2, 11], // Dec–Mar
  },
];

export const SPORT_BY_ID: Record<SportId, SportConfig> = Object.fromEntries(
  SPORTS.map((s) => [s.id, s])
) as Record<SportId, SportConfig>;

export const SPORT_IDS: SportId[] = SPORTS.map((s) => s.id);

export function sportColor(id: SportId): string {
  return SPORT_BY_ID[id].colorVar;
}

export const INTENSITY_LABEL: Record<Intensity, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Hard",
};
