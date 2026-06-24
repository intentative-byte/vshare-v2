export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    anonKey,
    isConfigured: isSupabaseConfigured(),
  };
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // TODO: Reconnect Supabase by making these env vars required once auth/database is restored.
  return Boolean(url && (url.startsWith("http://") || url.startsWith("https://")) && anonKey);
}
