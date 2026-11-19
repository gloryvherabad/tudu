import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSafePath } from "@/lib/safe-path";

const PUBLIC_PATHS = ["/login", "/auth", "/setup-needed"];


/** True when the Supabase settings are present and the URL looks valid. */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url !== url.trim() || key !== key.trim()) return false;
  try {
    const u = new URL(url);
    if (u.pathname !== "/" && u.pathname !== "") return false;
    return u.protocol === "https:" || u.hostname === "127.0.0.1" || u.hostname === "localhost";
  } catch {
    return false;
  }
}

/**
 * A redirect that keeps any session cookies Supabase just refreshed or cleared.
 * Without this, a refreshed session would be dropped and the next request would
 * try to reuse the old refresh token, which can sign the user out.
 */
function redirectWithCookies(url: URL, from: NextResponse) {
  const res = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

/**
 * Runs on every request: restores the session from its cookies, refreshes it
 * when the access token has expired, and guards app routes. Sessions live in
 * Supabase's own HTTP cookies (never localStorage), so users stay signed in
 * across refreshes and browser restarts until the session expires, is revoked
 * or they sign out.
 */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Missing or broken settings: show a clear message instead of crashing.
  if (!isSupabaseConfigured()) {
    if (path === "/setup-needed") return NextResponse.next();
    return NextResponse.redirect(new URL("/setup-needed", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    // Supabase unreachable: treat as signed out rather than failing the request.
  }
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Come back to the same page after signing in again.
    if (path !== "/") url.searchParams.set("next", path + request.nextUrl.search);
    return redirectWithCookies(url, response);
  }

  if (user && path === "/login") {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    url.search = "";
    return redirectWithCookies(next && isSafePath(next) ? new URL(next, request.url) : url, response);
  }

  // Signed-in pages must never be served from a shared or back/forward cache after sign-out.
  if (user && !isPublic) response.headers.set("Cache-Control", "private, no-store");

  return response;
}
