import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { hasSupabaseAdminConfig, supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminConfig) {
    return null;
  }

  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
