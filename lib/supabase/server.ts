import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/**
 * User-scoped Supabase client. Auth is owned by Clerk now: instead of Supabase
 * session cookies, we hand Supabase the Clerk session token via accessToken().
 * Supabase verifies it (third-party auth integration) and RLS reads the Clerk
 * user id from auth.jwt()->>'sub'. When signed out, getToken() returns null and
 * Supabase falls back to the anon role, so workspace-scoped policies deny reads.
 *
 * Memoized per request: the token is resolved lazily inside accessToken() on
 * each query, so one client instance per request is correct and avoids rebuilding
 * it on every call site.
 */
export const createSupabaseServerClient = cache(async () => {
  if (!hasSupabaseConfig) {
    return null;
  }

  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    async accessToken() {
      return (await auth()).getToken();
    },
  });
});
