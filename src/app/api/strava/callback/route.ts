import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStravaActivities } from "@/lib/integrations/strava";

/**
 * GET /api/strava/callback?code=...
 * Strava redirects here after the user authorizes. We exchange the code for
 * tokens, persist them (admin client — provider_tokens has no client RLS),
 * run an initial backfill, and bounce the user to the connections page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/profile/connections?error=denied", origin));
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/profile/connections?error=config", origin));
  }

  // Exchange the authorization code for tokens.
  let token: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    athlete?: { id?: number | string };
  };
  try {
    const res = await globalThis.fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      return NextResponse.redirect(new URL("/profile/connections?error=token", origin));
    }
    token = await res.json();
  } catch {
    return NextResponse.redirect(new URL("/profile/connections?error=token", origin));
  }

  if (!token.access_token || !token.refresh_token || !token.expires_at) {
    return NextResponse.redirect(new URL("/profile/connections?error=token", origin));
  }

  const admin = createAdminClient();

  await admin.from("provider_tokens").upsert(
    {
      user_id: user.id,
      provider: "strava",
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(token.expires_at * 1000).toISOString(),
      scope: "activity:read_all",
      athlete_id: token.athlete?.id != null ? String(token.athlete.id) : null,
    },
    { onConflict: "user_id,provider" }
  );

  await admin
    .from("connections")
    .upsert(
      { user_id: user.id, provider: "strava", connected: true },
      { onConflict: "user_id,provider" }
    );

  // Initial backfill of the user's recent activity history.
  const synced = await syncStravaActivities(admin, user.id);

  return NextResponse.redirect(
    new URL(`/profile/connections?synced=${synced}`, origin)
  );
}
