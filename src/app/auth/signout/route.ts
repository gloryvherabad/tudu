import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs out: revokes the session with Supabase and clears its cookies.
 * Other open tabs notice on their next focus and go to the sign-in page.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  // If Supabase couldn't be reached, still clear the cookies on this device.
  if (error) await supabase.auth.signOut({ scope: "local" });
  const res = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
