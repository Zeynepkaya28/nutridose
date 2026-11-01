# NutriDose iOS (Faz 7, SwiftUI)

Aynı Supabase backend'ini kullanan native istemci. Analiz için web'deki `POST /api/analyze` çağrılır; domain mantığı (Factory / Strategy / Chain) tek yerde, Next.js tarafında kalır.

> ⚠️ Bu kod Windows ortamında yazıldı ve **henüz derlenmedi**. İlk açılışta Xcode'da küçük API uyumsuzlukları çıkabilir (supabase-swift 2.x).

## Kurulum (macOS + Xcode 16)

```bash
brew install xcodegen
cd ios
cp Config.example.xcconfig Config.xcconfig   # Supabase URL, publishable key, web app URL (https://nutridose.netlify.app)
xcodegen                                     # NutriDose.xcodeproj üretir
open NutriDose.xcodeproj
```

- Supabase Dashboard › Authentication › URL Configuration › Redirect URLs: `nutridose://auth-callback` ekleyin (magic link uygulamaya döner).
- Sign in with Apple: Apple Developer'da App ID için "Sign in with Apple" yeteneğini açın; Supabase › Providers › Apple'a bundle id'yi (`com.nutridose.app`) "Client IDs" olarak ekleyin. Native akış `signInWithIdToken` kullanır.
- Barkod: VisionKit `DataScannerViewController` (A12+ cihaz; simülatörde çalışmaz, elle giriş kullanılır).

## HIG eşlemesi

| Gereksinim | Uygulama |
|---|---|
| 4 sekme | `TabView`: house.fill, pills.fill, fork.knife, person.crop.circle.fill |
| Arama | İlaçlarım'da `.searchable` |
| Listeler | `List` + `.insetGrouped` |
| Ekle | `.sheet` + `.presentationDetents([.medium, .large])` |
| Kritik uyarı | `.alert` yalnızca `requiresAlert == true` iken; "Vazgeç" `role: .cancel` |
| Durumlar | checkmark.circle.fill / exclamationmark.triangle.fill / xmark.octagon.fill + metin |
| Renk / yazı | `.green/.orange/.red`, `Color(.secondaryLabel)`; `.font(.body/.footnote…)` → Dynamic Type |
| Hesap silme | `confirmationDialog` → `DELETE /api/account` (App Store zorunluluğu) |
| KVKK | Açık rıza ekranı; rıza olmadan veritabanı sağlık verisi yazmayı reddeder |
