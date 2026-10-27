import { describe, expect, it } from "vitest";
import { authErrorMessage, passwordProblem } from "@/lib/auth/password";

describe("passwordProblem", () => {
  it.each([
    ["Kisa1", "Şifre en az 8 karakter olmalı."],
    ["tamamenkucuk1", "Şifre en az bir büyük harf içermeli."],
    ["TAMAMENBUYUK1", "Şifre en az bir küçük harf içermeli."],
    ["RakamYokBurada", "Şifre en az bir rakam içermeli."],
    ["A1" + "a".repeat(71), "Şifre en fazla 72 karakter olabilir."],
  ])("%s → %s", (password, message) => {
    expect(passwordProblem(password)).toBe(message);
  });

  it("accepts Turkish letters and a strong password", () => {
    expect(passwordProblem("Güçlü1şifre")).toBeNull();
    expect(passwordProblem("NutriDose2026")).toBeNull();
  });
});

describe("authErrorMessage", () => {
  it("maps Supabase codes to Turkish without revealing account existence", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("E-posta veya şifre hatalı.");
    expect(authErrorMessage("email_not_confirmed")).toMatch(/doğrulamadınız/);
    expect(authErrorMessage("weak_password")).toMatch(/güçlü değil/);
    expect(authErrorMessage("same_password")).toMatch(/aynı olamaz/);
    expect(authErrorMessage("reauthentication_needed")).toMatch(/yeniden/);
    expect(authErrorMessage("over_request_rate_limit")).toMatch(/Çok fazla/);
    expect(authErrorMessage(undefined, 429)).toMatch(/Çok fazla/);
    expect(authErrorMessage("something_else")).toMatch(/yapılamadı/);
  });
});
