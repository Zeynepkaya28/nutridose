// Clears a session whose account no longer exists, then shows the sign-in screen.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return NextResponse.redirect(new URL("/giris", request.url));
}
