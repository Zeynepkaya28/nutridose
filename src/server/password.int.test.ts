// Password change against the local Supabase stack (real password policy from config.toml).
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { adminClient, createTestUser, deleteTestUser, type TestUser } from "@/test/supabase-users";
import { changePassword } from "./password";

const admin = adminClient();
const users: TestUser[] = [];
const NEW_PASSWORD = "YeniSifre2026";

function freshClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

afterAll(async () => {
  for (const user of users) await deleteTestUser(admin, user).catch(() => undefined);
});

describe("changePassword", () => {
  it("rejects a wrong current password and weak or mismatched new passwords", async () => {
    const user = await createTestUser(admin);
    users.push(user);
    expect(await changePassword(user.client, user.email, "yanlis-Sifre1", NEW_PASSWORD, NEW_PASSWORD)).toEqual({
      ok: false,
      error: "Mevcut şifre hatalı.",
    });
    expect(await changePassword(user.client, user.email, user.password, "zayif", "zayif")).toMatchObject({ ok: false });
    expect(await changePassword(user.client, user.email, user.password, NEW_PASSWORD, "Baska2026x")).toEqual({
      ok: false,
      error: "Yeni şifreler aynı değil.",
    });
    expect(await changePassword(user.client, user.email, "", NEW_PASSWORD, NEW_PASSWORD)).toEqual({
      ok: false,
      error: "Mevcut şifrenizi girin.",
    });
  });

  it("changes the password, keeps this session, ends other sessions", async () => {
    const user = await createTestUser(admin);
    users.push(user);

    // A second device.
    const otherDevice = freshClient();
    const other = await otherDevice.auth.signInWithPassword({ email: user.email, password: user.password });
    expect(other.error).toBeNull();

    expect(await changePassword(user.client, user.email, user.password, NEW_PASSWORD, NEW_PASSWORD)).toEqual({ ok: true });

    // Old password no longer works, the new one does.
    expect((await freshClient().auth.signInWithPassword({ email: user.email, password: user.password })).error?.code).toBe(
      "invalid_credentials",
    );
    expect((await freshClient().auth.signInWithPassword({ email: user.email, password: NEW_PASSWORD })).error).toBeNull();

    // This device keeps working; the other device's refresh token was revoked.
    expect((await user.client.from("profiles").select("user_id").single()).error).toBeNull();
    const refreshed = await otherDevice.auth.refreshSession();
    expect(refreshed.error).not.toBeNull();
  });
});
