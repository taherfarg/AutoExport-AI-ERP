import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "@/lib/env/runtime";

export function createClient() {
  const { supabaseUrl, publishableKey } = getPublicSupabaseEnv();

  return createBrowserClient(supabaseUrl, publishableKey);
}
