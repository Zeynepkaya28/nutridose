import { describe, expect, it } from "vitest";
import { isPublicPath, safeNext } from "@/lib/auth/redirect";

describe("safeNext", () => {
  it.each([
    ["/ilaclarim", "/ilaclarim"],
    ["/analiz/abc?uyari=1", "/analiz/abc?uyari=1"],
    [null, "/"],
    ["", "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/giris", "/"],
    ["/auth/callback", "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe("isPublicPath", () => {
  it("allows sign-in, auth callback, API, KVKK and PWA assets", () => {
    for (const path of ["/giris", "/auth/callback", "/api/analyze", "/kvkk", "/manifest.webmanifest", "/pwa-icon/192", "/icon"]) {
      expect(isPublicPath(path)).toBe(true);
    }
  });
  it("protects app screens", () => {
    for (const path of ["/", "/ilaclarim", "/profil", "/hosgeldin", "/analiz/x", "/girisx"]) {
      expect(isPublicPath(path)).toBe(false);
    }
  });
});
