import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServiceRoleEnv } from "@/lib/env/runtime";

export function createServiceRoleClient() {
  const { supabaseUrl, serviceRoleKey } = getServiceRoleEnv();

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
