import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "@/lib/env/runtime";

export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, publishableKey } = getPublicSupabaseEnv();

  return createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. Middleware refreshes sessions.
          }
        },
      },
    },
  );
}
