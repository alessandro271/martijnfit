import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStravaActivities } from "@/lib/integrations/strava";

/**
 * POST|GET /api/strava/sync
 * Re-syncs the signed-in user's Strava activities on demand.
 * Returns { count } — the number of sessions imported/updated.
 */
async function handle() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const count = await syncStravaActivities(admin, user.id);
  return Response.json({ count });
}

export async function POST() {
  return handle();
}

export async function GET() {
  return handle();
}
