import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "@/lib/env/runtime";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, publishableKey } = getPublicSupabaseEnv();

  const supabase = createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session - important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/billing/webhook") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/);

  // CSRF origin check for non-GET mutation requests
  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (origin && appUrl) {
      const allowedOrigin = new URL(appUrl).origin;
      if (origin !== allowedOrigin && origin !== "http://localhost:3000" && origin !== "http://localhost:3001") {
        return NextResponse.json({ error: "CSRF origin mismatch" }, { status: 403 });
      }
    }
  }

  // Redirect unauthenticated users to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
