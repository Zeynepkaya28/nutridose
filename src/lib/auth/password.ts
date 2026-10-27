// Password policy, mirrored in supabase/config.toml ([auth] minimum_password_length / password_requirements)
// and in the Supabase Dashboard for production. The server is the real gate; this gives instant feedback.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt limit

export const PASSWORD_HINT = "En az 8 karakter; büyük harf, küçük harf ve rakam içermeli.";

/** Returns a Turkish error, or null when the password meets the policy. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "Şifre en az 8 karakter olmalı.";
  if (password.length > PASSWORD_MAX_LENGTH) return "Şifre en fazla 72 karakter olabilir.";
  if (!/[a-zçğıöşü]/.test(password)) return "Şifre en az bir küçük harf içermeli.";
  if (!/[A-ZÇĞİÖŞÜ]/.test(password)) return "Şifre en az bir büyük harf içermeli.";
  if (!/[0-9]/.test(password)) return "Şifre en az bir rakam içermeli.";
  return null;
}

/** Turkish message for Supabase Auth error codes. Never reveals whether an account exists. */
export function authErrorMessage(code: string | undefined, status?: number): string {
  switch (code) {
    case "invalid_credentials":
      return "E-posta veya şifre hatalı.";
    case "email_not_confirmed":
      return "E-posta adresinizi henüz doğrulamadınız. Gelen kutunuzdaki bağlantıya dokunun.";
    case "weak_password":
      return `Şifre yeterince güçlü değil. ${PASSWORD_HINT}`;
    case "same_password":
      return "Yeni şifre eskisiyle aynı olamaz.";
    case "reauthentication_needed":
      return "Güvenliğiniz için mevcut şifrenizi yeniden girin.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.";
    default:
      return status === 429 ? "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin." : "İşlem şu anda yapılamadı. Lütfen tekrar deneyin.";
  }
}
