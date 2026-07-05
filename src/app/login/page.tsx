"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) {
        setError("Couldn't send the link. Double-check your email and try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Ambient accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[120px]"
        style={{ background: "var(--accent)" }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-5xl font-bold tracking-tight">
          Martijn<span className="text-[var(--accent)]">fit</span>
        </h1>
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Track every session. Plan every week.
        </p>

        {sent ? (
          <div className="mt-10 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6">
            <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--accent)]" />
            <p className="mt-3 text-sm font-semibold">Check your inbox</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              We sent a login link to{" "}
              <span className="text-[var(--foreground)]">{email}</span>. Open it on
              this device to sign in.
            </p>
            <button
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="mt-4 text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-10 w-full space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 focus-within:border-[var(--accent)]">
              <Mail className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[var(--muted)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending…" : "Email me a login link"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-xs text-[var(--destructive)]">{error}</p>}

        {!isSupabaseConfigured && (
          <p className="mt-6 text-xs text-[var(--muted)]">
            Demo mode — set up Supabase to enable login.{" "}
            <Link
              href="/tracker"
              className="text-[var(--muted-foreground)] underline underline-offset-2 transition-colors hover:text-[var(--foreground)]"
            >
              Open the demo
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
