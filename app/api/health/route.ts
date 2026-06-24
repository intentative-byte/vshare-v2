import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function GET() {
  return NextResponse.json({
    status: "ok",
    app: "VShare",
    mode: isSupabaseConfigured() ? "supabase" : "local",
    timestamp: new Date().toISOString(),
  });
}
