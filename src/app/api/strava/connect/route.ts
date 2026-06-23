import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/strava/connect
 * Kicks off the Strava OAuth flow: requires a signed-in user, then redirects
 * to Strava's authorize URL (which redirects back to /api/strava/callback).
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const redirectUri = `${site}/api/strava/callback`;

  const authorize = new URL("https://www.strava.com/oauth/authorize");
  authorize.searchParams.set("client_id", clientId ?? "");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("approval_prompt", "auto");
  authorize.searchParams.set("scope", "read,activity:read_all");

  return NextResponse.redirect(authorize.toString());
}
