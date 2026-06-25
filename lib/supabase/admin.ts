import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { hasSupabaseAdminConfig, supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";

// supabase-js is stateless over HTTP (PostgREST) and the admin client carries no
// per-request session, so a single instance is safe to reuse across all calls and
// concurrent requests in a warm function instance. Reusing it avoids re-allocating
// a client on each of the ~80 call sites per request.
let adminClient: SupabaseClient<Database> | null = null;

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminConfig) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
