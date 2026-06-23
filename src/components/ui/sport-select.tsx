"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { SPORTS, SPORT_BY_ID } from "@/lib/mock/sports";
import type { SportId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SportSelect({
  value,
  onChange,
  allowed,
  placeholder = "Select a sport",
}: {
  value: SportId | null;
  onChange: (s: SportId) => void;
  allowed?: SportId[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const sports = allowed ? SPORTS.filter((s) => allowed.includes(s.id)) : SPORTS;
  const selected = value ? SPORT_BY_ID[value] : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors",
          open
            ? "border-[var(--accent)]"
            : "border-[var(--card-border)] hover:border-[var(--muted)]"
        )}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: selected.colorVar }}
            />
            <selected.icon className="h-4 w-4" style={{ color: selected.colorVar }} />
            {selected.label}
          </span>
        ) : (
          <span className="text-[var(--muted)]">{placeholder}</span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-[var(--muted)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-elevated)] shadow-xl">
          {sports.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5",
                value === s.id && "bg-[var(--accent)]/10"
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.colorVar }}
              />
              <s.icon className="h-4 w-4" style={{ color: s.colorVar }} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
