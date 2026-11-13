# AGENTS.md — yulalab.com (yulalab-web)

Bu dosya Codex ve diğer kod ajanları içindir. Kısa tutulur; ayrıntı `CLAUDE.md`, `BITIRME-PROGRAMI.md` ve `DEFTER.md` içindedir. Çelişkide `CLAUDE.md` doğrudur.

## Yığın
- Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 4 · next-intl 4 · three/@react-three/fiber (3D sahne) · framer-motion · Lenis
- Paket yöneticisi pnpm 10.33; Node 26.9 (`netlify.toml`). Kurulum: `pnpm install --frozen-lockfile`
- CI'ın koştuğu komutlar: `pnpm lint` · `pnpm typecheck` · `pnpm test` (vitest) · `pnpm verify:claims:local` · `pnpm verify:claims` · `pnpm verify:links --no-live` · `pnpm build` · `pnpm verify:render-mode` · `pnpm exec playwright test --grep-invert @hardware-webgl`
- `@hardware-webgl` etiketli E2E testleri GPU ister; CI'da koşmaz, deploy öncesi yerelde ayrı kapı olarak koşulur (`.github/ci/README.md`).

## Kurallar
- **Minimal diff:** yalnız istenen dosyalara dokun; biçimlendirme ya da yeniden adlandırma turu yapma.
- Yerelleştirme: 14 dil (varsayılan `tr`, ayrıca `en`, `ar`, `de`, `es-419`, `fr`, `hi`, `id`, `it`, `ja`, `ko`, `pl`, `pt-BR`, `zh-Hans`). Arayüz metinleri `messages/<dil>.json`, içerik metinleri `messages/content-<dil>.json` (`tr` ve `en` dışındaki 12 dil). Yeni anahtarı tüm dillere ekle; kontrol `pnpm verify:translations` (`pnpm build` içinde de koşar).
- Testler: birim testler `tests/**/*.test.ts(x)` (vitest), E2E `e2e/` (Playwright). Yeni davranışa test ekle; mevcut testi silme ya da atlatma. Yerel E2E için önce `pnpm build`.
- Kaynak makbuzu: `src/app` ya da taban listesindeki bir dosyayı değiştirirsen `.github/ci/reviewed-source-changes.json` ve `ci.yml` ağaç pini yenilenir (`.github/ci/README.md`); `python3 -I .github/ci/verify-published-source.py` temiz olmalı.
- Bitirmeden: lint, typecheck ve test temiz olmalı; çıktının son 5 satırını rapora koy.
- Chrome DevTools MCP yalnız performans işinde kullanılır; tam Lighthouse ölçümü `npx lighthouse` ile yapılır.

## Dokunulmaz
- **Netlify:** `netlify.toml` ve `.github/netlify/`; `main`'e merge = canlı deploy ve kredi harcar, merge/deploy yalnız kurucu onayıyla.
- **`[skip netlify]` kuralı:** commit/merge mesajındaki `[skip netlify]` Netlify build'ini atlatır (kredi korunur); ekleme ya da kaldırma kararı kuraldır, kendi başına değiştirme.
- Sır dosyaları (`.env*`, anahtarlar, `~/.secrets`) yalnız açık talimatla; çapraz-iddia yüzeyi (ürün metrikleri, mağaza rozetleri) kaynak ürün değişmeden elle güncellenmez.
- **Hepsi:** Burun Farkı ve Iron Bank depolarına ve belgelerine dokunma.
