import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env";

describe("supabase env", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("reports missing config", () => {
    expect(hasPublicSupabaseEnv()).toBe(false);
  });

  it("reports present config", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(hasPublicSupabaseEnv()).toBe(true);
  });
});
