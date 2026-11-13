# yulalab.com — Aşama 1 envanteri (WEB-UX-01)

Tarih: 2026-11-09 · Taban: `origin/main` `069477c` (canlı Netlify deploy `6aee6f8fc6b7d8c21f0eac44`, 2026-11-07) · Kapsam: yalnız belge; görsel, sahne, renk, animasyon, kod değişikliği yok.
Yöntem: yalnız kaynak okuma. Build, test, Lighthouse koşulmadı (makine yükü 70+). Atıf biçimi `yol:satır`; `main` dışı kaynaklar `PR #N` ile etiketli. Doğrulanamayan her şey `UNKNOWN`.
Not: `docs/yula-execution/` main'de yoktur; STATUS/DECISIONS PR #46 dalındadır (`docs/yula-execution-status`, baş `71e1757`).

## 1. Sayfa/route listesi ve navigasyon

### 1.1 Sayfalar (`src/app/[locale]/**/page.tsx` = 22 dosya; sitemap sabit yolu 18)
Gerçek sayı 22 `page.tsx`: 21 içerik sayfası + 1 yakalayıcı (`[...rest]`). Fark: yakalayıcı ve `/projects/[slug]` + `/case-studies/[slug]` dinamik; sitemap sabit yolları `src/app/sitemap.ts:6-24` (18 yol) + proje slug'ları.

| # | Rota | Dosya | Amaç |
|---|---|---|---|
| 1 | `/` | `src/app/[locale]/page.tsx:34` | Ana sayfa: `YulaExperience` 3D yolculuğu; 8 ürün sabit sırayla (`:16-25`), sıra kayarsa build hata verir (`:49-54`) |
| 2 | `/projects` | `src/app/[locale]/projects/page.tsx:14` | Ürün dizini |
| 3 | `/projects/[slug]` | `src/app/[locale]/projects/[slug]/page.tsx:38` | Ürün sayfası; `revalidate = 900` (claim bayatlığı render anında) |
| 4 | `/consulting` | `src/app/[locale]/consulting/page.tsx:10` | AI danışmanlığı |
| 5 | `/manifesto` | `src/app/[locale]/manifesto/page.tsx:15` | Değerler/manifesto |
| 6 | `/transparency` | `src/app/[locale]/transparency/page.tsx:27` | Şeffaflık |
| 7 | `/notes` | `src/app/[locale]/notes/page.tsx:12` | Notlar (`src/data/notes.ts`) |
| 8 | `/case-studies` | `src/app/[locale]/case-studies/page.tsx:23` | Vaka listesi; `revalidate = 900` (`:21`) |
| 9 | `/case-studies/[slug]` | `src/app/[locale]/case-studies/[slug]/page.tsx:31` | Vaka; `dynamicParams = true` (`:33`) |
| 10 | `/operating-system` | `src/app/[locale]/operating-system/page.tsx:40` | "Nasıl çalışıyoruz"; yasaklı kalıp sayısını render anında yazar (`:78`) |
| 11 | `/contact` | `src/app/[locale]/contact/page.tsx:49` | İletişim; form yalnız `leadsEnabled() && supportsLeadIntake(locale)` iken açık; posta bağlantıları her zaman (`:44`) |
| 12 | `/studio` | `src/app/[locale]/studio/page.tsx:55` | Stüdyo başvurusu; `STUDIO_ENABLED!=="true"` ise `notFound` |
| 13 | `/support` | `src/app/[locale]/support/page.tsx:11` | Destek |
| 14 | `/terms` | `src/app/[locale]/terms/page.tsx:13` | Kullanım şartları |
| 15 | `/privacy` | `src/app/[locale]/privacy/page.tsx` | Gizlilik merkezi |
| 16-19 | `/privacy/{braavolabs,burunfarki,lifeos,motion}` | `src/app/[locale]/privacy/*/page.tsx` | Ürün bazlı gizlilik (mağaza URL'si) |
| 20-21 | `/delete-account/{lifeos,motion}` | `src/app/[locale]/delete-account/*/page.tsx` | Mağaza veri silme URL'leri |
| 22 | `/[...rest]` | `src/app/[locale]/[...rest]/page.tsx:17-24` | Yerel 404 yakalayıcı (`notFound()`) |

Locale-altı route handler (sayfa değil): `src/app/[locale]/data-request/verify/route.ts` (veri talebi doğrulama sayfası; bağımsız belge), `src/app/[locale]/motion/consent/route.ts:1-12` (Motion veli onayı, nonce'lu bağımsız belge).
Kök düzeyi: `src/app/sitemap.ts`, `src/app/robots.ts:11` (apex `https://yulalab.com`), `src/app/opengraph-image/route.tsx`, `src/app/projects/[slug]/opengraph-image.tsx:10`, `src/app/global-not-found.tsx`.

### 1.2 API rotaları (`src/app/api/*/route.ts`)
| Rota | Yöntem | Amaç |
|---|---|---|
| `/api/leads` | POST (`route.ts:174`) | Lead alımı; kapalıyken 503 `not_accepting_submissions` (`:178`); 403 origin, 413, 400, 429 rate-limit (`:181-206`) |
| `/api/events` | POST `:121`, GET `:171` | Analitik olay alımı |
| `/api/data-request` | POST | KVKK/GDPR veri talebi |
| `/api/mail` | GET `:23` | Outbox gönderimi (cron, `CRON_SECRET`) |
| `/api/purge` | GET `:38` | Süresi dolan veriyi silme (cron) |

Middleware: `src/middleware.ts:6` (next-intl; metadata rotaları `:14-29` hariç; `/api` eşleştirici dışı: `src/server/lead-surface.ts:10-13`).

### 1.3 Navigasyon (main'deki hâl)
- Header: 8 öğe `NAV` (home, consulting, manifesto, transparency, projects, studio, notes, contact) `src/components/layout/Header.tsx:19-28`; studio kapalıyken süzülür `:35`.
- Masaüstü nav `xl` (>=1280px) ve üstü `:99`; altında menü düğmesi `:132` ve `<dialog>` çekmece `:143` (`showModal` `:51`, odak tuzağı `onKeyDown` `:154-170`).
- CTA "ctaProjects" -> `/projects` `:119-126`; `LocaleSwitcher` + `ThemeControl` header'da `:117-118`, çekmecede `:229-230`.
- Footer (`src/components/layout/Footer.tsx`): ürün listesi `:62`, consulting `:79`, manifesto `:82`, transparency `:87`, projects `:92`, notes `:97`, studio (koşullu) `:101`, case-studies `:109`, operating-system `:114`, contact `:119`, mailto `:132`, privacy/terms/support `:149-159`; sosyal: X, LinkedIn, Instagram ikon seti `:11`, gerçek kayıtlar `src/data/company.ts:69`.
- Geçiş: `PageTransition` giden sayfayı bulanıklaştırıp cam perde süpürür `src/components/layout/PageTransition.tsx:8-15`.

**#48 (WEB-P0-02b) değişikliği, main'de YOK:** `nav-config.ts` ile header yeniden etiketlenir (Ürünler/Laboratuvar/Yaklaşımımız/İş Birliği), header'dan Ana Sayfa/Manifesto/Şeffaflık/Stüdyo/İletişim çıkar, footer'a taşınır; Stüdyo yalnız footer'da (`STUDIO_ENABLED`); LinkedIn yok (DEFTER Y-004); mağaza bağlantısı footer'da yok; bilinen yetim `/delete-account/motion` (PR #48 `header-footer-routes.md:29`). #49: 320px a11y/klavye E2E + `/projects` başlık sırası. Ana sayfaya ek mobil menü kilidi yok: UNKNOWN düzeyde, PR #48 belgesi "kaydırma kilidi yok" der (`:42`).

## 2. Tema tokenları (kaydedilir, DEĞİŞMEZ)

Mimari: Tailwind 4 (`package.json` `tailwindcss 4.3.3`) + eski `tailwind.config.ts` (`@config`, `src/app/globals.css:5`); renkler CSS değişkeni, kanal biçimli (`rgb(var(--yula-ink-*) / <alpha>)`) `tailwind.config.ts:20-33`. `styles/` yalnız `tailwind-legacy-base.css` (486 satır) içerir; ayrı renk dosyası yok.

| Token | Koyu (`:root`) | Açık (`[data-theme="light"]`) | Kaynak |
|---|---|---|---|
| `--yula-ink-900` (sayfa) | `10 10 11` | `245 243 238` | `globals.css:603` / `:635` |
| `--yula-ink-850/800/700/600/500` | `14 14 16` … `58 58 66` | `255 253 248`, `238 234 226`, `228 223 213`, `210 203 193`, `139 129 117` | `:604-608` / `:636-640` |
| `--yula-ink-400/300/200/100/50` | `144 144 154`, `154 154 163`, `197 197 204`, `229 229 234`, `244 244 245` | `101 93 85`, `92 85 79`, `57 53 47`, `33 30 26`, `22 19 16` | `:609-613` / `:641-645` |
| `--yula-page-bg` / `-rgb` | `#030407` / `3 4 7` | `#f5f3ee` / `245 243 238` | `:619-620` / `:651-652` |
| surface / raised / inset | beyaz %2 / 4 / 1.5 | siyah %2.5 / 5.5 / 1.8 | `:614-616` / `:646-648` |
| hairline / strong | beyaz %10 / %20 | `rgba(22,19,16,.18/.32)` | `:617-618` / `:649-650` |
| `--yula-focus` | `#c4b5fd` | `#6d36ac` | `:622` / `:654` |
| warning / success (+strong) | `#fcd34d/#fbbf24`, `#6ee7b7/#34d399` | `#795200/#6b4700`, `#14663f/#0d5834` | `:623-626` / `:655-658` |
| `--yula-exp-*` (sahne metni) | `#050505`, fg `#fff`, muted `#ded8e8`, line `#b9acc4` | `#e6eef0`, fg `#000`, muted `#333a3c`, line `#50595c` | `:627-631` / `:659-663` |
| `--yula-exp-accent`, `-danger`, `-control-line` | `#d9b9ff`, `#e89db2`, `#777080` | `#643399`, `#9a2747`, `#7a7067` | `:719-721` |
| `--yula-brand-text-mix` | 100% | 38% (açık zeminde marka renklerini mürekkebe karıştırır) | `:621` / `:653`; kullanım `:570-573` |
| tarayıcı `theme-color` | `#09060e` | `#f5f3ee` | `src/lib/theme.ts:5-8` |
| 3D dünya zemini | `#030303` | `#e6eef0` | `src/components/experience/theme.ts:5-6` |

Tema mekanizması: tercih `light|dark|system` `localStorage` anahtarı `yula.appearance.v1` (`src/lib/theme.ts:4`); head'de çalışan sabit bootstrap betiği `:34`; `data-theme`, `color-scheme`, `.dark` sınıfı `:23-27`; JS'siz yedek `@media (prefers-color-scheme: light) :root:not([data-theme])` `globals.css:666-696`. `darkMode: "class"` `tailwind.config.ts:5`. Tema 3D sahneye `displayTheme` olarak geçer (`SceneHost.tsx:320`).

Sahne metni kutuplaşması: `resolveExperiencePalette` saf `#000`/`#fff`; geçiş eşiği `0.216` (AA için) `src/components/experience/theme.ts:18-34`.

Tipografi: `next/font/google` ile 4 aile, `display: swap`: Inter `--font-sans`, Manrope `--font-display`, Space Grotesk `--font-grotesk`, JetBrains Mono `--font-mono` (`src/app/[locale]/layout.tsx:22-44`); Tailwind eşleme `tailwind.config.ts:47-52`. Dil yedekleri: ar `Tahoma/Arial` (`globals.css:589-593`), ja Hiragino/Yu Gothic (`:594-597`), hi/ko/zh-Hans (`:714-716`). RTL/CJK'da `letter-spacing: normal` (`:598`, `:717`). Header/footer mono, 12px (`:566-567`). `tracking-tightest -0.04em` `tailwind.config.ts:53-55`. Marka mantığı: "YULA Lab".
Aralık/yerleşim: container `1.5rem` / `lg 2.5rem`, `2xl 80rem` (`tailwind.config.ts:10-14`); kesme noktaları 640/768/1024/1280/1536 (`:9`); güvenli alan değişkenleri `globals.css:13-16`; mobil header 82px (`:581-584`). Gecikme/ease: `--ease-soft cubic-bezier(.16,1,.3,1)` `globals.css:12`; hareket sözlüğü `src/lib/motion.ts:6-14`.
**PR #47** iki temalı marka tokenları + `verify:contrast` (780 çift, en düşük 4.51; STATUS `:12`) getirir; main'de bu betik yok (UNKNOWN: #47'nin token adları main'dekilerle ne kadar örtüşür).

## 3. Sahne mimarisi

- Kalıcı sahne: `SceneHost` locale layout'ta, `PageTransition`'ın DIŞINDA; WebGL bağlamı bir kez yaratılır (`src/app/[locale]/layout.tsx:137-145`, `SceneHost.tsx:104-112`).
- Üç ton `journey|page|quiet` (`scene-route.ts:6`). Ana sayfa `journey`; içerik sayfaları `page` (örtü opaklığı 0.82, `globals.css:242-244`); yasal/hesap silme/veri talebi/motion consent `quiet` (0.95, `:245-247`; liste `scene-route.ts:11-17`) ve bu rotalarda ziyaret 3D paketini hiç indirmez (`:8-10`).
- Arka plan pozu: zaman çizelgesi 0 (cam Y + LED duvar) `scene-route.ts:32`; geçiş 1100 ms easeInOutCubic `:35-41`.
- three.js `dynamic(..., { ssr:false })` ile yalnız istenirse yüklenir (`SceneHost.tsx:32-40`).
- Yedek: kullanıcı jesti/boşta yükleme `backdropLoadPolicy`: mobil veya `low` katman = ilk jest; aksi = sayfa yüklenince (`scene-route.ts:55-57`; dinleyiciler `SceneHost.tsx:71`, `:159-193`).
- Ana sayfa yolculuğu: 8 sahne `hero, portfolio, proof, crossing, mission, vision, values, closing` (`experience/types.ts:4-12`); kaydırma↔zaman haritası `storyboard.ts:5-15`. Yolculuk kendi sondasını yapar (`YulaExperience.tsx`).
- WebGL sonda/yedek: WebGL2 yoksa veya yazılım render (swiftshader/llvmpipe) ise `available:false`/`software:true` (`quality.ts:88-108`); reduced-motion veya yazılım = `low`; <=4 çekirdek/<=4 GB, DPR>3, >8 M piksel, `saveData` = `low`; >=8 çekirdek+8 GB ve >=1 M px, DPR<=2 = `high`, aksi `medium` (`:99-140`). DPR: high `[1,1.75]`+gölge; medium `[1,1.5]`; low `1` (`:13-26`). Çalışma anında `downgradeTier` (`:28-31`); bağlam kaybı -> `ExperienceErrorBoundary`+`handleFailure` -> doğrusal belge (`SceneHost.tsx:226-229`, `:212-214`).
- Doğrusal/statik belge: sunucu HTML'i tam doğrusal belgedir (JS'siz ve ilk erişilebilirlik ağacı); `useStatic` = `!mounted || forceStatic || reducedMotion || compactViewport || webgl unavailable || canvasFailed` (`YulaExperience.tsx:501-510`). `compactViewport` = `(max-width:767px) and (max-height:600px)` (`:164`).
- Mobil davranış (main): `SceneHost` mobil sorgusu `max-width:767px` (`SceneHost.tsx:70`); mobilde Lenis kapalı (`YulaExperience.tsx:194`); açılış yükleyicisi yalnız yetenekli masaüstünde (`:276-282`; çizim 3600 ms, zaman aşımı +6000 ms `:46-48`). Mobilde yolculuk hâlâ 3D'ye terfi edebilir (main) -> **#54** ADR-003 (c) kabul: mobil statik varsayılan; **#55** Space Grotesk önyüklemesi kapalı; **#63** mobilde WebGL sondası ilk jeste ertelenir (`scene-route.ts`/`SceneHost.tsx`).
- Reduced-motion: `SceneHost` `hidden` -> renderer ve GPU belleği bırakılır (`SceneHost.tsx:278-281`); CSS `.scene-host {display:none}`, `.reveal/.word` anında görünür, rota perdesi gizli (`globals.css:495-529`); Framer `MotionConfig reducedMotion="user"` (`layout.tsx:129-136`); `.drift-*` ve `.mesh-default` durur (`globals.css:499-505`).
- Kaydırma: Lenis yalnız yolculukta (`useSmoothScroll.ts:3-18`); `html.lenis` smooth-scroll'u kapatır (`globals.css:36-39`).
- Performans maliyeti notları (PR #50 `adr-003-3d-default.md:14-26`, ölçüm yerel/yüklü makine): mobil A (3D) Perf 73-74, LCP ~4.9 sn, TBT ~186 ms, JS 532 KB; B (statik) 82, TBT 26, JS 238 KB; masaüstü A 95, B 99. 3D ~294 KB ek JS, ~160 ms TBT. LCP öğesi h1 metni; gözlenen LCP 149 ms, simüle 4235 ms (PR #55 `mobile-lcp.md:6-9`). #63 TBT ölçümü UNKNOWN (makine yükü 129.94).
- Gerçek GPU kanıtı: `@hardware-webgl` etiketli 13 test CI dışı, yerelde koşar (grep sayımı: `e2e/experience-continuity.spec.ts` 4 `:45,100,147,204`, `e2e/experience.spec.ts` 7 `:788-1051`, `e2e/scene-persistence.spec.ts` 2 `:28,86`; STATUS `:36`). Gerçek cihaz pil/akıcılık UNKNOWN (PR #50 `:44`).

## 4. Ürün registry

- Tür: `ProductPublicRecord` (`src/lib/types.ts:331-345`): `slug, name, lifecycle, surfaces[], primaryCta, screenshots[], claims[], privacyUrl, supportUrl, updatedAt`.
- `ProductClaim` (`types.ts:277-330`): `id, statementTr/En, evidenceKind, source, scopeTr/En, figures?, figureWords?, owner, verifiedAt, expiresAt`.
- `lifecycle`: `live|beta|research|archived` (`types.ts:231`); `EvidenceKind`: `measured|source-code-verified|self-reported|third-party-verified` (`:239-243`); `SurfaceStatus`: `live|beta|coming-soon|unavailable` (`:247`).
- Claim DURUMU main'de YOK: `claimState` kodda geçmez (arama boş). PR #44 (ADR-001) isteğe bağlı `claimState`, `verificationMethod`, `buildOrCommit`, `publishableAsPresentTense`, `reviewer` ekler; `stale` `expiresAt`'ten türetilir; planned/prototype/unknown claim `withheld` (DECISIONS PR #46 `:5-8`).
- Kayıtlı ürünler (`src/data/public-registry.ts`): braavolabs (beta, `:20-22`), burunfarki (live, `:104-106`), lifeos (live, `:166-168`), gravita, lissom, jablab, ostinato, choreia (hepsi `research`, `:209-259`). Site projeleri (`src/data/projects/*.ts:8`): braavolabs beta, burunfarki live, lifeos live, gravita/lissom/jablab/ostinato/choreia `coming-soon`. Ana sayfa sırası sabit (`page.tsx:16-25`).
- Süre durumu: tüm claim/yüzey `expiresAt` değerleri 2026-09-18..24 (`public-registry.ts:30-201`), yani bugün hepsi geçmiş; STATUS `:38` aynı. Bayat claim gizlenmez, "Güncellik kontrolü bekleniyor" ile işaretli.
- Doğrulama: `isExpired`/`getClaimFreshness` render anında (`src/lib/public-registry.ts:153-183`); yapısal kurallar zaman bağımsız (`:1-12`, `validateRecord :31`, `validateRegistry :99`); tarihler `YYYY-MM-DD` zorunlu (`:19-29`).
- `verify:claims` = `scripts/verify-public-registry.ts`: `validateRegistry` + `validateCaseStudies` + üretilen `public/portfolio-registry.json` güncel mi (`export-public-registry.ts --check`) (`:15-44`). `verify:claims:local` = `scripts/verify-claims-local.mjs`: TR/EN anahtar paritesi (`:28-40`) + yasaklı kalıp taraması (12 kalıp, `scripts/forbidden-patterns.mjs:13-25`). `verify:links` yapı denetimi (bloklayıcı) + canlı erişim (blok değil), `scripts/verify-public-links.ts:1-8`. `verify:render-mode` build sonrası ürün sayfalarının donmuş prerender olmadığını doğrular (`scripts/verify-render-mode.mjs:1-10`). `pnpm build` ilk üçünü zincirler (`package.json` `build`).
- Dış tüketici: `public/portfolio-registry.json` CORS `https://links.yulalab.com`, `max-age=300` (`netlify.toml:15-20`).
- Vaka çalışmaları: `src/data/case-studies.ts` (slug listesi UNKNOWN: aranan `slug:` kalıbı eşleşmedi).

## 5. Locale paritesi

| # | Kod | Etiket | OG | Dizin | `messages/<k>.json` | `content-<k>.json` |
|---|---|---|---|---|---|---|
| 1 | tr | Türkçe | tr_TR | kökte (önek yok) | var | yok (kaynak) |
| 2 | en | English | en_US | `/en` | var | yok (kaynak) |
| 3 | es-419 | Español (Latinoamérica) | es_419 | `/es-419` | var | var |
| 4 | pt-BR | Português (Brasil) | pt_BR | `/pt-BR` | var | var |
| 5 | de | Deutsch | de_DE | `/de` | var | var |
| 6 | fr | Français | fr_FR | `/fr` | var | var |
| 7 | ja | 日本語 | ja_JP | `/ja` | var | var |
| 8 | ar | العربية (RTL) | ar_AR | `/ar` | var | var |
| 9 | it | Italiano | it_IT | `/it` | var | var |
| 10 | ko | 한국어 | ko_KR | `/ko` | var | var |
| 11 | id | Bahasa Indonesia | id_ID | `/id` | var | var |
| 12 | pl | Polski | pl_PL | `/pl` | var | var |
| 13 | hi | हिन्दी | hi_IN | `/hi` | var | var |
| 14 | zh-Hans | 简体中文 | zh_CN | `/zh-Hans` | var | var |

Kaynak: `src/i18n/locales.ts:2-15`; `defaultLocale "tr"`, `localePrefix "as-needed"` `src/i18n/routing.ts:4-8`. `messages/` 14 + 12 = 26 JSON dosyası (dizin listesi). Yalnız `zh` varyantları: bare `zh`/Geleneksel Çince kasıtlı reddedilir (`locales.ts:20-37`). Lead/posta alımı yalnız tr+en (`verify-translations.ts:86` `intakeLocales`).
`verify:translations` (`scripts/verify-translations.ts`) denetler: her dilde `en.json` ile ağaç biçimi (`:32`), anahtar kümesi (`:34`), `{yer tutucu}` eşliği ve boş-desen eşliği (`:35-38`); Intl runtime desteği (`:33`); kaynak kodda `text(tr,en)` / `{tr,en}` / `*Tr/*En` çiftlerinden çıkan İngilizce ifadelerin 12 `content-*.json` dosyasında karşılığı var mı (`:41-85`). Denetlemez: çeviri kalitesi, tarayıcı kabulü (`:86`). Sonuç JSON'u çıktıda `issues[]`.
Durum (PR #46 STATUS `:37`, koşulmadı burada): `messages/<k>.json` 659/659 anahtar, eksik yok; TR/EN eşit. Çeviri kalitesi insan denetimi UNKNOWN. Ana sayfa sahne metinleri 12 dilde İngilizce yedek (`lang="en"`; STATUS `:59`). 14 dilin yeni anahtarları (#48 products/lab/approach/collaboration; #50-#60 sahneler) 12 dilde insan incelemesi görmedi (PR #48 `header-footer-routes.md:44`).
RTL (ar): `<html dir="rtl">` `layout.tsx:116`; `letter-spacing: normal` `globals.css:598`; mailto/tel/code/time `unicode-bidi: isolate` `:599`; ar yazı tipi `Tahoma` (`:589-593`). RTL için e2e kapsam düzeyi: UNKNOWN (yalnız `accessibility.spec.ts:74` locale döngüsü görüldü).

## 6. Test tabanı

- Vitest: `tests/` altında 92 `*.test.ts(x)` + `tests/helpers/attribution-db.ts` (sayım). Statik `it/test(` çağrısı 844 (parametreli olanlar sayılmaz). CI çıktısı: 92 dosya / 1925 test geçti (STATUS `:36`, PR #44 dalı yerelde 1963). `vitest.config.mts`, ortam `node` (`vitest.config.mts:11`; bileşen testleri dosya başına jsdom: UNKNOWN).
- Birim alanları (dosya adlarından): analitik (4), attribution (2), lead/data-request/mail (~15), locale (6), experience (~7), claims/CTA dürüstlüğü, headers, links.
- E2E (Playwright, `playwright.config.ts`): 13 spec (`e2e/*.spec.ts`), tek proje Chromium; `workers:1`, CI'da `retries:2` (`:11-18`); sunucu `next start` önceden build edilmiş (`:37-47`). Statik `test(` sayımı: experience 41, core-routes 17, accessibility 7, data-request 7, motion-consent 7, mobile-navigation 6, claims-section 4... toplam 108 (parametrik hariç). CI: `--grep-invert @hardware-webgl --workers=1 --retries=0` 244 test (`ci.yml:267`, STATUS `:36`).
- A11y: axe `wcag2a/2aa/21a/21aa` (`e2e/accessibility.spec.ts:19`); JS'siz sunucu içeriği görünür (`:170`); 320px taşma `e2e/products-index.spec.ts:31`, `consulting.spec.ts:8`, `experience.spec.ts:167`.
- Lighthouse/CI kapısı yok. Kayıtlı değerler (canlı, 3 koşu, 2026-11-07): ana sayfa mobil 76, masaüstü 91, a11y 100 (STATUS `:39`). Yerel (yüklü makine, gürültülü): mobil 73-74 (3D) / 82 (statik), masaüstü 95 / 99 (PR #50 `adr-003-3d-default.md:19-26`); 03a2 sonrası mobil 74->84 [79-86] (STATUS `:17`). Hedef mobil >=80 açık iş. Bu oturumda ölçüm yok.

## 7. Erişilebilirlik, teknik sınırlar, Netlify/CI

- Skip link: main'de YOK (kaynak taramasında `skip`/`main-content` bulunamadı; `<main>` kimliksiz `layout.tsx:141`). PR #51 (WEB-P0-02d) skip link + `main#main-content` (WCAG 2.4.1) ekler; #49 (02c) 320px/klavye E2E + `/projects` h2 sırası.
- Odak: `.focusable:focus-visible {outline: 2px solid currentColor}` `globals.css:442-446`; form `accent-color` odak rengi `:705`; kontrol çizgisi `--yula-control-line` `:719-721`.
- Menü: modal `<dialog>`, `inert`, `aria-hidden`, Esc kapatma, Tab sınırı `Header.tsx:143-172`; dokunma hedefi 44px `globals.css:707-708` (tema kontrolü).
- Ekran okuyucu: ana sayfa 3D açıkken ekran okuyucu için sahne `aria-hidden="true"` (`SceneHost.tsx:314`).
- Teknik sınırlar: Node `26.9.0`, pnpm `10.33.0` (`netlify.toml:6-7`); Next `15.5.28`, React 19, three `0.185.1` (`package.json`); yayın Netlify (`@netlify/plugin-nextjs 5.16.2`, `netlify.toml:12-13`) + yerel `artifact-proof` eklentisi (`:9-10`); `vercel.json` ve `process.env.VERCEL==="1"` ise Vercel Analytics (`layout.tsx:149`) mevcut ama yayın hedefi Netlify. Netlify kredisi Free plan, bitince deploy atlanır, ayın 6'sı 11:00 TRT yenilenir (vault belleği; repoda kanıt yok: UNKNOWN). Commit başlığında `[skip netlify]` ile deploy atlanır (PR başlıkları #47-#51, #54-55, #62-64).
- CSP: nonce'lu; capability sayfaları kendi politikasını taşır (`next.config.mjs:5-8, 42, 82-92`).
- CI (`.github/workflows/ci.yml`, 478 satır): `pull_request` + `push main` (`:2-6`); tek iş `build-and-test`, `ubuntu-24.04`, 30 dk (`:10-13`), Postgres servisi (`:28`); adımlar bağımsız `continue-on-error` ile koşar, "Final gate" hepsini toplar (`:454-475`): lint, typecheck, unit, `verify:claims:local`, `verify:claims`, `verify:links --no-live`, build, `verify:render-mode`, Chromium kurulumu, E2E, `pnpm audit` (prod+tam, ham çıktı korunur, `:276-299`). Ağaç pini tüm depoyu sabitler: her PR'da pin/makbuz yenileme gerekir (STATUS `:53`). `store-readback.yml` (55 satır) yalnız mağaza okur.
- Ana CI durumu: push `069477c` koşusu `failure`; sebep `core-routes.spec.ts:185` aborted CSS isteği (STATUS `:35`); PR #45 düzeltir.

## 8. Gerçek yayın durumu

Canlı = main `069477c` (Netlify `6aee6f8fc6b7d8c21f0eac44`, 2026-11-07; STATUS `:3`). Açık PR yığını #42-#64 = 23 PR, HİÇBİRİ merge değil (`gh pr list --state open`, 2026-11-09). Merge = Netlify yayını; kurucu onayı gerekir. Yığılı dallar #49,#50,#52,#53,#56,#57,#58 -> #48/#50; #54 -> #50; #55,#59 -> #54 (`baseRefName`); #54 merge olunca `close+reopen` (STATUS `:58`).

| PR | Dal -> taban | Ne değiştirir (tek satır) |
|---|---|---|
| #42 | `docs/agents-md` -> main | AGENTS.md: yığın, kurallar, dokunulmaz listesi |
| #43 | `fix/hardware-webgl-restore` -> main | PageTransition'ın sabit yolculuk sahnesi üstünde kapsayıcı blok bırakmasını düzeltir; `@hardware-webgl` E2E |
| #44 | `feat/WEB-P0-04-claim-state` -> main | Registry'ye `claimState` + present-tense kapısı (ADR-001); 12 `content-*.json` ve testler |
| #45 | `fix/e2e-404-aborted-stylesheet` -> main | Ana CI kırmızısı: 404 E2E'de iptal edilmiş stylesheet isteği sağlamlaştırma (ADR-002) |
| #46 | `docs/yula-execution-status` -> main | `STATUS.md` + `DECISIONS.md` (yürütme durumu, ADR-001..003) |
| #47 | `feat/WEB-P0-02a-tokens` -> main | İki temalı marka tokenları + `contrast-audit.ts` + `e2e/theme-appearance.spec.ts` |
| #48 | `feat/WEB-P0-02b-header-footer` -> main | Minimal header/footer/mobil menü; `nav-config.ts`; rota eşleme belgesi; yeni nav etiketleri 14 dil |
| #49 | `feat/WEB-P0-02c-a11y-wireframe` -> #48 | Mobil wireframe belgesi, 320px a11y/klavye E2E, `/projects` başlık sırası |
| #50 | `feat/WEB-P0-03a-home-skeleton` -> #48 | Ana sayfada yedi sahne iskeleti, ölçüm, ADR-003 önerisi, `home-scenes` E2E |
| #51 | `feat/WEB-P0-02d-skip-link` -> main | Skip link + `main#main-content` (WCAG 2.4.1), `skip-link` E2E |
| #52 | `feat/WEB-P0-03b-s1-identity` -> #50 | Sahne 1 Kimlik + ölçüm belgesi |
| #53 | `feat/WEB-P0-03c-s2-difference` -> #50 | Sahne 2 Fark: üç çift, "mevcut yetenek / vizyonumuz" |
| #54 | `feat/WEB-P0-03a2-mobile-static` -> #50 | Mobil (<=767px) statik varsayılan, ADR-003 "Kabul edildi" |
| #55 | `feat/WEB-P0-03a3-mobile-lcp` -> #54 | Mobil LCP ölçümü + Space Grotesk önyüklemesi kapalı; LCP düşmedi (4235->4233 ms) |
| #56 | `feat/WEB-P0-03g-s6-trust` -> #50 | Sahne 6 Güven: ürün bazında veri akışı |
| #57 | `feat/WEB-P0-03e-s4-engineering` -> #50 | Sahne 4 Ortak mühendislik: mevcut/planlanan ayrı |
| #58 | `feat/WEB-P0-03h-s7-conversion` -> #50 | Sahne 7 Dönüşüm: üç yol, tek iş birliği girişi |
| #59 | `feat/WEB-P0-03f-s5-lab` -> #54 | Sahne 5 Yaşayan laboratuvar: gerçek kayıtlar + şablon |
| #60 | `feat/WEB-P0-05-braavolabs-plan-card` -> main | `/projects/braavolabs` deterministik plan kartı, ağ=0 E2E |
| #61 | `fix/WEB-P0-10-ostinato-free-text` -> main | Ostinato ücretsiz ders metni 40+25'e uyar |
| #62 | `fix/WEB-P0-10b-ostinato-courses` -> main | Ostinato "Kurslar" maddesini uygulama içeriğine uydurur (gitar 240, kulak 50) |
| #63 | `perf/WEB-P0-03a4-defer-webgl-probe` -> main | Mobilde WebGL sondası ilk jeste ertelenir (`SceneHost.tsx`, `scene-route.ts`) |
| #64 | `fix/WEB-P0-07c-rate-limit-ip` -> main | Ortak `clientIp()` (Netlify başlığı > XFF); leads/events/data-request rate limit |

(PR başlıkları ve taban dallar `gh pr list` çıktısından; "ne değiştirir" `gh pr view --json files` dosya listesi + STATUS satırlarından.) Not: STATUS `:49` "#47-#59 CI SUCCESS"; #62-#64 CI "bekleniyor" (STATUS `:29-31`); güncel CI durumu bu oturumda sorgulanmadı: UNKNOWN.

## 9. Veri kaynakları ve ürün kararları

- Statik veri: `src/data/` (13 dosya + `projects/`, 1913 satır): `company.ts` (`socials :69`, iletişim), `projects/*` (8 ürün), `public-registry.ts` (268 satır), `case-studies.ts`, `notes.ts`, `product-presentations.ts`, `product-showcase.ts`, `privacy-copy.ts`, `verification-copy.ts`, `motion-*` (consent, release, store names), `image-dimensions.ts`.
- Üretilen JSON: `public/portfolio-registry.json` (`export:registry`), `links.yulalab.com` tüketir (`netlify.toml:15-20`).
- Veritabanı: PostgreSQL (`pg`, `src/server/db.ts`); şema `YULA_DATABASE_SCHEMA` env; göç `db/migrations/0001..0005` (attribution; leads+consents+outbox; veri talebi doğrulama; erişim sınırı; studio olayları) + `db/operations/{apply,preflight,rollback}` (`apply-0001-0004-atomic.sql`). Prod uygulama durumu UNKNOWN.
- Lead akışı: `/api/leads` -> `src/server/leads.ts` -> outbox -> `/api/mail` (cron) ; rate limit `src/server/rate-limit.ts`; kapı `LEADS_ENABLED==="1"`, VARSAYILAN KAPALI (`src/server/lead-surface.ts:32`); kapalıyken route 503 (`api/leads/route.ts:178`), iletişim formu gizli, mailto açık (`contact/page.tsx:44-49`). Değişiklik yeniden deploy ister (sayfa build'de prerender, `lead-surface.ts:23-25`). `STUDIO_ENABLED==="true"` ayrı anahtar (`studio-surface.ts:8-10`). Form dilleri tr/en.
- Analitik: `/api/events`, `NEXT_PUBLIC_ATTRIBUTION_ENABLED`, `ATTRIBUTION_SECRET` (isim; değer okunmadı). Sır dosyaları okunmadı.
- Ürün kararları (DECISIONS, PR #46): ADR-001 claim durumu mevcut `ProductClaim`'e eklenir, `stale` türetilir, present tense yalnız doğrulanmış+açık pencerede (`DECISIONS.md:5-12`); ADR-002 CI kırmızısı kodda değil testte düzeltilir (`:14-19`); ADR-003 3D varsayılan: main'de AÇIK (`:21-25`), PR #50/#54'te öneri (c) ve KABUL (masaüstü korumalı 3D, mobil statik; STATUS `:16`, PR #50 `adr-003:34-35`). Diğer kararlar: Burun Farkı claim'leri dokunulmaz (STATUS `:38`); mağaza bağlantısı footer'da yok (PR #48 `:32-34`).
- Açık riskler (STATUS `:55-59`): süresi dolmuş claim'ler; birleştirme çakışması `HomeScenes.tsx` (#52,#53,#56,#57,#58); 12 dilde İngilizce yedek sahne metni; Ostinato metin ↔ uygulama (`coming-soon` ama "açık").

## UNKNOWN listesi
1. #47 token adlarının main'dekilerle örtüşmesi / `verify:contrast` main'de yok.
2. Güncel CI durumu #62-#64 (STATUS yazıldığında "bekleniyor").
3. Vaka çalışması slug listesi (`case-studies.ts` kalıbı eşleşmedi).
4. 12 dilin çeviri kalitesi ve RTL e2e kapsamı; sahne metinleri 12 dilde İngilizce yedek.
5. Netlify kredi/ücretsiz plan sınırı repo içi kanıt; canlı deploy ve Lighthouse (76/91/100) bu oturumda yeniden doğrulanmadı.
6. Gerçek cihaz pil/akıcılık, mobil TBT (#63), masaüstü 95->88 farkı (STATUS `:17`).
7. Prod DB'ye göç uygulama durumu.
8. Mobil menü arka plan kaydırma kilidi (yok, #48 belgesi).

## Korunacaklar (değişmez)
- 3D sahne: kalıcı `SceneHost`, yedi/sekiz sahne yolculuğu, doğrusal yedek ve kalite katmanları (`SceneHost.tsx`, `quality.ts`, `scene-route.ts`).
- Animasyonlar: `src/lib/motion.ts` sözlüğü, `PageTransition`, Reveal/StaggerWords, Lenis, reduced-motion sözleşmesi (`globals.css:495-529`).
- Marka sistemi: "YULA Lab" adı, `YulaMark/Emblem`, dört yazı tipi ailesi, dil yedek yazı tipleri (`layout.tsx:22-44`, `globals.css:589-597`).
- Renk tokenları: `--yula-*` koyu/açık takımı ve marka karışımı (`globals.css:603-721`), `THEME_COLORS` (`src/lib/theme.ts:5-8`).
- Dokunulmaz ürünler: Burun Farkı claim'leri; Iron Bank.
