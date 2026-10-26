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
| `npm run check:bundle` | build sonrası `.next/static` içinde gizli anahtar arar |

## Vercel'e bağlama

1. Repo'yu GitHub'a gönderin, Vercel'de **Add New → Project → Import** ile içe aktarın (framework: Next.js, ayar gerekmez).
2. Vercel'de **Integrations → Marketplace → Supabase** entegrasyonunu kurun ve projeye bağlayın. Entegrasyon Supabase URL ve anahtarlarını Production, Preview ve Development ortamlarına otomatik ekler.
3. Entegrasyonun eklediği değişken adlarını kontrol edin; uygulama şu üç adı okur: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. Farklı adla geldiyse aynı değerle bu adları ekleyin. `SUPABASE_SECRET_KEY` hiçbir ortamda `NEXT_PUBLIC_` önekli olmamalı.
4. Yerelde Vercel değişkenlerini çekmek için: `npx vercel link` ve `npx vercel env pull .env.local`.

### Preview ortamı → ayrı Supabase branch'i

Preview deploy'ları production veritabanına **yazmamalı**. Supabase projesinde **Branching**'i açın ve GitHub entegrasyonunu bağlayın: her pull request için Supabase ayrı bir preview branch'i (kendi veritabanı + `supabase/migrations` uygulanmış hâli) açar, Vercel entegrasyonu da o PR'ın Preview deploy'una bu branch'in URL/anahtarlarını verir. Production yalnızca ana Supabase projesine bağlı kalır. (Faz 6'da CI ile doğrulanacak.)

## Faz 0 kabul kriterleri

- [x] `npm run dev` açılıyor
- [ ] Vercel preview deploy yeşil — GitHub repo + Vercel import sonrası
- [x] Gizli anahtar istemci paketinde yok — `npm run build && npm run check:bundle`
