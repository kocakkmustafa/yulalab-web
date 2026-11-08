# YULA Lab marka tokenları (WEB-P0-02a)

Tarih: 2026-11-08 · Dal: `feat/WEB-P0-02a-tokens` · Kaynak: `src/app/globals.css` (`--yula-*`), `src/lib/theme.ts`, `tailwind.config.ts`.
Ölçüm: `pnpm verify:contrast` (WCAG 2.x, `scripts/contrast-audit.ts`); testler: `tests/brand-tokens.test.ts`; tarayıcı: `e2e/theme-appearance.spec.ts`.
Tercih anahtarı DEĞİŞMEDİ: `localStorage["yula.appearance.v1"]` (`light` | `dark` | `system`).
Kapsam dışı ve dokunulmadı: ürün vurgu/marka renkleri (Ostinato altın/ahşap, LifeOS, Braavolabs), header/footer (02b), ana sayfa içeriği (03).

## 1. Karar

Dört aday renk de **uygulandı** (kural: tüm çiftler ≥ 4.5:1 VE `pnpm test` + ilgili Playwright spec'leri yeşil).
- Çiftlerin hiçbiri 4.5'in altına inmedi: en düşük oran açıkta 5.39 (değişmedi; ink-400 / ink-800), koyuda 5.87 → 5.66.
- `pnpm test` 93 dosya / 1933 test yeşil; accessibility, tailwind-migration, responsive, core-routes spec'leri yeşil (core-routes "locale-aware 404 en mobile" tam koşuda bir kez takıldı, tek başına geçti: kararsız, renkle ilgisiz).

| Aday | Önceki | Yeni | Nerede |
|---|---|---|---|
| `#F6F5F0` açık zemin | `#F5F3EE` | `#F6F5F0` | açık `--yula-ink-900`, `--yula-page-bg`, `--yula-page-rgb`, `THEME_COLORS.light` |
| `#111110` açık mürekkep | `#161310` | `#111110` | açık `--yula-ink-50` |
| `#0D0E11` gece zemin | `#0A0A0B` (ink-900), `#030407` (page-bg), `#09060E` (meta) | `#0D0E11` | koyu `--yula-ink-900`, `--yula-page-bg`, `--yula-page-rgb`, `THEME_COLORS.dark` |
| `#E4E4E0` gece metin | `#F4F4F5` | `#E4E4E0` | koyu `--yula-ink-50` |

Önceden dağınık üç koyu zemin (ink-900, page-bg, meta theme-color) tek değere (`#0D0E11`) indi; test (d) bunu kilitler.
Ara basamaklar yeniden türetildi (aynı tonda, sıra korunarak): koyu 850 `17 18 22`, 800 `22 23 27`, 200 `182 182 186`, 100 `208 208 206`; açık 100 `33 32 30`. Koyu 700..500, açık 850..200/300/400/500, surface/hairline, `--yula-focus/warning/success`, `--yula-exp-*` DEĞİŞMEDİ.
Not: `data-request/verify` ve `motion/consent` rotaları kendi satır içi paletini taşır (`#09060e`/`#f5f3ee`); bu görevde dokunulmadı.

## 2. Token tablosu (açık / koyu, rol, kullanım)

Oran: ilgili metin tokenı, o temanın `ink-900` zemininde.

| Token | Açık | Koyu | Rol | Oran (açık / koyu) | Kullanım |
|---|---|---|---|---|---|
| `--yula-ink-900` | `#F6F5F0` | `#0D0E11` | sayfa zemini | – | `html/body`, Tailwind `ink-900` |
| `--yula-ink-850` | `#FFFDF8` | `#111216` | yükseltilmiş zemin | – | kart/panel |
| `--yula-ink-800` | `#EEEAE2` | `#16171B` | gömülü zemin | – | girinti, şerit |
| `--yula-ink-700/600/500` | değişmedi | değişmedi | çizgi/ikincil dolgu | – | kenarlık, ayırıcı |
| `--yula-ink-400` | `#655D55` | `#90909A` | en sönük metin | 5.39 (800 üstünde) / 5.66 | yardımcı not |
| `--yula-ink-300` | `#5C554F` | `#9A9AA3` | sönük metin | 6.71 / 6.92 | alt başlık, etiket |
| `--yula-ink-200` | `#39352F` | `#B6B6BA` | ikincil metin | 11.16 / 9.55 | gövde ikincil |
| `--yula-ink-100` | `#21201E` | `#D0D0CE` | güçlü metin | 14.91 / 12.50 | gövde |
| `--yula-ink-50` | `#111110` | `#E4E4E0` | birincil metin | 17.31 / 15.14 | başlık |
| `--yula-page-bg` / `-rgb` | `#F6F5F0` | `#0D0E11` | opak zemin / yarı saydam katman | – | nav, footer katmanı |
| `--yula-focus` | `#6D36AC` | `#C4B5FD` | odak halkası | ≥ 6.31 | `:focus-visible` |
| `--yula-warning(-strong)` | `#795200` / `#6B4700` | `#FCD34D` / `#FBBF24` | durum metni (amber) | ≥ 5.8 | StatusPill |
| `--yula-success(-strong)` | `#14663F` / `#0D5834` | `#6EE7B7` / `#34D399` | durum metni (emerald) | ≥ 5.83 | StatusPill |

Tüm çiftlerin tam ölçümü (5 metin + 5 vurgu, 3 zemin, 2 tema = 60 çift; eşik 4.5) 5. bölümde.

## 3. Display serif adayı: Newsreader (ADAY, yayında DEĞİL)

Seçim ölçütü: ekran okunaklılığı, 14 dilde yalnız Latin kullanımı, yükleme maliyeti.
- **Newsreader** (Production Type): optik boyut ekseni (6..72) başlıkta yüksek kontrast, küçükte sağlam; ağırlık ekseni. Adaylar: Fraunces (SOFT/WONK eksenleri, karakter baskın, iki ek eksen bayt ve marka riski), Source Serif 4 (güvenli ama daha nötr/kurumsal). Newsreader seçildi.
- Arapça, Japonca, Kiril vb. için mevcut `--font-display` zinciri (html[lang]/dir kuralları) korunur; serif yalnız Latin dillerde, başlıkta.

Lisans kanıtı (2026-11-08, `google/fonts` ana dal):
- `ofl/newsreader/OFL.txt` ilk satırları: "Copyright 2020 The Newsreader Project Authors (http://github.com/productiontype/Newsreader)" / "This Font Software is licensed under the SIL Open Font License, Version 1.1." (HTTP 200)
- `ofl/newsreader/METADATA.pb`: `license: "OFL"`, `date_added: "2020-07-01"`, eksenler `opsz`, `wght`.
- Karşılaştırma: Fraunces ve Source Serif 4 da aynı yoldan `OFL` (Fraunces 2018 / Source Serif 4 2014 telif satırı, SIL OFL 1.1).
- OFL 1.1: gömme/yayın serbest, font tek başına satılamaz, "Reserved Font Name" varsa değiştirilmiş kopya adını taşıyamaz (Google Fonts üzerinden yüklemede değişiklik yok).

Bundle durumu: font dosyası EKLENMEDİ, `layout.tsx`'e yükleme EKLENMEDİ. `tailwind.config.ts`'e yalnız `fontFamily.serif = ["var(--font-serif)", "Georgia", "serif"]` eklendi; `--font-serif` tanımsız olduğundan şu an hiçbir bayt yüklemez ve hiçbir sınıf kullanmıyor.

03b yükleme planı:
```ts
const serif = Newsreader({ subsets: ["latin"], display: "swap", variable: "--font-serif", weight: ["400"], style: ["normal"], axes: ["opsz"] });
```
- Yalnız `latin` altkümesi, yalnız kullanılan ağırlık (başlık için tek: 400, gerekirse 500), italik yok; `preload` yalnız Latin dillerde ve yalnız başlığın göründüğü rotada.
- Bayt etkisi (ölçülen): Google Fonts CSS2 `Newsreader:opsz,wght@6..72,400` latin alt kümesi tek woff2 = **57.300 bayt** (opsz değişkenli). `opsz` eksenini atmak (statik örnek) için tahmin: UNKNOWN (03b'de `next build` çıktısıyla ölçülecek). Lighthouse mobil etkisi: UNKNOWN; 76'nın altına inerse 03b'de `opsz` kaldırılır ya da serif geri çekilir.

## 4. Geri alma

- Renk: `git revert <bu dalın ilk commit'i>` yeterli; `globals.css` üç blok + `theme.ts` + iki test beklentisi aynı commit'te. Hızlı elle: `THEME_COLORS` ve `--yula-page-bg/-rgb/ink-900/ink-50` değerlerini 1. bölüm "Önceki" sütununa döndür.
- Font: değişiklik yok (yalnız fallback'li `fontFamily.serif`); silmek tek satır.
- Anahtar `yula.appearance.v1` zaten değişmedi, kullanıcı tercihleri korunur.

## 5. Tam kontrast tablosu (uygulama sonrası)

Önceki ölçüm: açık min 5.39, koyu min 5.87 (aynı 60 çift, hepsi geçti).

| Tema | Metin | Zemin | Oran | Sonuç |
|---|---|---|---|---|
| dark | ink-50 #E4E4E0 | ink-900 #0D0E11 | 15.14 | geçti |
| dark | ink-100 #D0D0CE | ink-900 #0D0E11 | 12.50 | geçti |
| dark | ink-200 #B6B6BA | ink-900 #0D0E11 | 9.55 | geçti |
| dark | ink-300 #9A9AA3 | ink-900 #0D0E11 | 6.92 | geçti |
| dark | ink-400 #90909A | ink-900 #0D0E11 | 6.10 | geçti |
| dark | focus #C4B5FD | ink-900 #0D0E11 | 10.45 | geçti |
| dark | warning #FCD34D | ink-900 #0D0E11 | 13.39 | geçti |
| dark | warning-strong #FBBF24 | ink-900 #0D0E11 | 11.56 | geçti |
| dark | success #6EE7B7 | ink-900 #0D0E11 | 12.66 | geçti |
| dark | success-strong #34D399 | ink-900 #0D0E11 | 10.04 | geçti |
| dark | ink-50 #E4E4E0 | ink-850 #111216 | 14.68 | geçti |
| dark | ink-100 #D0D0CE | ink-850 #111216 | 12.12 | geçti |
| dark | ink-200 #B6B6BA | ink-850 #111216 | 9.26 | geçti |
| dark | ink-300 #9A9AA3 | ink-850 #111216 | 6.71 | geçti |
| dark | ink-400 #90909A | ink-850 #111216 | 5.92 | geçti |
| dark | focus #C4B5FD | ink-850 #111216 | 10.14 | geçti |
| dark | warning #FCD34D | ink-850 #111216 | 12.98 | geçti |
| dark | warning-strong #FBBF24 | ink-850 #111216 | 11.21 | geçti |
| dark | success #6EE7B7 | ink-850 #111216 | 12.28 | geçti |
| dark | success-strong #34D399 | ink-850 #111216 | 9.74 | geçti |
| dark | ink-50 #E4E4E0 | ink-800 #16171B | 14.05 | geçti |
| dark | ink-100 #D0D0CE | ink-800 #16171B | 11.60 | geçti |
| dark | ink-200 #B6B6BA | ink-800 #16171B | 8.86 | geçti |
| dark | ink-300 #9A9AA3 | ink-800 #16171B | 6.42 | geçti |
| dark | ink-400 #90909A | ink-800 #16171B | 5.66 | geçti |
| dark | focus #C4B5FD | ink-800 #16171B | 9.70 | geçti |
| dark | warning #FCD34D | ink-800 #16171B | 12.42 | geçti |
| dark | warning-strong #FBBF24 | ink-800 #16171B | 10.73 | geçti |
| dark | success #6EE7B7 | ink-800 #16171B | 11.75 | geçti |
| dark | success-strong #34D399 | ink-800 #16171B | 9.32 | geçti |
| light | ink-50 #111110 | ink-900 #F6F5F0 | 17.31 | geçti |
| light | ink-100 #21201E | ink-900 #F6F5F0 | 14.91 | geçti |
| light | ink-200 #39352F | ink-900 #F6F5F0 | 11.16 | geçti |
| light | ink-300 #5C554F | ink-900 #F6F5F0 | 6.71 | geçti |
| light | ink-400 #655D55 | ink-900 #F6F5F0 | 5.92 | geçti |
| light | focus #6D36AC | ink-900 #F6F5F0 | 6.94 | geçti |
| light | warning #795200 | ink-900 #F6F5F0 | 6.37 | geçti |
| light | warning-strong #6B4700 | ink-900 #F6F5F0 | 7.61 | geçti |
| light | success #14663F | ink-900 #F6F5F0 | 6.41 | geçti |
| light | success-strong #0D5834 | ink-900 #F6F5F0 | 7.81 | geçti |
| light | ink-50 #111110 | ink-850 #FFFDF8 | 18.59 | geçti |
| light | ink-100 #21201E | ink-850 #FFFDF8 | 16.01 | geçti |
| light | ink-200 #39352F | ink-850 #FFFDF8 | 11.98 | geçti |
| light | ink-300 #5C554F | ink-850 #FFFDF8 | 7.20 | geçti |
| light | ink-400 #655D55 | ink-850 #FFFDF8 | 6.36 | geçti |
| light | focus #6D36AC | ink-850 #FFFDF8 | 7.45 | geçti |
| light | warning #795200 | ink-850 #FFFDF8 | 6.84 | geçti |
| light | warning-strong #6B4700 | ink-850 #FFFDF8 | 8.18 | geçti |
| light | success #14663F | ink-850 #FFFDF8 | 6.88 | geçti |
| light | success-strong #0D5834 | ink-850 #FFFDF8 | 8.39 | geçti |
| light | ink-50 #111110 | ink-800 #EEEAE2 | 15.75 | geçti |
| light | ink-100 #21201E | ink-800 #EEEAE2 | 13.57 | geçti |
| light | ink-200 #39352F | ink-800 #EEEAE2 | 10.15 | geçti |
| light | ink-300 #5C554F | ink-800 #EEEAE2 | 6.10 | geçti |
| light | ink-400 #655D55 | ink-800 #EEEAE2 | 5.39 | geçti |
| light | focus #6D36AC | ink-800 #EEEAE2 | 6.31 | geçti |
| light | warning #795200 | ink-800 #EEEAE2 | 5.80 | geçti |
| light | warning-strong #6B4700 | ink-800 #EEEAE2 | 6.93 | geçti |
| light | success #14663F | ink-800 #EEEAE2 | 5.83 | geçti |
| light | success-strong #0D5834 | ink-800 #EEEAE2 | 7.11 | geçti |
