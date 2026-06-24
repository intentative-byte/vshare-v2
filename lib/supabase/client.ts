"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured || !url || !anonKey) {
    // TODO: Reconnect Supabase by removing demo-mode null client handling once auth/database is restored.
    return null;
  }

  return createBrowserClient<Database>(url, anonKey);
}
