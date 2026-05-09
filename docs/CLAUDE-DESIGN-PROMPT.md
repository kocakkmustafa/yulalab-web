# YULA Lab — Claude Design Prompt

> Aşağıdaki briefi olduğu gibi Claude Design'a (claude.ai → "Design" / artifact mode) yapıştırabilirsin. Çıktıyı aldıktan sonra bana ileteceğin tek şey: oluşturulan HTML/React kod blokları. Onları mevcut Next.js iskeletine giydireceğim.

---

## ROL

Sen, yapay zeka odaklı bir girişim stüdyosu olan **YULA Lab** için kurumsal showcase sitesinin (yulalab.com) **art direction + UI tasarımcısısın**. İşin: **tek bir paragraflık iddia: "bu şirket bir şeyleri doğru yapıyor, tasarımları estetik"** dedirten, animasyonları olan, sade ama uğraşılmış olduğu hissedilen, mobilde de aynı izlenimi veren bir landing + alt sayfalar sistemi tasarlamak.

> **Bu site bir ürün değil; bir vitrindir.** Form yok, login yok, ödeme yok, etkileşimli aksiyon yok. İnsan giriyor, etkileniyor, projelerden birine tıklıyor, oradan o projenin gerçek sitesine/uygulamasına gidiyor. Hepsi bu.

## ŞİRKET

- **İsim:** YULA Lab
- **Konum:** İstanbul · Venture Studio
- **Kurucu:** Mustafa Kaan Koçak
- **Tagline (TR):** "Geleceğin ürünlerini bugün tasarlıyoruz."
- **Vizyon:** İnsanların hayatını anlamlı şekilde iyileştiren, yapay zekanın en iyi yanlarını gündelik hayata taşıyan bir ürün ailesi kurmak.
- **Misyon:** Her ürünümüzde şeffaf metodoloji, sade tasarım ve gerçek bir kullanıcı yararını birleştiren bir mühendislik kültürü inşa etmek; yapay zekayı abartmadan, doğru yerde, doğru zamanda kullanmak.
- **Değerler:** Şeffaflık · Sadelik (Craft & Restraint) · Gizlilik (Privacy by Default) · Bilim (Science Over Hype)
- **Hazır marka asseti:**
  - `yulaLabs.png` — şirket logosu / kare amblem
  - `yulaLabsBanner.png` — şirket bannerı (geniş)

## TASARIM HEDEFİ — TEK CÜMLEDE

Linear × Vercel × Stripe × Apple kalitesinde bir kurumsal showcase: koyu (dark-first), tipografi-merkezli, çok beyaz alan, çok az ama hassas animasyon, ortak iskelet üzerinde her projenin **kendi tasarım dilini** yaşatan bir yapı.

> **Abartı yok.** Parıltı, yıldız, parçacık efekti, klişe gradient burst yok. Animasyonlar **fonksiyonel** — scroll-tetikli reveal, hover'da micro-interaction, hero'da yavaş bir mesh / sıvı arkaplan, sayfa geçişlerinde fade-slide. **Hep cubic-bezier(0.16, 1, 0.3, 1)** ve 250–600ms aralığında.

## TONU TARİF EDEN BİR İÇKİ

> Bir Apple keynote izledikten sonra Linear blog yazısı okuyup, Stripe'ın yıllık raporuna göz atmak. Her şey çok az; ama her birinde sanki bir tasarımcı bir hafta uğraşmış.

## ZORUNLU TEKNİK ÇERÇEVE

Çıktın aşağıdaki stack'e doğrudan giydirilebilir olmalı:

- **Framework:** Next.js 15 App Router (RSC). Sayfalar zaten kuruldu — sen sadece UI veriyorsun.
- **Stil:** TailwindCSS 3 (utility-first). Inline `<style>` veya CSS-in-JS kullanma; her şey utility class olsun.
- **Animasyon:** `framer-motion` (zaten yüklü). Animasyonu ihtiyaç olduğunda kullan; gereksiz yere her bloğa `<motion.div>` koyma.
- **İkon:** `lucide-react`. Custom SVG sadece logo bölümlerinde.
- **Font:** `next/font/google` üzerinden — site default'u **Inter** (body) + **Manrope** (display) + **JetBrains Mono** (mono). Proje sayfaları kendi fontunu override eder (aşağıda).
- **Görseller:** `next/image`. Asset path'leri aşağıda.

> **Tailwind 3 kullanıldığı için `@apply` veya custom CSS variable'lardan çekilen renkleri varsay. Ham hex sınırlı tut, mümkün olduğunca Tailwind class kullan; sadece per-project brand renkleri inline `style` ile gelir.**

## SİTE HARİTASI (5 sayfa)

| Route                  | Sayfa adı       | Amaç                                                                                              |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| `/`                    | Landing         | YULA Lab tanıtımı; vizyon/misyon teaser; 3 projeyi görsel kartla göster.                          |
| `/manifesto`           | Manifesto       | Vizyon, misyon, 4 değer kart, kurucu satırı.                                                      |
| `/projects`            | Projeler indeks | 3 projenin büyük, brand-renkli kartları.                                                          |
| `/projects/[slug]`     | Proje showcase  | Her proje **kendi renk/tasarım dilinde** — hero, stats, pitch, features, vision/mission, linkler. |
| `/contact`             | İletişim        | Sade — e-posta CTA, sosyal kartlar.                                                               |

## SAYFA SAYFA NELER İSTİYORUM

### 1) `/` — Landing

**Zorunlu bölümler (üstten alta):**

1. **Sticky header** — sol logo + isim, sağ navigasyon (Ana Sayfa · Manifesto · Projeler · İletişim) + "Projeleri Keşfet" CTA pill. Scroll'da arkaplanı blur olur.
2. **Hero** (split 60/40):
   - Sol: Eyebrow chip "Venture Studio · İstanbul", sonra kocaman display başlık `Geleceğin ürünlerini bugün tasarlıyoruz.`, altında 1 paragraf açıklama, en altta 2 CTA: pill "Projeleri keşfet ↗" (solid foreground) + outline "Manifesto".
   - Sağ: `yulaLabsBanner.png` görseli — 2xl rounded card, soft inner shadow, hafif tilt veya parallax (5–10° max).
   - Arka planda: çok yavaş hareket eden, **siyahın üzerine 3% opacity radial gradient** mesh (40s döngü). Asla parıltı değil — sadece "boşluk yaşıyor" hissi.
3. **Vizyon/Misyon şeridi** — 3 sütun: Vizyon (büyük), Misyon (büyük), CTA "Manifestoyu oku ↗". Üst alt border, hafif muted background.
4. **Şu anda ne inşa ediyoruz** — 3'lü proje kartı grid:
   - Her kart: 64px kare brand-gradient swatch (ikonlu) + kategori eyebrow + büyük proje adı + tagline + "Yayında / Beta / Yakında" pill + "Keşfet →".
   - Kart hover: 1px soft brand-renk border, hafif translateY(-2px), arkaplan rengi muted-bir-ton-açık.
5. **Footer** — 4 sütun: Logo + slogan / Projeler linkleri / Şirket linkleri / Kurucu satırı. Footer içeriğinin tonu mütevazı, ego'suz.

**Toplam görsel hissiyat:** ~2 ekran scroll, çok beyaz alan, tipografi-merkezli. Hero'daki başlık ekranın yarısını kaplayacak büyüklükte.

### 2) `/manifesto`

- Tek sütun, max ~720px genişlik. Sayfanın merkezi tipografi.
- Başlıkta animated reveal (kelime kelime fade-up).
- "Vizyon" ve "Misyon" iki büyük blok — her biri tek paragraf, ama paragraf font-display (Manrope), 3xl→4xl, tracking-tight.
- "Değerlerimiz" — 2x2 kart grid; kartlar minimal, hover'da brand-yok ama hafif scale (0.99 → 1).
- Alta küçük "Kurucu" satırı: isim + rol.

### 3) `/projects` — projeler indeks

- Eyebrow + büyük başlık "Aile." ve 1 paragraf açıklama.
- Aşağıda 2 sütunlu büyük kartlar (mobile'da 1):
  - Üst yarısı: proje brand-gradient'ı arka plan, ortasında ikon + status pill.
  - Alt yarısı: kategori eyebrow + proje adı + tagline + 3 satırlık description + "Sayfayı aç →" link.
  - Hover: Üstteki gradient subtly nefes alır (scale 1 → 1.03, 800ms), alt metin x'te 4px kayar.

### 4) `/projects/[slug]` — Showcase (kritik)

Bu sayfa **her proje için yeniden giydirilebilir** olmalı; veriyi ben Next.js tarafında tipli config dosyalarından besliyorum, sen sadece komponenti tasarlayacaksın. **Sayfanın kendi rengi, kendi fontu, kendi havası var.**

**Tek bileşen istiyorum:** `<ProjectShowcase project={...} others={...} />`. İçinde şu bölümler sırayla:

1. **Hero** — Sol büyük (1.4fr): "← Projeler" nav, kategori eyebrow, dev display başlık (proje adı), tagline, kısa açıklama, 4 CTA pill (Web sitesi / App Store / Play Store / GitHub — proje config'i hangisi varsa). Sağ küçük (1fr): büyük kare card içinde brand-gradient + ortasında proje ikonu/logosu — kart kendisi `aspect-square`, hafif border, 80px brand glow.
2. **Stats** — 4 sütunluk numerik bar (örn. "%40,8 / Top-1", "13.587 / yarış"). Sayılar brand-primary renginde; üst-alt thin border.
3. **Pitch ("Ne yapıyor?")** — Tek paragraf, max-w-3xl, font 2xl-3xl, opacity 80, çok hava.
4. **Features** — Eyebrow + büyük "Detaylar" başlığı + 3 sütunluk 6 kart grid:
   - Her kart: 40px brand-gradient swatch (köşeleri rounded-lg), feature title (lg, semibold), kısa description (sm, opacity 70). Kart kendisi neredeyse görünmez — sadece foreground'un %5'i bg, %15'i border.
5. **Vision / Mission** — 2 sütun, her biri eyebrow + büyük cümle (3xl).
6. **Bağlantılar bölümü** — "Projeyi takip et" başlığı + pill grid (Web / App Store / Play / GitHub / X / Instagram / LinkedIn / YouTube / Discord — varsa). Pill: outline + ikon + label, hover'da bg foreground/5.
7. **Diğer projeler** — Sayfanın altında 2 sütun, her biri minik kart (sol gradient ikon, sağ kategori + isim, sağda ↗). Tıklamayla diğer projeye geçince hero rengi değişmeli — bunu Framer Motion `key={slug}` ile sağlarım, sen sadece geçiş animasyonunu tarif et (cross-fade + 6px slide-up).

**Üç projenin brand kimliği — her biri için ayrı ayrı moodboard yap:**

#### Braavolabs (`/projects/braavolabs`)
- **Kategori:** Otonom AI Şirket İşletim Sistemi
- **Tagline:** "AI şirketin, 10 dakikada kurulur."
- **Background:** `#050810` (neredeyse siyah, hafif mavi)
- **Foreground:** `#e1e2eb`
- **Primary:** `#00d1ff` (cyan)
- **Secondary:** `#4060ff` (cobalt)
- **Accent:** `#6d11ad` (mor)
- **Gradient:** `linear-gradient(135deg, #00d1ff 0%, #4060ff 50%, #6d11ad 100%)`
- **Display font:** Space Grotesk
- **Body font:** Inter
- **Mono font:** JetBrains Mono
- **Mood:** Linear / Superhuman / Vercel — koyu, glass, kobalt rim, animasyonlu mesh.
- **Hero arka plan önerisi:** koyu zemin üzerine 3 katmanlı radial gradient mesh (cyan %4, kobalt %10, mor %8) yavaş drift. Hero kartının arkasında 120px blur'lu brand-gradient halo.
- **Stats örnek satır:** "9 / Primitif", "12 / LLM Sağlayıcı", "~10dk / Kurulum süresi", "6 / Dil".

#### Burun Farkı (`/projects/burunfarki`)
- **Kategori:** Şeffaf AI At Yarışı Analiz Platformu
- **Tagline:** "Duyguyla değil, veriyle."
- **Background:** `#080C16`
- **Foreground:** `#EDE9E0`
- **Primary:** `#FAB81F` (altın)
- **Secondary:** `#FCD25F` (light gold)
- **Accent:** `#D4AF37` (deep gold)
- **Gradient:** `linear-gradient(135deg, #FAB81F 0%, #FCD25F 50%, #8F6D24 100%)`
- **Display font:** Inter
- **Body font:** Inter
- **Mono font:** JetBrains Mono
- **Mood:** Bloomberg Terminal × premium yarış kulübü. Siyah üzerine altın, soft gold glow `0 0 30px -5px rgba(250,184,31,.2)`, ince altın dim border, sermaye piyasası ciddiyeti.
- **Hero arka plan önerisi:** Çok hafif, neredeyse görünmez bir hippodrome silhouette texture (5% opacity üstüne); altın glow halkası logo arkasında.
- **Stats örnek satır:** "%40,8 / Top-1 doğruluk", "%72,2 / Top-3 doğruluk", "13.587 / yarış", "130.930 / koşucu".

#### LifeOS (`/projects/lifeos`)
- **Kategori:** Kişisel Yaşam İşletim Sistemi
- **Tagline:** "Hayatını yönet, AI ile geliş."
- **Background:** `#000000` (saf siyah)
- **Foreground:** `#FFFFFF`
- **Primary:** `#C3F400` (neon lime)
- **Secondary:** `#E9B3FF` (electric violet)
- **Accent:** `#FFB3B5` (rose)
- **Gradient:** `linear-gradient(135deg, #C3F400 0%, #E9B3FF 60%, #FFB3B5 100%)`
- **Display font:** Manrope
- **Body font:** Inter
- **Mood:** "Night Pulse" — siyah, neon lime + electric violet, glassmorphism kartlar, animated rings, cyberpunk-ama-sakin.
- **Hero arka plan önerisi:** Tamamen siyah; kartların arkasında lime glow ve violet glow karışan blob halo (60–80% blur). Hafif gridli arka plan opsiyonel ama taşma riskli — sadeliği koru.
- **Stats örnek satır:** "5 / Hayat alanı", "9+ / Bilimsel algoritma", "AES-256 / Cihaz üstü şifreleme", "0 / Reklam".

### 5) `/contact`

- Çok sade. Eyebrow + "Konuşalım." başlığı + 1 paragraf. Sonra 2 büyük e-posta kartı (Genel + Basın), her biri Mail ikonu + label + adres. Hover'da hafif lift.

## ANIMASYON HARİTASI

| Yer                              | Animasyon                                                              |
| -------------------------------- | ---------------------------------------------------------------------- |
| Tüm sayfa girişleri              | İçerik fade-up 6px, 600ms, ease-out `cubic-bezier(0.16, 1, 0.3, 1)`.   |
| Hero başlık                      | Kelime-kelime stagger (her kelime 40ms gecikme).                       |
| Scroll'da bölüm girişi           | `whileInView` 1 kez, 8px translateY + opacity 0→1, 500ms.              |
| Kart hover                       | translateY(-2px) + border-color brand-primary @ 30%, 250ms.            |
| Project showcase geçişi          | Cross-fade + 6px slide-up, 400ms (route change).                       |
| Background mesh (Braavolabs)     | 3 radial gradient blob, 20–40s drift loop, çok yavaş.                  |
| Logo / ikon                      | Hover'da 3° rotate + 1.05 scale, 300ms.                                |

**Yasak:** `bouncing`, `pulse`, parıltı confetti, lottie spam, neon flicker, parallax mouse-follow.

## ERİŞİLEBİLİRLİK & RESPONSIVE

- WCAG AA kontrast — özellikle proje hero'larında brand-primary üstüne foreground.
- Tüm pill ve linkler keyboard-erişilebilir, focus ring brand-primary outline 2px / offset 2px.
- Breakpoints: 640 / 768 / 1024 / 1280.
- Mobilde header navigasyon → hamburger menü (sade slide panel, sağdan).
- Hero split mobilde alt alta; görsel önce, başlık altta.

## TESLİMAT

Her sayfa için **bağımsız bir HTML/JSX artifact** ver — Tailwind utility'leriyle, tek dosya, ben Next.js component'lerine doğrudan geçirebileceğim formatta. Sıralama:

1. Tek bir `Header` ve `Footer` component'i (tüm sayfalar paylaşır).
2. `LandingPage` artifact'i (yukarıdaki 5 bölüm sırayla).
3. `ManifestoPage` artifact'i.
4. `ProjectsIndexPage` artifact'i.
5. `ProjectShowcasePage` artifact'i — **veriyi prop'tan alacak şekilde**, içinde örnek olarak Braavolabs verisi gömülü olarak göster ki render'ı görelim.
6. `ContactPage` artifact'i.

Her artifact'in başında 1 paragraflık design intent commentary ekle — neden o kararları aldın.

## ÖRNEK İÇERİK (kopyala kullan)

> Hazır metinleri aşağıda veriyorum. Tasarımda bunları kullanırsan ben hiç içeriği değiştirmeden plug-in yapabilirim.

**Hero başlık:** "Geleceğin ürünlerini bugün tasarlıyoruz."

**Hero alt:** "YULA Lab, yapay zeka ve veri odaklı, insanın hayatını sadeleştiren ürünler tasarlayan bir girişim stüdyosudur. Her projemiz; estetik, etik ve etki üçgeninde inşa edilir."

**Vizyon:** "İnsanların hayatını anlamlı şekilde iyileştiren, yapay zekanın en iyi yanlarını gündelik hayata taşıyan bir ürün ailesi kurmak."

**Misyon:** "Her ürünümüzde şeffaf metodoloji, sade tasarım ve gerçek bir kullanıcı yararını birleştiren bir mühendislik kültürü inşa etmek; yapay zekayı abartmadan, doğru yerde, doğru zamanda kullanmak."

**Değerler (4):**
- *Şeffaflık.* "Kara kutu yok. Modellerimizin nasıl karar verdiğini, hangi veriden öğrendiğini açıkça paylaşırız."
- *Sadelik.* "Az ama özenli. Her ekran, her etkileşim üzerinde uğraşıldığını hisseder."
- *Gizlilik.* "Veri sahibi kullanıcıdır. Tasarımlarımız bunu varsayımdan değil, mimariden başlatır."
- *Bilim.* "Trende değil, kanıta yaslanırız. Doğrulanmış yöntemler, ölçülebilir sonuçlar."

**Kurucu:** Mustafa Kaan Koçak — Kurucu & Stüdyo Lideri.

---

## SON KURALLAR

- **Asla şişirme.** Üç bölüm yetiyorsa beş bölüm yapma.
- **Asla emoji yok** site içinde (bu prompt hariç — sen artifact'lere emoji koyma).
- **Asla "Powered by AI" / "Built with Anthropic" rozeti yok.**
- **Resim yokluğunda placeholder kullanma:** projelerin gerçek logo/ikon path'leri var, onları kullan: `/brand/yulalab-logo.png`, `/brand/yulalab-banner.png`, `/projects/braavolabs/logo.png`, `/projects/burunfarki/logo.png`, `/projects/lifeos/icon.png`.
- **CTA dili:** "Keşfet", "Sayfayı aç", "Siteye git", "İletişime geç" — Türkçe ve özlü.

Sonuç:bu siteye bakan biri bir saniye **"hımm bu kim"** desin, ikinci saniye **"bunu yapan adamlar bir şeyleri ciddiye alıyor"** desin, üçüncü saniye en yakın projenin sayfasına tıklasın. Her şey bunun için.
