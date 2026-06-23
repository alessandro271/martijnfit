"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Watch } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { SportSelect } from "@/components/ui/sport-select";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { SPORT_BY_ID } from "@/lib/mock/sports";
import type { LoggedSession, SportId, Intensity } from "@/lib/types";
import { toISODate } from "@/lib/date";

const DURATION_CHIPS = [30, 45, 60, 75, 90];

export function SessionForm({
  open,
  onClose,
  editing,
  defaultDate,
  defaultSport,
}: {
  open: boolean;
  onClose: () => void;
  editing?: LoggedSession | null;
  defaultDate?: string;
  defaultSport?: SportId;
}) {
  const store = useAppStore();
  const [sport, setSport] = useState<SportId | null>(null);
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState(45);
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSport(editing.sport);
      setDate(editing.date);
      setDuration(editing.durationMinutes);
      setIntensity(editing.intensity ?? "moderate");
      setDistance(editing.distanceKm ? String(editing.distanceKm) : "");
      setNotes(editing.notes ?? "");
    } else {
      setSport(defaultSport ?? null);
      setDate(defaultDate ?? toISODate(store.today));
      setDuration(45);
      setIntensity("moderate");
      setDistance("");
      setNotes("");
    }
  }, [open, editing, defaultDate, defaultSport, store.today]);

  if (!open) return null;

  const cfg = sport ? SPORT_BY_ID[sport] : null;
  const hasDistance = cfg?.hasDistance ?? false;
  const isSynced = editing?.source === "strava";

  const save = () => {
    if (!sport) return;
    const distanceKm =
      hasDistance && distance ? Number(distance) : undefined;
    const base = {
      date,
      sport,
      durationMinutes: duration,
      intensity,
      notes: notes.trim() || undefined,
      distanceKm,
    };
    if (editing) {
      const coreChanged =
        editing.durationMinutes !== duration ||
        (editing.distanceKm ?? 0) !== (distanceKm ?? 0) ||
        editing.sport !== sport;
      store.updateSession(editing.id, {
        ...base,
        ...(isSynced && coreChanged ? { edited: true } : {}),
      });
    } else {
      store.addSession({ ...base, source: "manual" });
    }
    onClose();
  };

  const remove = () => {
    if (editing) store.deleteSession(editing.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[var(--card-border)] bg-[var(--card)] p-5 animate-fade-in sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold">
            {editing ? "Edit session" : "Add a session"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {editing && isSynced && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-3 py-2 text-xs text-[var(--muted-foreground)]">
            <Watch className="h-4 w-4 text-[var(--accent)]" />
            Imported from Strava. Editing duration or distance marks it as adjusted manually.
          </div>
        )}
        {editing?.edited && (
          <div className="mb-4 rounded-xl bg-white/5 px-3 py-2 text-xs text-[var(--muted-foreground)]">
            Adjusted manually after sync.
          </div>
        )}

        <div className="space-y-4">
          <Field label="Sport">
            <SportSelect value={sport} onChange={setSport} />
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-elevated)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </Field>

          <Field label={`Duration · ${duration} min`}>
            <div className="flex flex-wrap gap-2">
              {DURATION_CHIPS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={
                    "rounded-lg border px-3 py-1.5 text-sm transition-colors " +
                    (duration === d
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--card-border)] text-[var(--muted-foreground)] hover:border-[var(--muted)]")
                  }
                >
                  {d}m
                </button>
              ))}
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 0)}
                className="w-20 rounded-lg border border-[var(--card-border)] bg-[var(--card-elevated)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>
          </Field>

          <Field label="Intensity">
            <SegmentedToggle<Intensity>
              value={intensity}
              onChange={setIntensity}
              options={[
                { value: "easy", label: "Easy" },
                { value: "moderate", label: "Moderate" },
                { value: "hard", label: "Hard" },
              ]}
            />
          </Field>

          {hasDistance && (
            <Field label="Distance (km)">
              <input
                type="number"
                min={0}
                step={0.1}
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="e.g. 7.5"
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card-elevated)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </Field>
          )}

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional — how did it feel?"
              className="w-full resize-none rounded-xl border border-[var(--card-border)] bg-[var(--card-elevated)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {editing && (
            <button
              onClick={remove}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--destructive)]/30 px-4 py-3 text-sm font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <button
            onClick={save}
            disabled={!sport}
            className="flex-1 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
          >
            {editing ? "Save changes" : "Add session"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}
