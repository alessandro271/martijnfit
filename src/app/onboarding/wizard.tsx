"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { MARTIJN_HABITS } from "@/lib/mock/habits";
import { SPORT_IDS } from "@/lib/mock/sports";
import type { SportId, RecurringHabit } from "@/lib/types";
import { StepWelcome } from "./steps/step-welcome";
import { StepSports } from "./steps/step-sports";
import { StepHabits } from "./steps/step-habits";
import { StepConnections } from "./steps/step-connections";
import { StepReview } from "./steps/step-review";

export interface Draft {
  name: string;
  sports: SportId[];
  habits: RecurringHabit[];
}

export interface StepProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  onNext: () => void;
}

const STEP_TITLES = ["Welcome", "Sports", "Habits", "Connect", "Review"];

export function OnboardingWizard() {
  const store = useAppStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    name: store.profile.name || "Martijn",
    sports: store.profile.sports.length ? store.profile.sports : [...SPORT_IDS],
    habits: store.habits.length ? store.habits : MARTIJN_HABITS,
  });

  const update = (patch: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const next = () => setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => {
    store.completeOnboarding({
      name: draft.name,
      sports: draft.sports,
      habits: draft.habits,
    });
    router.push("/tracker");
  };

  const total = STEP_TITLES.length;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          {step > 0 ? (
            <button
              onClick={back}
              className="rounded-lg p-1 text-[var(--muted-foreground)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="font-[family-name:var(--font-heading)] text-sm font-bold">
              Martijn<span className="text-[var(--accent)]">fit</span>
            </span>
          )}
          <span className="text-xs text-[var(--muted)]">
            Step {step + 1} of {total}
          </span>
          <button
            onClick={() => router.push("/tracker")}
            className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            Skip
          </button>
        </div>
        <div className="h-0.5 w-full bg-[var(--card-border)]">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {step === 0 && <StepWelcome draft={draft} update={update} onNext={next} />}
        {step === 1 && <StepSports draft={draft} update={update} onNext={next} />}
        {step === 2 && <StepHabits draft={draft} update={update} onNext={next} />}
        {step === 3 && (
          <StepConnections draft={draft} update={update} onNext={next} />
        )}
        {step === 4 && <StepReview draft={draft} onFinish={finish} />}
      </main>
    </div>
  );
}
