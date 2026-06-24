"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey, isValid } = getSupabaseEnv();

  if (!isValid || !url || !anonKey) {
    return null;
  }

  return createBrowserClient<Database>(url, anonKey);
}
