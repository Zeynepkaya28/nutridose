import { NextResponse } from "next/server";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env";

export function GET() {
  return NextResponse.json({ ok: true, supabaseConfigured: hasPublicSupabaseEnv() });
}
