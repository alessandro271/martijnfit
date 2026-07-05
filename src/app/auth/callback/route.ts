import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Auth callback. Handles BOTH:
 *  - magic-link / email OTP  (?token_hash=..&type=..)
 *  - PKCE code exchange       (?code=..)  — used by OAuth, if ever re-enabled
 * Then routes the user to onboarding or the tracker.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  // ── Establish the session from whichever param we got ──────────────
  let session = null;
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) session = data.session;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) session = data.session;

    // OAuth only: persist Google Calendar tokens if the provider returned them.
    if (session?.provider_token && session.provider_refresh_token) {
      try {
        const admin = createAdminClient();
        await admin.from("provider_tokens").upsert(
          {
            user_id: session.user.id,
            provider: "google_calendar",
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token,
            expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
            scope: "calendar.readonly",
          },
          { onConflict: "user_id,provider" }
        );
        await admin.from("connections").upsert(
          { user_id: session.user.id, provider: "google_calendar", connected: true, last_synced: new Date().toISOString() },
          { onConflict: "user_id,provider" }
        );
      } catch {
        // never block login if token storage fails
      }
    }
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  // ── Route by onboarding status ─────────────────────────────────────
  let onboarded = false;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .single();
    onboarded = !!profile?.onboarded;
  } catch {
    onboarded = false;
  }

  return NextResponse.redirect(new URL(onboarded ? "/tracker" : "/onboarding", origin));
}
