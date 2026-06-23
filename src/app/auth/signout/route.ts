import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Sign the user out and send them back to the login screen. */
async function signOut(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function POST(request: Request) {
  return signOut(request);
}

// Also support GET so a plain anchor link works.
export async function GET(request: Request) {
  return signOut(request);
}
