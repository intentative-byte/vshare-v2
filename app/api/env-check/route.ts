import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return NextResponse.json({
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseUrlLength: supabaseUrl?.length ?? 0,
    supabaseUrlStartsHttps: supabaseUrl?.startsWith("https://") ?? false,
    supabaseUrlIncludesRestV1: supabaseUrl?.includes("/rest/v1") ?? false,
    supabaseUrlHasSpaces: supabaseUrl ? /\s/.test(supabaseUrl) : false,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
  });
}
