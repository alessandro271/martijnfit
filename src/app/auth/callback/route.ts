import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * OAuth callback for Supabase Google sign-in.
 * Exchanges the ?code for a session, stores Google Calendar tokens (best-effort),
 * then routes the user to onboarding or the tracker.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(new URL("/login?error=auth", origin));
  }

  const userId = data.session.user.id;
  const providerToken = data.session.provider_token;
  const providerRefreshToken = data.session.provider_refresh_token;

  // Best-effort: persist Google Calendar tokens so we can read busy hints later.
  // Only store when we got a refresh token (otherwise we can't keep access alive).
  if (providerToken && providerRefreshToken) {
    try {
      const admin = createAdminClient();

      await admin.from("provider_tokens").upsert(
        {
          user_id: userId,
          provider: "google_calendar",
          access_token: providerToken,
          refresh_token: providerRefreshToken,
          expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
          scope: "calendar.readonly",
        },
        { onConflict: "user_id,provider" }
      );

      await admin.from("connections").upsert(
        {
          user_id: userId,
          provider: "google_calendar",
          connected: true,
          last_synced: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );
    } catch {
      // Never block login if token storage fails — calendar can be reconnected later.
    }
  }

  // Decide where to send the user based on onboarding status.
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

  const destination = onboarded ? "/tracker" : "/onboarding";
  return NextResponse.redirect(new URL(destination, origin));
}
