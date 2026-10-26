# NutriDose

İlaç, besin ve takviye etkileşimlerini kullanıcının tıbbi profiline göre kontrol eden web uygulaması.

> NutriDose tıbbi tavsiye yerine geçmez.

**Mimari:** Next.js 15 (App Router, TypeScript strict) → Vercel · Supabase → Postgres + Auth + Storage + RLS · Arayüz → Apple HIG (sistem fontu, sistem renkleri; SF Symbols web'e gömülmez).

## Klasör yapısı

```
src/app             sayfalar ve route handler'lar
src/domain          saf TypeScript iş mantığı (factory/, chain/, strategy/) — Next.js/Supabase import etmez
src/lib/supabase    client.ts (tarayıcı), server.ts (server component/route + admin), middleware.ts (oturum yenileme)
src/ui              HIG bileşenleri (Faz 4)
supabase/           config.toml, migrations/, seed.sql
scripts/            yardımcı script'ler (istemci paketi gizli anahtar kontrolü)
```

## Gereksinimler

- Node.js ≥ 20.9 (geliştirme Node 24 ile yapıldı)
- Docker Desktop (yerel Supabase için çalışır durumda olmalı)
- Supabase CLI projeye dev bağımlılığı olarak dahil; `npx supabase ...` ile çalışır.

## Yerel kurulum

```bash
npm install
npm run supabase:start          # Docker gerekir; ilk seferde imajları indirir
npm run supabase:status         # URL ve anahtarları env formatında yazar
cp .env.example .env.local      # sonra değerleri doldurun (aşağıya bakın)
npm run dev                     # http://localhost:3000
```

`.env.local` eşlemesi (`supabase status -o env` çıktısından):

| Değişken | Kaynak | Nerede kullanılır |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` | tarayıcı + sunucu |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `PUBLISHABLE_KEY` | tarayıcı + sunucu |
| `SUPABASE_SECRET_KEY` | `SECRET_KEY` | **yalnızca sunucu** — asla `NEXT_PUBLIC_` önekiyle değil |

`SUPABASE_SECRET_KEY` yalnızca `src/lib/supabase/server.ts` içindeki `createAdminClient()` tarafından okunur; bu dosya `server-only` ile işaretlidir, istemci bileşenine import edilirse build hata verir.

## Script'ler

| Komut | Ne yapar |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` · `typecheck` · `test` | ESLint · `tsc --noEmit` · Vitest |
| `npm run supabase:start` / `supabase:stop` / `supabase:status` | yerel Supabase yığını |
| `npm run db:reset` | yerel veritabanını sıfırlar, migration'ları + `seed.sql`'i uygular |
| `npm run db:types` | `src/lib/supabase/types.ts` dosyasını yerel şemadan üretir |
| `npm run db:test` | `supabase/tests` altındaki pgTAP testleri (iki kullanıcılı RLS izolasyonu) |
| `npm run db:lint` | şema tip/derleme kontrolü |
| `npm run check:bundle` | build sonrası `.next/static` içinde gizli anahtar arar |

## Vercel'e bağlama

1. Repo'yu GitHub'a gönderin, Vercel'de **Add New → Project → Import** ile içe aktarın (framework: Next.js, ayar gerekmez).
2. Vercel'de **Integrations → Marketplace → Supabase** entegrasyonunu kurun ve projeye bağlayın. Entegrasyon Supabase URL ve anahtarlarını Production, Preview ve Development ortamlarına otomatik ekler.
3. Entegrasyonun eklediği değişken adlarını kontrol edin; uygulama şu üç adı okur: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Farklı adla geldiyse aynı değerle bu adları ekleyin. `SUPABASE_SECRET_KEY` hiçbir ortamda `NEXT_PUBLIC_` önekli olmamalı.
4. Yerelde Vercel değişkenlerini çekmek için: `npx vercel link` ve `npx vercel env pull .env.local`.

### Preview ortamı → ayrı Supabase branch'i

Preview deploy'ları production veritabanına **yazmamalı**. Supabase projesinde **Branching**'i açın ve GitHub entegrasyonunu bağlayın: her pull request için Supabase ayrı bir preview branch'i (kendi veritabanı + `supabase/migrations` uygulanmış hâli) açar, Vercel entegrasyonu da o PR'ın Preview deploy'una bu branch'in URL/anahtarlarını verir. Production yalnızca ana Supabase projesine bağlı kalır. (Faz 6'da CI ile doğrulanacak.)

## Yerel portlar

Bu proje Supabase'in varsayılan 5432x portlarını değil **5532x** aralığını kullanır (aynı makinede başka bir yerel Supabase projesi çalışabilsin diye): API `55321`, DB `55322`, Studio `55323`, Mailpit `55324`.

## Veritabanı (Faz 1)

- **Katalog tabloları** (`substances`, `products`, `product_substances`, `conditions`, `interactions`, `nutrient_limits`, `allergens`): giriş yapmış kullanıcı yalnızca okur; `anon` erişemez; yazma yalnızca service role ile.
- **Kullanıcı tabloları**: her tabloda `user_id` var (varsayılanı `auth.uid()`), select/insert/update/delete için ayrı politikalar `(select auth.uid()) = user_id` kalıbıyla. Alt tablolar (`meal_items`, `analysis_findings`, `analysis_runs.meal_id`) üst satıra `(id, user_id)` bileşik foreign key ile bağlıdır; böylece bir kullanıcı başkasının öğününe/analizine satır ekleyemez.
- Kullanıcı silinince (`auth.users`) tüm verisi cascade ile silinir.
- **Storage**: `prescriptions` bucket'ı private, 5 MB, yalnızca `application/pdf`. Yol `{user_id}/{uuid}.pdf` olmalı; politikalar yalnızca sahibine izin verir.
- `conditions` tablosundaki 5 tedavi profili kodu migration ile gelir. `seed.sql` yalnızca geliştirme içindir; tüm etkileşim/limit kayıtları **ÖRNEK – klinik doğrulama gerekli** olarak işaretlidir ve klinik veri değildir.

Advisors: `npx supabase db advisors --local --level info`. Yeni veritabanında yalnızca `unused_index` (INFO) notları çıkar; bu indeksler foreign key ve RLS sorguları için bilinçli olarak eklendi.

## Arayüz (Faz 4)

Ekranlar: **Bugün** (`/`), **Ekle** (sheet: barkod / elle yaz / reçete), **Kritik uyarı** (analiz sonrası, yalnızca `requiresAlert`), **Öğün analizi** (`/analiz/[id]`), **İlaçlarım** (`/ilaclarim`, `/ilaclarim/[id]`), **Profil** (`/profil`), **Öğünler** sekmesi (`/ogunler`).

- Tasarım belirteçleri: `src/ui/tokens.css` (sistem renkleri, metin stilleri rem cinsinden, açık/koyu, `prefers-contrast: more`, `prefers-reduced-motion`). Bileşen stilleri: `src/ui/components.css`.
- Bileşenler (`src/ui`): `Icon` (SF Symbol adıyla anahtarlanır → Phosphor Icons, MIT), `ListSection`/`ListRow` (inset grouped, ≥ 44pt), `TabBar` (yüzen cam kapsül), `Sheet` (medium/large detent, grabber, swipe-to-dismiss, `<dialog>` ile odak kapanı), `Alert` (dikey düğmeler, varsayılan üstte, Vazgeç altta), `StatusBadge`/`FindingItem` (renk + şekil + metin).
- Erişilebilirlik: Lighthouse erişilebilirlik puanı tüm ekranlarda **100** (açık ve koyu). %200 yazı boyutunda yatay taşma yok; satırlar yükselir, yan yana öğeler (container query, rem) alt alta geçer.
- HIG'den bilinçli sapmalar (WCAG AA için): ikincil metin `secondaryLabel` yerine biraz daha koyu (0.78 alfa); açık modda etkileşimli mavi metin `rgb(0 95 220)` (Apple'ın artırılmış kontrast mavisi gri zeminde 4.09:1 kalıyordu); sekme etiketleri 11–14 px arasında sınırlanır (UIKit gibi).
- PWA: `src/app/manifest.ts` (`display: standalone`), ikonlar `next/og` ile üretilir (`/icon`, `/apple-icon`, `/pwa-icon/192|512`). Safe area `env(safe-area-inset-*)` ile.
- Geliştirme girişi: `npm run dev` iken `/dev/giris` yerel demo hesabıyla oturum açar (kardiyoloji + varfarin/atorvastatin). Yalnızca `NODE_ENV=development` **ve** yerel Supabase ile çalışır; diğer her durumda 404.

## API (Faz 3)

### `POST /api/analyze` (Node runtime)

```jsonc
// İstek (zod ile doğrulanır)
{ "inputKind": "manual",           "payload": { "text": "ıspanak, greyfurt suyu" }, "mealId": "<uuid, opsiyonel>" }
{ "inputKind": "barcode",          "payload": { "barcode": "8690000000017" } }
{ "inputKind": "prescription_pdf", "payload": { "storagePath": "<user_id>/<uuid>.pdf" } }

// Yanıt
{ "runId": "…", "requiresAlert": true,
  "findings": [{ "step": "drug_food", "status": "high", "severity": "contraindicated",
                 "title": "…", "detail": "…", "message": "…", "interactionId": "…" }] }
```

Akış: oturum → kota (dakikada 30) → Creator ile `AnalysisInput` → kullanıcının koşullarından `StrategyResolver` → `SafetyPipeline` → `save_analysis_run` (tek transaction) → yanıt.

- **Kimlik:** web için `@supabase/ssr` çerezi, native/iOS istemci için `Authorization: Bearer <access_token>`. İkisi de publishable key kullanır; **servis anahtarı kullanılmaz**, her okuma/yazma RLS'ten geçer.
- **Hatalar:** kullanıcıya yalnızca Türkçe mesaj döner (`src/server/errors.ts`); teknik ayrıntı JSON log'a gider, `x-request-id` başlığıyla eşleştirilebilir. Log'a istek gövdesi/sağlık verisi yazılmaz.
- **Rate limit:** `analysis_rate_events` (yalnızca ekleme; kullanıcı kendi sayacını silemez) + `consume_analysis_quota()`. Aşılırsa 429 + `Retry-After: 60`.
- **Reçete PDF:** tarayıcı dosyayı doğrudan private `prescriptions` bucket'ına yükler (`src/lib/prescriptions/upload.ts`); API yalnızca yolu alır, sunucuda kullanıcının kendi oturumuyla indirir, ≤ 5 MB / `application/pdf` / `%PDF-` imzasını doğrular, metni `pdf-parse` ile çıkarır. Taranmış (görüntü) PDF'ler desteklenmez.
- **Barkod:** `src/lib/barcode/scanner.ts` — tarayıcıda `BarcodeDetector`, desteklenmiyorsa `@zxing/browser`. API'ye yalnızca barkod metni gider.
- **Katalog araması:** `search_products` / `search_substances` SQL fonksiyonları (Türkçe karakter ve büyük/küçük harf duyarsız).

### Testler

```bash
npm test                     # birim testleri (+ domain kapsam eşiği)
npm run test:integration     # yerel Supabase'e karşı /api/analyze uçtan uca (route handler doğrudan çağrılır)
NUTRIDOSE_BASE_URL=http://localhost:3000 npm run test:integration   # + çalışan sunucuya gerçek HTTP
```

Entegrasyon testleri yalnızca yerel Supabase'e (127.0.0.1/localhost) karşı çalışır; geçici test kullanıcılarını oluşturup siler.

## Faz 3 kabul kriterleri

- [x] Örnek senaryo API üzerinden doğru bulguları döndürüyor (route handler, `next dev` ve `next start` üzerinden)
- [x] RLS servis anahtarı olmadan çalışıyor — API yolu yalnızca kullanıcının token'ıyla çalışır

## Domain katmanı (Faz 2)

`src/domain` saf TypeScript'tir; Next.js, React ve Supabase import etmez (ESLint kuralı + `boundary.test.ts`). Katalog erişimi `CatalogRepository` arayüzüyle enjekte edilir.

- **Factory Method** (`factory/`): `BarcodeCreator`, `ManualTextCreator`, `PrescriptionPdfCreator` → ilgili `InputParser` → `AnalysisInput`. `creatorFor(kind, deps)` girdi türüne göre creator seçer. PDF metni `PdfTextExtractor` arayüzünden gelir (Faz 3'te pdf-parse).
- **Strategy** (`strategy/`): 5 tedavi profili + `GeneralStrategy` (profil yoksa) + `CompositeStrategy` (en yüksek şiddet, en sıkı limit). `StrategyResolver.fromConditions(codes)`.
- **Chain of Responsibility** (`chain/`): `ActiveIngredientScan → DrugFoodInteraction → DoseLimit → ToleranceAllergy`. Bir halka hata verirse `error` bulgusu yazılır, zincir devam eder. `contraindicated` → `requiresAlert = true`. `SafetyPipeline.build(strategy, { catalog })`.

Klinik kurallar hakkında:
- Sayısal limitler kodda **yoktur**; kaynaklı `nutrient_limits` kayıtlarından gelir. Stratejiler yalnızca niteliksel kurallar taşır (`strategy/rules.ts`, örn. böbrek profilinde potasyum içeren etkileşimi bir seviye yükseltmek). Bu kurallar da **ÖRNEK – klinik doğrulama gerekli**'dir.
- Stratejiler hiçbir zaman kendiliğinden `contraindicated` üretmez; bu yalnızca katalog verisinden gelir. Aynı madde çifti için genel ve profile özel kayıt varsa en şiddetlisi kullanılır.
- Bulgu durumunda (`status`) `contraindicated` değeri yoktur; böyle bir etkileşim `high` olarak görünür ve `requiresAlert` ile kritik uyarıyı açar.

## Faz 2 kabul kriterleri

- [x] `npm test` yeşil — 103 test, `src/domain` için %100 satır/dal/fonksiyon kapsamı (eşik zorunlu)
- [x] Domain klasörü Next.js veya Supabase import etmiyor

## Faz 1 kabul kriterleri

- [x] Başka kullanıcının satırı okunamıyor — `npm run db:test` (24 test)
- [x] Advisors temiz (WARN/ERROR yok)
- [x] Tipler üretildi — `src/lib/supabase/types.ts`

## Faz 0 kabul kriterleri

- [x] `npm run dev` açılıyor
- [ ] Vercel preview deploy yeşil — GitHub repo + Vercel import sonrası
- [x] Gizli anahtar istemci paketinde yok — `npm run build && npm run check:bundle`
