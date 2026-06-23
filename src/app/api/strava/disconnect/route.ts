import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Disconnect Strava: revoke the stored tokens and flip the connection off.
 * Requires an authenticated user. Token deletion uses the service-role client
 * because provider_tokens has no client-facing RLS policies.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  await admin
    .from("provider_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "strava");

  await admin
    .from("connections")
    .update({ connected: false })
    .eq("user_id", user.id)
    .eq("provider", "strava");

  return Response.json({ ok: true });
}
