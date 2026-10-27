/** An error whose Turkish message is safe to show to the user, with the HTTP status to use. */
export class UserFacingError extends Error {
  constructor(
    message: string,
    readonly status: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "UserFacingError";
  }
}

export const MESSAGES = {
  unauthenticated: "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.",
  badRequest: "İstek okunamadı. Lütfen tekrar deneyin.",
  invalidBody: "Girdi eksik veya hatalı. Lütfen kontrol edip tekrar deneyin.",
  tooLarge: "İstek çok büyük.",
  rateLimited: "Çok fazla analiz isteği gönderdiniz. Lütfen bir dakika sonra tekrar deneyin.",
  mealNotFound: "Seçilen öğün bulunamadı.",
  prescriptionNotFound: "Reçete dosyası bulunamadı. Lütfen PDF'i yeniden yükleyin.",
  prescriptionTooLarge: "Reçete dosyası 5 MB'tan büyük olamaz.",
  prescriptionNotPdf: "Dosya geçerli bir PDF değil.",
  prescriptionUnreadable: "PDF okunamadı. Taranmış (fotoğraf) reçeteler henüz desteklenmiyor.",
  consentRequired: "Sağlık verilerinizin işlenmesi için açık rızanız gerekiyor. Profil ayarlarından onay verebilirsiniz.",
  unexpected: "Analiz şu anda yapılamadı. Lütfen biraz sonra tekrar deneyin.",
} as const;
