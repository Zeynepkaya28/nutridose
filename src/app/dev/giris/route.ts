// DEVELOPMENT ONLY: signs the browser in as a local demo user so the UI can be tried before Faz 5.
// Refuses to run unless NODE_ENV=development AND Supabase is local. No password is involved:
// the admin API issues a one-time magic-link token that is verified straight away.
import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const DEMO_EMAIL = "demo@nutridose.test";
// Seed ids (supabase/seed.sql)
const DEMO_MEDICATIONS = ["20000000-0000-4000-8000-000000000001", "20000000-0000-4000-8000-000000000002"];

function allowed(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!allowed()) return new NextResponse("Not found", { status: 404 });

  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({ email: DEMO_EMAIL, email_confirm: true });
  if (created.data.user) {
    const userId = created.data.user.id;
    // First run: give the demo user the reference scenario profile.
    await admin.from("profiles").upsert({ user_id: userId, display_name: "Demo" });
    await admin.from("user_conditions").upsert({ user_id: userId, condition_code: "cardiology" });
    await admin
      .from("user_medications")
      .insert(DEMO_MEDICATIONS.map((product_id) => ({ user_id: userId, product_id, dose: "1×1" })));
  }

  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) return new NextResponse("Demo girişi başarısız.", { status: 500 });

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (error) return new NextResponse("Demo girişi başarısız.", { status: 500 });

  return NextResponse.redirect(new URL("/", request.url));
}
