import { describe, expect, it } from "vitest";
import { buildCsp, createNonce } from "@/lib/security/csp";

describe("buildCsp", () => {
  it("production policy: nonce scripts, Supabase connections, no framing", () => {
    const csp = buildCsp("abc", { supabaseUrl: "https://xyz.supabase.co", dev: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("connect-src 'self' https://xyz.supabase.co wss://xyz.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self' https://xyz.supabase.co https://appleid.apple.com");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("development allows eval for React refresh and local http Supabase", () => {
    const csp = buildCsp("abc", { supabaseUrl: "http://127.0.0.1:55321", dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://127.0.0.1:55321");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });

  it("works without Supabase settings", () => {
    expect(buildCsp("n", { dev: false })).toContain("connect-src 'self';");
  });

  it("creates distinct nonces", () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});
