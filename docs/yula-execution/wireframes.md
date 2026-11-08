# Mobil wireframe — header, menü, footer, ürün kartı, ana sayfa iskeleti (WEB-P0-02c)

Bu belge mevcut davranışı tarif eder; yeni tasarım önermez. WEB-P0-03 (ana sayfa içeriği) bu iskelete başvurur.
Referans ekran görüntüleri (repo dışı, Playwright, `reducedMotion: reduce`, tam sayfa):
`/Users/mustafakaankocak/Developer/YULAlab-AI/scratch/2026-11-08-web-p0-02c/` altında
`tr-390.png`, `tr-320.png`, `projects-390.png`, `projects-320.png`, `menu-open-390.png`, `menu-open-320.png` (menü `/tr/projects` üzerinde açık).

## Kritik kırılma kuralları (390 ve 320 için ortak)

- Mobil menü düğmesi `xl` altında görünür (`xl:hidden`); masaüstü gezinti `xl` ve üstünde. Tablet de mobil düzeni kullanır.
- Dokunma hedefi >= 44 x 44 px: menü düğmesi, kapat düğmesi, menü bağlantıları (`min-h-[44px]`), sosyal ikonlar (`min-h-[44px] min-w-[44px]`).
- Yatay taşma yok: `scrollWidth <= innerWidth` (e2e: `responsive.spec.ts`, `header-footer.spec.ts`, `a11y-keyboard-320.spec.ts`; 320'de `/tr`, `/tr/projects`, `/ar`, `/tr/consulting`).
- Wordmark `shrink-0 whitespace-nowrap`; sıkışan her şey wordmark'ın yanında değil altında kırılır. E-posta adresi `@` işaretinden sonra kırılır (footer, `emailBreakAt`).
- 320 px'te metin satır kırar, taşmaz: eyebrow/kicker 2 satıra düşer, başlık `text-[44px]` ile 2-3 satır, kart başlığı `text-3xl` ile en çok 2 satır. Sabit `min-w` kullanma; grid sütunu `min-w-0` ile daralabilmeli.
- Başlık sırası: `/projects` sayfasında `h1`, kart başlıkları `h2` (`ProjectCard` big varyantı). Ana sayfada ürünler `StaticExperience.tsx` içinde `h2` bölümünün altında `h3` olarak gelir (satır 65 `h2`, satır 82 `h3`). `ProjectCard` compact varyantı (`CompactCard`) hiçbir yerde kullanılmaz (ölü kod); bu belge onu tarif etmez.
- RTL (`/ar`): `dir="rtl"`; mantıksal özellikler (`ms-`/`me-`, `inset-x`) kullan, sabit `left/right` yalnız menü paneli için (`right-0`, panel sağdan kayar) ve `/ar` için ayna kontrolü e2e ile korunur (taşma + axe).
- Reduced-motion: sonsuz/yinelenen animasyon, marquee ve otomatik kaydırma yok; ana sayfada 3D sahne yerine `StaticExperience` (`data-experience-static="true"`, canvas 0). Test: `a11y-keyboard-320.spec.ts`.
- Odak: `.focusable:focus-visible` 2 px outline, 2 px offset, `currentColor` (kodla doğrulandı: `globals.css` satır 442). Tab sırası header, main, footer (e2e ile doğrulandı).
- Bilinen eksik: atlama bağlantısı (skip link) yok, WCAG 2.4.1 (Bypass Blocks). E2E testi `test.fixme` ve `known-gap` anotasyonu ile işaretli. Öneri: ayrı bilet WEB-P0-02d, skip link + `<main id>` + `test.fixme`'yi gerçek teste çevirme (14 dil anahtarı).

## Header (kapalı hâl)

```
390 px                               320 px
+--------------------------------+   +----------------------------+
| [Y] YULA Lab            [ = ]  |   | [Y] YULA Lab        [ = ]  |
+--------------------------------+   +----------------------------+
 h-16, px-6, fixed, saydam ->          aynı; wordmark nowrap,
 kaydırınca blur + hairline            menü düğmesi 44x44
```

- İçerik: wordmark (`Link`, `aria-label="YULA Lab"`) + menü düğmesi (`aria-expanded`, `aria-controls="site-mobile-navigation"`). Dil, tema ve CTA mobilde başlıkta DEĞİL, menü panelinde.
- Ana sayfa (`/`) kendi kompakt çubuğunu taşır (TR, tema, ses, menü; bkz. `tr-390.png`); site başlığı diğer sayfalarda.
- Masaüstü (xl+): 4 bağlantı (`HEADER_NAV`, `nav-config.ts` ile doğrulandı) (Ürünler, Laboratuvar, Yaklaşım, İş Birliği), dil, tema, CTA hapı.

## Mobil menü (açık hâl)

```
390 px                               320 px
+----------+---------------------+   +------+---------------------+
|  (bulanık|  [Y] YULA Lab  [X]  |   | (blr)|  [Y] YULA Lab [X]   |
|  sayfa,  |                     |   |      |                     |
|  tıkla   |  -- Ürünler         |   |      |  -- Ürünler         |
|  =kapat) |   - Laboratuvar     |   |      |   - Laboratuvar     |
|  .mm-    |   - İş Birliği      |   |      |   - İş Birliği      |
|  overlay |  ---------------    |   |      |  ---------------    |
|          |  Ana Sayfa          |   |      |  Ana Sayfa          |
|          |  Yaklaşımımız       |   |      |  Yaklaşımımız       |
|          |  İletişim           |   |      |  İletişim           |
|          |  [Türkçe        v]  |   |      |  [Türkçe       v]   |
|          |  Görünüm [Sistem v] |   |      |  Görünüm [Sistem v] |
|          |  [Projeleri Keşfet] |   |      |  [Projeleri Keşfet] |
+----------+---------------------+   +------+---------------------+
 panel: w-[82%] max-w-sm, sağdan, tam yükseklik (100dvh), kendi içinde kayar
```

- `<dialog id="site-mobile-navigation">` modal; odak kapat düğmesine gider, Tab panel içinde döner (ilk/son sınır tuzağı; `Header.tsx` `onKeyDown` ile doğrulandı, e2e: `mobile-navigation.spec.ts`), Escape ve kaplama tıklaması kapatır ve odağı menü düğmesine geri verir (`mobile-navigation.spec.ts`).
- Üç birincil giriş büyük (`text-3xl`), iki-üç ikincil giriş küçük; dil ve tema yerel `<select>` (etiketli); CTA panelin altında.
- Sınıflar: `mm-overlay`, `mm-item`, `mm-dash`, `mm-close`; panel `data-site-mobile-panel`.

## Ürün kartı

`/projects` (big `ProjectCard`, `h2`), 390 / 320 px, `grid-cols-1` (md: 2 sütun):

```
+------------------------------+
| [görsel / monogram alanı]    |
|  [durum hapı]       01 / 08  |
+------------------------------+
| KATEGORİ (mono, uppercase)   |
| Ürün Adı          <h2>       |
| tagline                      |
| kısa açıklama                |
| Detay                    ->  |
+------------------------------+
```

- Kart tek bağlantıdır (`MotionLink`, `.focusable`); Enter ile açılır. Kayıt sırası: yayında olanlar önce.

Ana sayfa (gerçek DOM, `StaticExperience.tsx`): her ürün `article.staticProduct` (`id=experience-product-<slug>`, `tabIndex=-1`), tek sütun yığılır:

```
+------------------------------+
| 01 / 08            KATEGORİ  |   .productMeta
| [yaşam döngüsü etiketi]      |   .lifecycleRow (varsa)
| Ürün Adı               <h3>  |
| tagline                      |
| kısa açıklama                |
| [ekran görüntüleri (figure)] |   lazy img, width/height ayrılmış
+------------------------------+
```

## Footer

```
390 / 320 px  (grid-cols-2 mobilde; md:grid-cols-5)
+------------------------------+
| [Y] YULA Lab   (2 sütun)     |
| tagline                      |
| KONUM                        |
| [x] [in] [ig]   (44x44 her)  |
+--------------+---------------+
| ÜRÜNLER      | ŞİRKET        |
| ürün x 8     | bağlantılar   |
+--------------+---------------+
| YASAL        | KURUCU/İLETİŞİM|
| ...          | e-posta (@ sonrası kırılır)|
+------------------------------+
| (c) yıl YULA Lab             |
+------------------------------+
```

- `data-site-footer`; mağaza bağlantısı yok (e2e); sosyal ikonlar etiketli (`X`, `LinkedIn`, `Instagram`) ve `target=_blank`. Mobilde liste satırları 44 px dokunma yüksekliği için `LINK_ROWS` sınıfını kullanır.

## Ana sayfa yedi-sahne iskeleti (mobil sıra ve tek mesaj)

Kaynak: `src/components/experience/storyboard.ts` (hero, portfolio, proof, crossing, mission, vision, values, closing, end) ve `StaticExperience.tsx`. Mobilde ve reduced-motion'da sahneler tek sütunlu statik bölümlerdir (`.staticHero`, `.staticSection`); hero `min-height: 100svh - başlık`.

| Sıra | Sahne / bölüm id | Mobil düzen | Tek mesaj (kaynak: `copy`) |
|---|---|---|---|
| 1 | hero `#experience-hero` | kicker, `h1`, lede, danışmanlık bağlantısı, bildirim, "kaydırarak ilerleyin", yedek notu; dikey ortalı | Marka tezi: az ürün, uzun süre düşünülmüş (`hero.title`) |
| 2 | portfolio `#experience-portfolio` | `h2` + ürün kartları tek sütun | Ürünler (`navigation.projects`) |
| 3 | proof `#experience-proof` | `h2` + kanıt kartları, dikey | Kanıt: iddialar ve kaynak (`proof.title`) |
| 4 | crossing | geçiş sahnesi; statikte ayrı bölüm yok | Kanıttan misyona geçiş |
| 5 | mission `#experience-manifesto` | `h2` | Misyon (`mission.title`) |
| 6 | vision `#experience-vision` (mission ile aynı `#experience-manifesto` section'ında, ayrı `article`) | `h2` | Vizyon (`vision.title`) |
| 7 | values `#experience-values` | `h2` + değer maddeleri, dikey | Değerler (`values.title`) |
| – | closing / end | kapanış çağrısı ve footer | Çağrı: İş birliği / iletişim |

- Bölüm başlıkları `h2`; sayfada tek `h1` (hero). 03 bilgisi: metni değiştirirken bu sırayı ve tek `h1` kuralını koru.

## Hangi bileşen hangi sınıfı kullanır (kısa)

| Bileşen | Dosya | Anahtar sınıflar |
|---|---|---|
| Header | `layout/Header.tsx` | `fixed inset-x-0 z-40 h-16`, `xl:hidden`, `focusable`, `min-h-[44px]` |
| Menü paneli | `layout/Header.tsx` | `mm-overlay`, `w-[82%] max-w-sm`, `100dvh` |
| Footer | `layout/Footer.tsx` | `grid-cols-2 md:grid-cols-5`, `LINK_ROWS`, `min-h-[44px]` |
| Ürün kartı (`/projects`) | `landing/ProjectCard.tsx` | `focusable`, `p-7 lg:p-9`, `h2` (big varyant; compact kullanılmıyor) |
| Tema denetimi | `theme/ThemeControl.tsx` | `theme-control`, etiketli `<select>` |
| Ana sayfa statik | `experience/StaticExperience.tsx` | `staticHero`, `staticSection`, `staticProduct` (`Experience.module.css`) |
