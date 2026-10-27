// Integration-test helper: throwaway users on the LOCAL Supabase stack.
// The secret key is used only here, to create and delete test users. The code under test never sees it.
import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing. Run \`npm run supabase:start\` and fill .env.local.`);
  return value;
}

export function assertLocalSupabase() {
  const url = new URL(env("NEXT_PUBLIC_SUPABASE_URL"));
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error(`Integration tests only run against a local Supabase, not ${url.host}.`);
  }
}

export function adminClient(): SupabaseClient<Database> {
  assertLocalSupabase();
  return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface TestUser {
  id: string;
  accessToken: string;
  /** Acts as this user with the publishable key (RLS applies). */
  client: SupabaseClient<Database>;
}

export async function createTestUser(
  admin: SupabaseClient<Database>,
  options: { consent?: boolean } = {},
): Promise<TestUser> {
  const email = `test-${randomUUID()}@nutridose.test`;
  const password = randomBytes(24).toString("base64url");
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) throw error ?? new Error("createUser failed");

  const client = createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError || !session.session) throw signInError ?? new Error("signIn failed");

  if (options.consent !== false) {
    const { error: consentError } = await client
      .from("profiles")
      .update({ health_consent_at: new Date().toISOString(), health_consent_version: "test" })
      .eq("user_id", created.user.id);
    if (consentError) throw consentError;
  }

  return { id: created.user.id, accessToken: session.session.access_token, client };
}

export async function deleteTestUser(admin: SupabaseClient<Database>, user: TestUser) {
  const { data: files } = await admin.storage.from("prescriptions").list(user.id);
  if (files?.length) await admin.storage.from("prescriptions").remove(files.map((f) => `${user.id}/${f.name}`));
  await admin.auth.admin.deleteUser(user.id);
}
