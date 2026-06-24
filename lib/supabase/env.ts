const SUPABASE_URL_REST_PATH = "/rest/v1";

export function getSupabaseConfigurationError(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
) {
  if (!url || !anonKey) {
    return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  if (/\s/.test(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL is invalid: remove whitespace from the Supabase project URL.";
  }

  if (url.includes(SUPABASE_URL_REST_PATH)) {
    return "NEXT_PUBLIC_SUPABASE_URL is invalid: use the Supabase project URL, not the /rest/v1 REST endpoint.";
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:") {
      return "NEXT_PUBLIC_SUPABASE_URL is invalid: it must start with https://.";
    }
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL is invalid: set it to a valid Supabase project URL.";
  }

  return null;
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const error = getSupabaseConfigurationError(url, anonKey);

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
    isValid: !error,
    error,
  };
}
