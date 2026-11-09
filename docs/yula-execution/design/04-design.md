# yulalab.com — Aşama 5: ayrıntılı tasarım (WEB-UX-03)

Tarih: 2026-11-09 · Taban: UX-02 dalı ucu · Karar: `adr-004-yulalab-com-ia-concept.md` (Melez H = K1 daraltılmış 4 kapı + K2 ürün katmanı + K3 yalnız `/transparency` genişlemesi) · Kapsam: yalnız belge. Kod, görsel, renk, sahne, animasyon, tipografi değişikliği YOK; commit/push yok.
Atıf: `01§n` `01-audit.md` · `02§n` `02-mental-model.md` · `03§n` `03-concepts.md` · `ADR§n` ADR-004 · `QA:A11Y-nn/PERF-nn` = QA-UX-01 denetim listesi maddesi · `PR #n:dosya` açık PR dalındaki dosya (main'de YOK) · `PP` = `src/components/projects/ProductPage.tsx` · `tr.json` = `messages/tr.json`. Sayı/kullanıcı/başarı göstergesi uydurulmadı; bilinmeyen UNKNOWN. `[Ö]` = QA-UX-01'deki öneri eşiği (değiştirilebilir).
Değişmez sınır: `src/components/experience/` dizininin tamamı, `src/lib/motion.ts`, `PageTransition`, marka, `--yula-*` tokenları, dört yazı tipi korunur (01§Korunacaklar; 02§4). Bu belge yalnız sayfa düzeni, bilgi mimarisi, gezinme, içerik akışı önerir.

## 1. Tasarım vizyonu ve etkileşim felsefesi
**Cümle:** "Önce niyet, sonra yüzey; kanıt her zaman bir tık ötede."
1. **Niyet kapıları, kitle tahmini değil.** Ziyaretçi seçer; seçim hiçbir yerde saklanmaz (kişisel veri yok; 03§2 madde 1 yalnız `sessionStorage` dışında saklamayı yasaklıyordu, bu tasarımda hiç saklama yok). Talimat §2.2 "önce niyet, sonra arayüz".
2. **Her yüzey tek iş yapar.** Ürün kullanıcısı ürün listesine, kurumsal müşteri kapsam ve sınıra, geliştirici kanıta gider; aynı dashboard şablonu yok (talimat §2.2; 02§3 #8: ürünler tek dashboard'a birleştirilmez).
3. **Dürüstlük arayüzün parçası.** Durum rozeti registry'den gelir ("Evet, rozet ekle", 2026-11-09; ADR§7); gerçek hedefi olmayan CTA çizilmez (`PP:226-244`); boş yer uydurmayla doldurulmaz, "henüz yok" yazılır (`src/app/[locale]/case-studies/page.tsx:52-69`). Kanıt kapısı: `scripts/forbidden-patterns.mjs:13-25`.
4. **Sade başla, derinlik iste.** Ürün kartı → panel → tam sayfa → `/transparency` kaydı; her derinlik kendi URL'sine sahiptir (derin bağlantı; 03§3 madde 1).
5. **Doğrusal belge birincildir.** Sunucu HTML'i zaten tam doğrusal belgedir (`src/components/experience/YulaExperience.tsx:501-510`); yeni bloklar sunucuda render edilir, JS'siz okunur, 3D yalnız sunumdur (ADR-003).
6. **Glass işlevseldir.** Cam = odak yüzeyi (tek); diğer her şey düz yüzey. Ayrıntı §6.
7. **Yeni hareket icat edilmez.** Geçişler mevcut sözlükten (`src/lib/motion.ts:6-14`) ve `PageTransition`'dan gelir (§7).

## 2. Bilgi mimarisi ve navigasyon haritası

### 2.1 Gezinme modeli
Birincil gezinme (header, 4 öğe; PR #48 etiketleriyle uyumlu, `PR #48:src/components/layout/nav-config.ts`): **Ürünler** `/projects` · **Laboratuvar** `/lab` (yeni; #48'de `/notes`) · **Yaklaşımımız** `/manifesto` · **İş Birliği** `/consulting`. Ek: **Kapılar** açılır paneli (ya da `/start` bağlantısı) → 4 kapı. Header CTA "Ürünleri keşfet" `/projects` (`PR #48:nav-config.ts` `HEADER_CTA`). Footer geniş harita (bugün 9 + yasal; `src/components/layout/Footer.tsx:62-159`) aynen kalır; Stüdyo yalnız `STUDIO_ENABLED==="true"` iken (`src/server/studio-surface.ts:8-10`).
```
/                  Ana sayfa (3D yolculuk + HomeScenes + kapı şeridi)
├─ /start          Kapılar (yeni)  ── #urunler → /projects
│                                   ── #is      → /consulting
│                                   ── #is-birligi → /contact#yollar
│                                   ── #inceleme → /lab, /transparency
├─ /projects       Ürün evreni (ana ürünler + portföy + süzgeç + panel)
│   └─ /projects/[slug]  Ürün sayfası (8 maddelik karar sırası)
├─ /lab            Laboratuvar hub (yeni): /notes · /operating-system · /case-studies girişi
│   ├─ /notes  ├─ /operating-system  └─ /case-studies(/[slug])
├─ /transparency   Şeffaflık: ürün çapaları + durum özeti + claim kayıtları
├─ /consulting     Kurumsal yol
├─ /contact        İletişim + kitle yolları (iş ortağı/yatırımcı bilgi bölümü)
├─ /manifesto  /studio(koşullu)  /support  /terms
└─ quiet: /privacy(+4)  /delete-account/{lifeos,motion}  (3D inmez; 01§3)
```
### 2.2 Rota envanteri: mevcut 22 + yeni
| # | Rota | Durum | Rol / değişiklik | Atıf |
|---|---|---|---|---|
| 1 | `/` | KALIR | Yolculuk dokunulmaz; yolculuk sonrası kapı şeridi (HomeScenes Sahne 7 genişler) | `src/app/[locale]/page.tsx:34`; `PR #58:src/components/landing/Scene7Start.tsx` |
| 2 | `/projects` | KALIR, düzen değişir | Ürün evreni | `src/app/[locale]/projects/page.tsx:14` |
| 3 | `/projects/[slug]` | KALIR, bölüm sırası değişir | 8 madde karar sırası | `src/app/[locale]/projects/[slug]/page.tsx:38` |
| 4 | `/consulting` | KALIR | Kurumsal yol; zincir kısalır | `src/app/[locale]/consulting/page.tsx:10` |
| 5 | `/manifesto` | KALIR | "Yaklaşımımız" | `.../manifesto/page.tsx:15` |
| 6 | `/transparency` | KALIR, genişler | Ürün çapaları + durum özeti | `.../transparency/page.tsx:27` |
| 7 | `/notes` | KALIR | `/lab` altında listelenir; URL değişmez | `.../notes/page.tsx:12` |
| 8-9 | `/case-studies`, `/[slug]` | KALIR | Boş durum aynen | `.../case-studies/page.tsx:23` |
| 10 | `/operating-system` | KALIR | Lab girişi | `.../operating-system/page.tsx:40` |
| 11 | `/contact` | KALIR, genişler | Kitle yolları bölümü | `.../contact/page.tsx:49` |
| 12 | `/studio` | KALIR | Koşullu, değişmez | `.../studio/page.tsx:55` |
| 13-14 | `/support`, `/terms` | KALIR | Değişmez | 01§1.1 |
| 15-19 | `/privacy`, `/privacy/{braavolabs,burunfarki,lifeos,motion}` | KALIR | Ürün sayfasından doğrudan bağlanır | 01§1.1 |
| 20-21 | `/delete-account/{lifeos,motion}` | KALIR | Değişmez (quiet) | 01§1.1; `PR #48:docs/yula-execution/header-footer-routes.md:29` yetim notu |
| 22 | `/[...rest]` | KALIR | 404 | `.../[...rest]/page.tsx:17-24` |
| N1 | `/start` | **YENİ** | Kapılar sayfası (statik) | ADR§3 |
| N2 | `/lab` | **YENİ** | Lab hub (sunucu bileşeni, mevcut veriden) | ADR§3 |
Yeni sitemap girişleri: `src/app/sitemap.ts:6-24` listesine `/start`, `/lab` (UX-05d/e). `/ledger` YOK (ADR§3).
### 2.3 Eski → yeni yönlendirme tablosu
Hiçbir mevcut rota kaldırılmaz; HTTP yönlendirmesi (301) GEREKMEZ. Davranış eşlemesi:
| Eski giriş | Yeni davranış | Not |
|---|---|---|
| Header "Manifesto/Şeffaflık/Stüdyo/İletişim" (`Header.tsx:19-28`) | Header 4 öğe; diğerleri footer'da (#48 ile aynı mantık) | URL aynı |
| `/contact` "Projenizi konuşalım" → `/consulting` → çapa → mailto (02§1.2 zincir; `contact/page.tsx:96`, `consulting/page.tsx:31,56`) | `/contact` iş yolu doğrudan `/consulting#iletisim` | Zincir 3 adımdan 2'ye |
| `/notes` (header #48: Laboratuvar) | Header "Laboratuvar" → `/lab`; `/notes` olduğu gibi canlı | `nav-config.ts` `HeaderHref` birliğine `/lab` eklenir (çakışma: EK-C) |
| Ana sayfa `/#scene-3-products` | Aynı anchor (kamusal derin bağlantı) | `PR #50:src/components/landing/home-scenes.ts` sözleşmesi |
### 2.4 14 dilin etkisi
- Yeni rotalar `localePath` ile 14 dilde açılır (`localePrefix: "as-needed"`, `src/i18n/routing.ts:4-8`; locale listesi `src/i18n/locales.ts:2-15`).
- Yeni mesaj anahtarları (öneri adları): `nav.gates.*`, `start.*`, `lab.*`, `universe.*` (süzgeç/grup), `status.live`, `status.beta`, `product.sections.*`, `contact.paths.*`, `states.*` (§9). Anahtar paritesi `verify:translations` ile denetlenir (01§5, `scripts/verify-translations.ts:32-38`); çevrilmemiş olan etiketli İngilizce yedekle gider.
- RTL (ar): sıralı liste/panel mantıksal özellikler (`inline-start/end`) ile; e2e kapsamı UNKNOWN (01§5 RTL).
- Form dilleri yalnız tr/en (`verify-translations.ts:86`): kitle yolları bölümü form çizmez, mailto.
- 12 dilde yeni anahtarların insan incelemesi YOK (01§5, UNKNOWN); rapor bu eksikliği açık yazar.

## 3. Bütün temel ekranların listesi
| ID | Ekran | Rota | Sunucu/istemci | Veri kaynağı |
|---|---|---|---|---|
| E1 | Ana sayfa + kapı şeridi | `/` | Sunucu + mevcut yolculuk | `src/data/projects/*`, registry |
| E2 | Kapılar | `/start` | Sunucu | Statik + bağlantılar |
| E3 | Ürün evreni | `/projects` | Sunucu; panel istemci | `public-registry.ts`, `projects/*.ts` |
| E4 | Ürün detay | `/projects/[slug]` | Sunucu (`revalidate=900`, `[slug]/page.tsx:38`) | Registry + `product-showcase.ts` |
| E5 | Demo/simülasyon alanı | `/projects/[slug]#dene` | Sunucu + istemci seçici | Yerel katalog (yalnız Braavolabs, `PR #60`) |
| E6 | Lab | `/lab` (+ `/notes`, `/case-studies`, `/operating-system`) | Sunucu | `notes.ts`, `case-studies.ts` |
| E7 | Şeffaflık/mühendislik | `/transparency` | Sunucu | Registry claim'leri, `product-presentations.ts` |
| E8 | İletişim ve kitle yolları | `/contact`, `/consulting` | Sunucu (+ kapalı form) | `company.ts`, `lead-surface.ts` |
| E9 | Yasal/hesap silme | `/privacy*`, `/delete-account/*`, `/terms`, `/support` | Sunucu (quiet) | `privacy-copy.ts` |
| E10 | Manifesto, operating-system, stüdyo | `/manifesto`, `/operating-system`, `/studio` | Sunucu | Mevcut; düzen değişikliği yok (kapsam dışı: içerik akışı değişmez, yalnız bağlantı eklenir) |
| E11 | 404 | `/[...rest]`, `global-not-found.tsx` | Sunucu | Mevcut |
| E12 | Mobil menü/çekmece | tüm rotalar | İstemci (`<dialog>`, `Header.tsx:143-172`) | `nav-config` |

## 4. Mobil ve masaüstü stratejisi (ADR-003 uyumlu)
- **ADR-003:** masaüstü yetenekli cihazda 3D varsayılan, mobil (<=767px) statik varsayılan (`PR #54:src/components/experience/mobile-default.ts`; 01§3). Bu belge `experience/` dosyalarına dokunmaz; yalnız ona uyar.
- **Kesme noktaları mevcut:** 640/768/1024/1280/1536 (`tailwind.config.ts:9`). Masaüstü gezinme `xl` (>=1280px), altında `<dialog>` menü (`Header.tsx:99,132,143`).
| Konu | Mobil (<768) | Tablet (768-1023) | Masaüstü (>=1024) |
|---|---|---|---|
| Ana sayfa | Statik doğrusal; kapılar dikey 4 satır (akordeon önizleme) | Yolculuk statik/3D `quality.ts` kararına göre | Yolculuk + kapı şeridi 4 sütun |
| Ürün evreni | Tek sütun liste, iki grup başlığı; panel YOK; kart → tam sayfa | 2 sütun kart; panel yok | Sol liste + sağ panel (`.glass`, tek odak) |
| Ürün detay | Tek sütun, sabit mini içindekiler YOK (kısa sayfa), CTA kartın üstünde | Tek sütun | İçerik + sağ sabit erişim kartı |
| Demo | Seçici dikey, sonuç altta | Yan yana | Yan yana |
| Lab / Şeffaflık | Tek sütun, süzgeç açılır liste | 2 sütun | Süzgeç üstte, 2 sütun |
| Gezinme | `<dialog>` menü + "Kapılar" ayrı bölüm olarak menü sonunda (E12) | Aynı `<dialog>` menü | 1024-1279px: `<dialog>` menü (düzen masaüstü, gezinme mobil); >=1280px (`xl`): header 4 öğe + Kapılar paneli (`Header.tsx:99,132,174`) |
- **Dokunma hedefi** >=44x44 tercih, >=24x24 asgari (QA:A11Y-14; `globals.css:707-708` 44px örneği). **320px**: yatay taşma yok (QA:A11Y-05; mevcut `e2e/products-index.spec.ts:31`, `consulting.spec.ts:8`).
- **Mobilde yükleyici yok** (`YulaExperience.tsx:276-282`); masaüstü yükleyici atlanamıyor (02§3 #3) — atlama davranışı `experience/` içinde olduğundan ADR§8 #6'da KURUCU KARARI GEREKİR; bu belge dokunmaz.
- **Mobilde ağır görsel deney yok** (talimat §6.3; QA:PERF-07): yeni bloklar CSS/HTML, canvas eklenmez.
- **Kaydırma:** Lenis yalnız yolculukta (`useSmoothScroll.ts:3-18`); yeni sayfalar yerel kaydırma kullanır.

## 5. Her temel ekranın ayrıntılı wireframe'i
Gösterim: `[ ]` düğme/bağlantı, `( )` durum rozeti (registry'den), `░` düz yüzey (token `surface`), `▓` tek odak cam (`.glass`). Rozet metinleri örnektir, canlı veri registry'den gelir.

### E1 Ana sayfa (`/`)
Masaüstü:
```
+----------------------------------------------------------------------+
| YULA Lab   Ürünler  Laboratuvar  Yaklaşımımız  İş Birliği  [Kapılar v] TR ☾|
+----------------------------------------------------------------------+
|  [ MEVCUT 3D YOLCULUK — dokunulmaz: hero → closing, 8 sahne ]          |
|  (ilk karede ürün adı: sahnenin kendi metni, değişmez)               |
+----------------------------------------------------------------------+
|  HomeScenes (PR #50 sözleşmesi, anchor'lar sabit)                    |
|  S1 Kimlik · S2 Fark · S3 Ürünler · S4 Mühendislik · S5 Lab · S6 Güven |
+----------------------------------------------------------------------+
|  S7  "Ne için buradasın?"  — KAPI ŞERİDİ                              |
|  ░[Ürünleri keşfet] ░[İşime AI] ░[İş birliği ve şirket] ░[İnceleme]  |
|  ▓ seçili/odak kapı önizlemesi: 3 satır + 1 gerçek bağlantı           |
+----------------------------------------------------------------------+
|  Durum şeridi: ürünler (örnek) · aynı sıra · rozet (kayıttan)         |
+----------------------------------------------------------------------+
|  footer (mevcut)                                                     |
+----------------------------------------------------------------------+
```
Mobil (statik varsayılan):
```
+--------------------------+
| ☰ YULA Lab        TR ☾  |
+--------------------------+
| (statik kimlik bloğu)    |
| [Ürünleri keşfet]        |   <- tek birincil CTA ilk ekranda
| S1..S6 doğrusal          |
| S7 kapılar: 4 satır      |
|  > Ürünleri keşfet       |
|  > İşime AI              |
|  > İş birliği ve şirket  |
|  > İnceleme              |
| durum şeridi (liste)     |
+--------------------------+
```
Kural: kapı şeridi `YulaExperience` DIŞINDA, yolculuktan sonra; header Kapılar paneli uzun kaydırmayı atlatır (03§2 madde 2, U8). Kapı bağlantıları yalnız mevcut rotalara gider (`PR #58:Scene7Start.tsx` ilkesi: "invents no destination").

### E2 Kapılar (`/start`)
Masaüstü:
```
+----------------------------------------------------------------------+
| header                                                               |
| H1 Ne için buradasın?   (lede: 1 cümle, iddiasız)                    |
| +-----------+ +-----------+ +-----------------+ +-----------+        |
| |Ürünleri   | |İşime AI   | |İş birliği ve    | |İnceleme   |        |
| |keşfet     | |           | |şirket           | |           |        |
| |kim için   | |kim için   | |kim için         | |kim için   |        |
| |1 gerçek   | |1 gerçek   | |1 gerçek bağlantı| |2 gerçek   |        |
| |bağlantı   | |bağlantı   | |+genel adres     | |bağlantı   |        |
| +-----------+ +-----------+ +-----------------+ +-----------+        |
| ▓ önizleme (seçili kapı; odak/hover) — yalnız 1 cam                  |
+----------------------------------------------------------------------+
```
Mobil:
```
+--------------------------+
| Ne için buradasın?       |
| > Ürünleri keşfet        |  <- 4 satır, düz yüzey, cam yok
|   kim için · [Ürünler]   |
| > İşime AI               |
| > İş birliği ve şirket   |
| > İnceleme               |
+--------------------------+
```
Kitle eşlemesi: users→Ürünleri keşfet; business→İşime AI; partners+investors→İş birliği ve şirket; builders→İnceleme (ADR§3). Seçim saklanmaz.

### E3 Ürün evreni (`/projects`)
Masaüstü:
```
+----------------------------------------------------------------------+
| H1 Ürünler    süzgeç: (Hepsi)(Yayında)(Beta)(Yakında)   Durum özeti (başlık, bağlantı değil) |
+-------------------------------------+--------------------------------+
| ANA ÜRÜNLER                         | ▓ PANEL (seçili ürün)          |
| ░ LifeOS      (Yayında) [App Store] |  LifeOS  (Yayında)             |
| ░ Braavolabs  (Beta)    [Web][iOS]  |  değer önerisi · tek cümle     |
| ░ Ostinato    (Yakında) [Haber ver] |  [Erişim: gerçek hedef]        |
| PORTFÖY                             |  gizlilik · durum · ekran/boş  |
| ░ Burun Farkı (Yayında) [Web]       |  [Tam sayfayı aç →]            |
| ░ Gravita     (Yakında)             |                                |
| ░ Lissom · JabLab · Choreia         |                                |
+-------------------------------------+--------------------------------+
```
Mobil:
```
+--------------------------+
| Ürünler  (Hepsi v)       |   <- süzgeç açılır liste
| Ana ürünler              |
| ░ LifeOS (Yayında)  →    |
| ░ Braavolabs (Beta) →    |
| ░ Ostinato (Yakında)→    |
| Portföy                  |
| ░ Burun Farkı (Yayında)→ |
| ░ Gravita … (Yakında)    |
| Durum özeti (kayıttan)   |
+--------------------------+
```
Kurallar: tek sıra kaynağı (ADR§8 #5); panel modal DEĞİL, odak tuzağı yok; seçim `?katman=<slug>` ile URL'de (03§3 K2 yönlendirme planı); panel kapalıyken ekranda `.glass` yok. "Durum özeti" sayıları kayıttan türer, elle yazılmaz (03§3 madde 8). Kart rozetleri kurucu kararı (a) gereği live/beta için de çizilir; araştırma ürünlerinde "Yakında" (`StatusPill.tsx:13`).

### E4 Ürün detay şablonu (`/projects/[slug]`) — §6.2 C'nin 8 maddesi
Sıra karar sırasıdır (03§2 madde 4); mevcut bölüm bileşenleri yeniden dizilir, yeni içerik uydurulmaz.
Masaüstü:
```
+-------------------------------------------------+--------------------+
| [İkon] Ürün adı  (Rozet: durum)                 | ░ ERİŞİM KARTI     |
| (1) DEĞER ÖNERİSİ: eyebrow + lede + pitch       |  (8) İndir/dene/   |
|     (PP:102-153)                                |  erken erişim:     |
| (2) GERÇEK KULLANIM DENEYİMİ: s1Kicker + spec   |  yalnız gerçek     |
|     tablosu (PP:161-203) · akış yoksa "henüz     |  hedef varsa;      |
|     yazılmadı" açıkça                           |  yoksa "Çıkınca    |
| (3) ÖNE ÇIKAN YETENEKLER (ProductFeatures;      |  haber ver" mailto |
|     "Yol haritasında" etiketi korunur)          |  (PP:261-268)      |
| (4) GERÇEK EKRAN / DEMO: ekran görüntüsü ya da  | ░ Destek · Gizlilik|
|     "Örnek simülasyon" (E5) ya da boş durum     |  (doğrudan bağlantı)|
| (5) GİZLİLİK VE GÜVEN: /privacy/<slug> bağlantı |                    |
|     + SSS (ProductShowcase.tsx:49-70)           |                    |
| (6) MEVCUT YAYIN DURUMU: rozet + claim durumu   |                    |
|     → /transparency#<slug> derin bağlantı       |                    |
| (7) GELECEK VİZYONU: yalnız kaynaklı "yol       |                    |
|     haritasında" maddeleri; yoksa gizlenir      |                    |
+-------------------------------------------------+--------------------+
```
Mobil:
```
+--------------------------+
| [İkon] Ürün adı (Rozet)  |
| (1) değer önerisi        |
| ░ (8) ERİŞİM KARTI       |  <- başlığın hemen altı
|   [gerçek hedef/haber    |
|    ver] · Destek · Gizlilik|
| (2) kullanım             |
| (3) yetenekler           |
| > (4) ekran / demo       |  <- (4)-(7) <details>
| > (5) gizlilik ve güven  |
| > (6) yayın durumu       |
| > (7) vizyon (varsa)     |
+--------------------------+
```
Sticky CTA YOK (örtme riski, QA:A11Y-13). Karar sırası: önce değer, sonra erişim.
Madde → kaynak/boşluk eşlemesi:
| # | Madde | Bugünkü kaynak | Boşluk / karar |
|---|---|---|---|
| 1 | Değer önerisi | `PP:102-153` | VAR |
| 2 | Gerçek kullanım | `PP:161-203` | Akış anlatımı yok (02§2 C2); boşsa yazılı boş durum |
| 3 | Yetenekler | `ProductShowcase.tsx:28-35` | VAR |
| 4 | Ekran/demo | `ProductShot` kartta; sayfada yok (`PP:104`; `lifeos.ts:41`, `ostinato.ts:41` `screenshots: []`) | Kayıtta varsa göster; yoksa "ekran görüntüsü henüz yok"; `/transparency` tarihli görüntü bağlantısı |
| 5 | Gizlilik | SSS var, doğrudan bağlantı yok (02§2 C5) | `/privacy/<slug>`; beş Motion ürünü `/privacy/motion` (`src/data/public-registry.ts:216-264`) |
| 6 | Yayın durumu | Claim bloğu sayfadan çıkarılmış (`PP:53-55`) | Rozet + tek satır durum + `/transparency` bağlantısı (05c'de çapasız; 05e `#<slug>` çapasını kurunca bağlantı derinleşir) |
| 7 | Gelecek vizyonu | Yalnız yetenek düzeyinde etiket (`ProductShowcase.tsx:28-35`) | Ayrı bölüm yalnız kayıtlı madde varsa |
| 8 | İndirme/deneme/erken erişim | `PP:226-274`; Ostinato bağlantı yok (`ostinato.ts:88`) | Hedefsiz CTA çizilmez; "Çıkınca haber ver" mailto kalır |

### E5 Demo/simülasyon alanı (`#dene`, yalnız demosu olan ürün sayfasında)
```
Masaüstü                                   Mobil
+---------------------------------------+  +-----------------------+
| DENE  [Örnek simülasyon]  (etiket     |  | DENE [Örnek simül.]   |
|        her zaman görünür)             |  | Örnek seç (3 kart)    |
| Örnek seç: (A) (B) (C)   ░ seçici     |  | ░ sonuç özeti         |
| ░ sonuç özeti (sunucu HTML)           |  | "Verinizi toplamaz"   |
| "Bu ürünün kendisi değildir. Verinizi |  | [Ürüne git →]         |
|  toplamaz." [Ürüne git →]             |  +-----------------------+
+---------------------------------------+
```
Kurallar (talimat §6.2 D; ADR§8 #8): iki etiketten biri zorunlu: "Gerçek ürün yeteneği" ya da "Örnek simülasyon". Kanıt kaydı olmadığı için bugün her demo "Örnek simülasyon". Bugün main'de demo YOK (02§2 D); tek aday `BraavolabsPlanDemo` (`PR #60:src/components/projects/BraavolabsPlanDemo.tsx`), yerel katalog, ağ=0, yalnız tr/en yerel, diğer 12 dilde etiketli İngilizce. Başka ürüne demo icat edilmez; demosu olmayan ürün sayfasında `#dene` bölümü çizilmez. Kullanıcı verisi alınmaz.

### E6 Lab (`/lab`)
Masaüstü:
```
+----------------------------------------------------------------------+
| H1 Laboratuvar   lede: "Gerçek kararlar ve notlar; uydurma veri yok"  |
| ░ Notlar (/notes)             ░ Nasıl çalışıyoruz (/operating-system) |
|   3 giriş · son tarih görünür    kayıt sayıları render anında         |
| ░ Vaka çalışmaları (/case-studies): boş durum: "Henüz dış müşteri      |
|   vakası yok" (case-studies.ts:27, page.tsx:52-69)                   |
| Süzgeç (ürün) · "bu ürün için not yok" açık boş durumu               |
+----------------------------------------------------------------------+
```
Mobil:
```
+--------------------------+
| Laboratuvar              |
| > Notlar (3 giriş)       |
|   son tarih görünür      |
| > Nasıl çalışıyoruz      |
| > Vaka çalışmaları       |
|   "Henüz dış müşteri     |
|    vakası yok"           |
| Ürün süzgeci (açılır)    |
+--------------------------+
```
Not güncelliği tarihle görünür (son giriş 2026-07-10, `notes.ts:17,29,41`). Yeni içerik üretilmez; ADR kayıtları listelenmez (ADR§8 #3). Sahne 5 Lab (#59) ana sayfada kalır; `/lab` aynı veriyi (`scene5-lab.ts`) yeniden kullanabilir (UNKNOWN: veri biçimi PR #59 dalında okunmadı).

### E7 Şeffaflık/mühendislik (`/transparency`)
Masaüstü:
```
+----------------------------------------------------------------------+
| H1 Şeffaflık   [Durum özeti: kayıttan türeyen yayında/beta/araştırma]  |
| Söz · üç sütun · dört ilke (mevcut, transparency/page.tsx:116-186)    |
| ÜRÜN KAYITLARI (id=<slug> çapa, yeni; bugün tek id :189)              |
|  ░ LifeOS   (Yayında)  claim: kanıt türü · kapsam · verifiedAt · durum |
|  ░ Braavolabs ...      "Güncellik kontrolü bekleniyor" (tr.json:622) |
| Tarihli geliştirme görüntüleri (:212-219)                            |
| ▓ seçili kayıt ayrıntısı (tek cam)                                   |
+----------------------------------------------------------------------+
```
Mobil:
```
+--------------------------+
| Şeffaflık                |
| Durum özeti (kayıttan)   |
| söz · ilkeler (mevcut)   |
| Ürün kayıtları           |
| > LifeOS (Yayında)       |  <- akordeon, id=<slug>
|   claim · kapsam · tarih |
| > Braavolabs (Beta) ...  |
|   "Güncellik kontrolü    |
|    bekleniyor"           |
| Tarihli görüntüler       |
+--------------------------+
```
Süzgeç yok (8 ürün). Kurallar: bayat claim gizlenmez (01§4 süre durumu); `claimState` etiketi #44 birleşince metinle çizilir (`PR #44:src/lib/types.ts`); yeni claim yazılmaz. K3 bu ekranla sınırlıdır (ADR§3).

### E8 İletişim / kitle yolları (`/contact`, `/consulting`)
Masaüstü:
```
+----------------------------------------------------------------------+
| H1 İletişim      (#yollar) Kime ne için?                              |
| ░ Ürün kullanıcısı → destek: support@yulalab.com  [Destek]            |
| ░ Kurumsal        → [İşime AI /consulting]  yula@yulalab.com mailto   |
| ░ İş ortağı ve yatırımcı → "Şirket durumu": yasal biçim (company.ts:6-11)|
|     ürün durum özeti · [genel adres mailto]   (ayrı form/CTA YOK)      |
| ░ Geliştirici/araştırmacı → [Lab] [Şeffaflık]  (kod bağlantısı yok)   |
| (Form: yalnız LEADS_ENABLED && tr/en; kapalıyken HİÇ çizilmez)        |
+----------------------------------------------------------------------+
```
Mobil:
```
+--------------------------+
| İletişim                 |
| > Ürün kullanıcısı       |  <- her satır akordeon (<details>)
|   support@ · [Destek]    |
| > Kurumsal               |
|   [İşime AI] yula@       |
| > İş ortağı / yatırımcı  |
|   yasal biçim · özet     |
|   [genel adres mailto]   |
| > Geliştirici            |
|   [Lab] [Şeffaflık]      |
| (form: kapalıyken yok)   |
+--------------------------+
```
Mailto'lar `unicode-bidi: isolate` (`globals.css:599`). `/consulting`: hizmet, süreç, `limits` aynı; "Projenizi konuşalım" doğrudan mailto bölümüne (zincir kısalır). Adres ayrımı `yula@` (iş) / `support@` (destek) metinde açıkça yazılır (02§5 #14; `src/data/company.ts:66-67`).

### E9 Yasal / hesap silme (`/privacy*`, `/delete-account/*`, `/terms`, `/support`) — quiet
Masaüstü / mobil (aynı tek sütun; 3D inmez, `scene-route.ts:8-17`):
```
+-------------------------------+   +---------------------+
| H1 Gizlilik (ürün adı)        |   | H1 Gizlilik         |
| son güncelleme · kapsam       |   | son güncelleme      |
| bölümler (düz metin)          |   | bölümler            |
| veri silme: [/delete-account] |   | [veri silme]        |
| destek: support@              |   | support@            |
+-------------------------------+   +---------------------+
```
Düzen değişikliği yok (kapsam dışı: mağaza URL'leri korunur, 01§1.1); yalnız ürün sayfasından doğrudan bağlantı eklenir (E4 madde 5). Cam yok.

### E10 Manifesto, operating-system, stüdyo
Gerekçe: bu üç sayfa mevcut tek sütun içerik sayfalarıdır (`manifesto/page.tsx:15`, `operating-system/page.tsx:40`, `studio/page.tsx:55`); işlevsel bir yeniden düzen ihtiyacı yok, `PageShell` + `PageHeader` çerçevesi aynen kullanılır. Değişen yalnız header etiketi ("Yaklaşımımız") ve sayfa sonuna "İlgili yol" bağlantısı. Stüdyo `STUDIO_ENABLED` kapalıyken `notFound` (`studio-surface.ts:8-10`).
```
Masaüstü                                    Mobil
+---------------------------------------+   +---------------------+
| kicker · H1 · lede   (PageHeader)     |   | kicker · H1 · lede  |
| ░ bölüm ░ bölüm (mevcut kartlar)      |   | ░ bölüm             |
| ░ bölüm                               |   | ░ bölüm             |
| İlgili yol: [Lab] [Şeffaflık] (yeni)  |   | İlgili yol: [Lab]   |
+---------------------------------------+   +---------------------+
```

### E11 404 (`/[...rest]`, `global-not-found.tsx`)
```
Masaüstü                              Mobil
+-------------------------------+     +---------------------+
| H1 Sayfa bulunamadı           |     | Sayfa bulunamadı    |
| "Aradığınız sayfa yok."       |     | [Ana sayfa]         |
| [Ana sayfa] [Ürünler] [Kapılar]|    | [Ürünler] [Kapılar] |
+-------------------------------+     +---------------------+
```
Yeni: Kapılar bağlantısı; yerel yakalayıcı mantığı aynı (`[...rest]/page.tsx:17-24`).

### E12 Header, Kapılar paneli ve mobil menü
Masaüstü (>=1280px):
```
+----------------------------------------------------------------------+
| YULA Lab  Ürünler  Laboratuvar  Yaklaşımımız  İş Birliği  [Kapılar v] TR ☾|
|                                         +--------------------------+ |
|                                         | ░ Ürünleri keşfet        | |
|                                         | ░ İşime AI               | |
|                                         | ░ İş birliği ve şirket   | |
|                                         | ░ İnceleme               | |
|                                         | [Tüm kapılar → /start]   | |
|                                         +--------------------------+ |
+----------------------------------------------------------------------+
```
Panel açılır liste (düz yüzey; `disclosure` deseni, `aria-expanded`), modal değil; Esc ile kapanır, odak tetikleyiciye döner (QA:A11Y-16).
Mobil (`<dialog>` çekmece, `Header.tsx:143-172`):
```
+--------------------------+
| ☰ YULA Lab        TR ☾  |
+--------------------------+   (menü açık)
| Ürünler          (birincil)|
| Laboratuvar      (birincil)|
| İş Birliği       (birincil)|
| Yaklaşımımız               |
| Ana sayfa · İletişim       |
| — Kapılar —                |
| Ürünleri keşfet · İşime AI |
| İş birliği ve şirket       |
| İnceleme                   |
| [Ürünleri keşfet]  TR ☾   |
+--------------------------+
```
Birincil/ikincil ayrımı #48 yapısını izler (`PR #48:nav-config.ts` `primary`, `MOBILE_EXTRA_NAV`). Menü arka plan kaydırma kilidi bugün yok (01§UNKNOWN 8); UX-05d kontrol eder.


## 6. Glass tasarım sisteminin bileşen ve davranış kuralları
Mevcut cam tanımları (DEĞİŞMEZ): `.glass` (`src/app/globals.css:62-77`: koyu taban `rgba(10,10,11,.66)` + `blur(22px) saturate(150%)`, radius 16px), `.glass-accent` (`:119-129`, `--accent` karışımı), ikinci `.glass` tanımı (`:556-561`: `blur(12px)`, radius 3px), kenar `--yula-hairline` (`:702`), yüzey tokenları `surface/raised/inset` (`:614-616`), rota perdesi `blur(10px)` (`:329`), mobil menü `blur(22px)` (`:790`), `.mm-overlay` `blur(12-14px)` (`:480`, `:794`). İki `.glass` tanımından hangisinin hangi kapsamda etkili olduğu UNKNOWN (kaskad/medya kapsamı incelenmedi); UX-05g ölçer.
Kaynakta `.glass` geçen yerler (kaynak geçişi, yorum dahil, render sayısı değil; `experience/` hariç): `ProductShowcase.tsx` 4, `transparency/page.tsx` 4, `ProductPage.tsx` 3, `GlassSheen.tsx` 3, `contact/page.tsx` 2, `manifesto/page.tsx` 2, `privacy/page.tsx` 2, `LeadForm.tsx` 2, `support/page.tsx` 1, `StatCards.tsx` 1, `ProofCard.tsx` 1, `PageShell.tsx` 1, `PageTransition.tsx` 1 (grep `\bglass\b`, bu oturum, yeniden doğrulandı). `experience/` içinde 6 dosyada ek geçişler vardır (korunur). `ProofCard` döngüde çoğaldığında aynı görünümde 2'den fazla etkin blur oluşabilir (QA:PERF-01 riski; ölçüm UNKNOWN).
| Kural | İşlevsel kullanım | Kanıt/atıf |
|---|---|---|
| G1 Tek odak | Bir görünümde en çok 1 `.glass` odak yüzeyi (panel, seçili kayıt, kapı önizlemesi); liste/kart/şerit düz yüzey (token `surface`) | QA:PERF-01 (<=2 blur, `[Ö]`); 03§2 madde 11 |
| G2 İç içe yok | Cam üstünde cam yok; cam üstü metin kendi taban rengiyle kontrastı taşır | QA:A11Y-01, A11Y-04 |
| G3 Metin kontrastı blurdan bağımsız | Taban `rgba(10,10,11,.66)` blur kapalıyken de A11Y-01/02'yi geçmeli; ölçüm "en açık + en koyu arka plan × iki tema" | QA:A11Y-01..04; `globals.css:62-77` yorumu |
| G4 Yarıçap bütçesi | Cam/`backdrop-filter` değerleri 10-22px <= 24px `[Ö]`; yeni değer eklenmez. İSTİSNA ADAYI: `.mesh-default::before/::after` `filter: blur(120px)` (`globals.css:455-462`; `YulaBanner.tsx` kullanır) cam değil dekoratif arka plan; PERF-02 "tek yüzeyde <= 24 px" eşiğini aşar, UX-05g bunu ölçer ve kullanım yerini (`YulaBanner.tsx`) belgeler; değişiklik önerilmez (animasyon/görsel korunur, `.mesh-default` reduced-motion'da durur `:503-504`) | QA:PERF-02 |
| G5 Düz yüzey yedeği | `@supports not (backdrop-filter)` ve `@media (prefers-reduced-transparency: reduce)` altında `.glass` → düz `background` (mevcut `--yula-ink-850` ya da `surface/raised` token), `backdrop-filter: none`. Kaynakta bugün YOK (`@supports` yalnız `animation-timeline`, `globals.css:881,899,918`; `prefers-reduced-transparency` taraması boş). **Yeni renk yok**: yalnız mevcut token kullanılır | QA:PERF-03, PERF-04 |
| G6 Reduced-motion | `.glass:hover::before` parıltısı ve `GlassSheen` azaltılmış harekette durur (mevcut sözleşme `globals.css:495-529` genişletilir, yeni animasyon değil) | QA:A11Y-08, A11Y-09 |
| G7 Odak halkası | Cam üstünde `--yula-focus` halkası >=3:1; sabit header altında kalmaz (`scroll-margin-top`) | QA:A11Y-13; `globals.css:442-446,622` |
| G8 Rozet cam değildir | Durum rozeti düz yüzey + metin + simge; renk tek başına anlam taşımaz | QA:A11Y-24 |
| G9 Dekoratif cam gizli | `GlassSheen`, `.ambient` `aria-hidden` (`PageShell.tsx:30`) | QA:A11Y-15 |
| G10 Ürün vurgusu | `.glass-accent` yalnız ürün sayfasının erişim/odak yüzeyinde; vurgu rengi ürün kaydından (`PP:26-30,49`), yeni vurgu yok | 02§3 #8 |
Kalite katmanı `low` (JS, `quality.ts:99-140`) ile CSS cam yedeği arasındaki bağ UNKNOWN: `experience/` dokunulmaz; bu yüzden G5 yalnız medya/özellik sorgularına dayanır.

## 7. Ekranlar arası geçişler
Mevcut mekanizma korunur: `PageTransition` giden sayfayı bulanıklaştırıp cam perde süpürür (`src/components/layout/PageTransition.tsx:8-15`); perde 720 ms (`globals.css:329-332`); iç sayfa girişi `.page-enter` 700 ms (`:304-306`); kalıcı sahne geçişi 1100 ms easeInOutCubic (`scene-route.ts:35-41`); ton `journey|page|quiet` (`scene-route.ts:6`); hareket sözlüğü `EASE_OUT/EASE_IN`, `DURATION.micro 0.2`, `pageExit 0.2` (`src/lib/motion.ts:6-14`). Reduced-motion: perde gizli, `.reveal` anında (`globals.css:495-529`).
| Geçiş | Kullanılan mevcut davranış | Yeni animasyon? |
|---|---|---|
| Ana sayfa → `/start` `/projects` `/lab` ... | `PageTransition` + `page` tonu (örtü 0.82, `globals.css:242-244`) | Hayır |
| `/projects` liste → panel (masaüstü) | Anlık durum değişimi + `Reveal`/`DURATION.micro` ile görünür; reduced-motion'da anında | Hayır (mevcut sözlük) |
| Panel → tam sayfa | Normal rota geçişi | Hayır |
| Kapı seçimi (E1/E2) | Önizleme içeriği anlık değişir; hareket yok | Hayır |
| Anchor (`#scene-3-products`, `#<slug>`) | Tarayıcı kaydırması; `html.lenis` smooth yalnız yolculukta (`globals.css:36-39`) | Hayır |
| Yasal/quiet rotalar | `quiet` (örtü 0.95), 3D inmez (`scene-route.ts:8-17`) | Hayır |
Kural: yeni anahtar kare, yeni süre, yeni easing eklenmez; panel/kapı değişimi ek animasyon gerektirmeyen anlık durum değişimidir (QA:A11Y-11: durum yalnız animasyonla bildirilmez).

## 8. Gerçek veriyle çalışan ve boş veri durumları
| Yüzey | Gerçek veri | Boş/eksik durum (metin + eylem) |
|---|---|---|
| Ürün kartı/rozet | `lifecycle` registry'den (`src/lib/types.ts:231`), `StatusPill` live/beta/Yakında | Kayıt yoksa kart çizilmez (build hatası sıra korumasıyla, `page.tsx:49-54`) |
| Erişim yolu | `primaryCta`, `surfaces[]` (`types.ts:331-345`) | Hedef yok → "Çıkınca haber ver" mailto (`PP:261-268`) |
| Ekran görüntüsü | `screenshots[]` (`braavolabs.ts:44-53`, `burunfarki.ts:43-67`) | `[]` → "Bu ürün için ekran görüntüsü henüz yok" + `/transparency` tarihli görüntü bağlantısı |
| Demo | Yerel katalog (`PR #60`) | Demo yok → `#dene` bölümü çizilmez |
| Claim/kanıt | `ProductClaim` (`types.ts:277-330`) | Bayat → "Güncellik kontrolü bekleniyor" (`tr.json:622`); claim yok → "Henüz kaynaklı iddia yok" |
| Durum özeti | Kayıttan türeyen sayım | Kayıt okunamazsa özet gizlenir; elle sayı yazılmaz |
| Notlar | `src/data/notes.ts` (3 giriş) | Ürün süzgecinde not yok → "Bu ürün için henüz not yok" |
| Vaka | `caseStudies = []` (`case-studies.ts:27`) | "Henüz dış müşteri vakası yok" (`page.tsx:52-69`) |
| İletişim formu | `leadsEnabled() && supportsLeadIntake(locale)` (`contact/page.tsx:44-49`) | Kapalı → form çizilmez, mailto açık |
| Gizlilik bağlantısı | `privacyUrl` (`public-registry.ts:99,161,204`) | Slug'lı sayfa yoksa `/privacy` merkezi |
Boş durum gerçek veriyle karıştırılmaz: boş durum metni açıkça "yok" der, örnek/uydurma satır içermez (QA:A11Y-18).

## 9. Yüklenme / çevrimdışı / hata / izin reddi / onay durumları
Site büyük oranda statik/sunucu render; kullanıcı eylemli durumlar sınırlıdır.
| Durum | Uygulanır mı | Tasarım | Atıf |
|---|---|---|---|
| Yüklenme | Evet (3D paketi, panel) | Sunucu HTML'i zaten tam içerik; 3D yüklenmesi içeriği bekletmez; panel istemci yükü hafif; yeni uzun yükleyici YOK; iskelet yalnız görsel olmaz (metin `aria-busy`) | `SceneHost.tsx:32-40`; QA:A11Y-19 |
| Çevrimdışı | Kısmi | Sitenin çevrimdışı işlevi yok (PWA yok: UNKNOWN taraması). Yalnız lead formu/analitik gönderimi için "bağlantı yok, tekrar dene / e-posta yazın" metni | QA:A11Y-21; `src/app/api/leads/route.ts:174` |
| Hata | Evet | Lead: 503 `not_accepting_submissions` (`route.ts:178`), 429 rate limit, 413/400 → kullanıcı dilinde neden + mailto yedeği; 404: yerel yakalayıcı (`[...rest]/page.tsx`); WebGL hatası → doğrusal belge (`SceneHost.tsx:226-229`) | QA:A11Y-20 |
| İzin reddi | N/A | Site kamera/mikrofon/konum/bildirim istemez. Ses sorusu `experience/` içinde (`SoundPrompt.tsx:7`), korunur; reddedilirse yeniden sorulmaz (mevcut: oturumda hatırlanır, 02§1.1 s6) | QA:A11Y-22 |
| Onay | Kısmi | Geri alınması zor işlem yok. Lead gönderimi: önce özet + açık onay kutusu (mevcut `consents` tablosu, 01§9); onay/red eşit erişilebilir; veri talebi `/api/data-request` doğrulama sayfası aynen (`data-request/verify/route.ts`) | QA:A11Y-23 |
Her durum: metin + eylem + erişilebilir duyuru (`role="status"`/`aria-live="polite"`; hata alanla ilişkilendirilir).

## 10. Erişilebilirlik ve performans kuralları (QA-UX-01 eşlemesi)
Yüzey = web `[W]`. Karar + kanıt planı her madde için; "SS" ekran görüntüsü, "TA" test adı, "ÖÇ" ölçüm çıktısı; geçici dosya `scratch/<tarih>-<konu>/`.
| Madde | Karar (yulalab.com) | Kanıt planı |
|---|---|---|
| A11Y-01..04 | Cam metni taban katmanıyla kontrastlı; blur kapalı ölçüm şart (G3, G5) | SS×4 + oran tablosu; `contrast-audit.ts` (`PR #47:scripts/contrast-audit.ts`) |
| A11Y-05 | 320px/%200'de taşma yok | Mevcut `e2e/products-index.spec.ts:31`; yeni ekranlara aynı kalıp |
| A11Y-06/07 | Gövde >=16px, satır <=80, aralık >=1.4 `[Ö]`; header/footer 12px mono mevcut (`globals.css:566-567`) | Tip ölçeği tablosu, ihlal listesi |
| A11Y-08/09 | Reduced-motion: `globals.css:495-529` + cam parıltı durur (G6) | Playwright `emulateMedia`, kare farkı |
| A11Y-10 | Ölçüt: 5 sn'den uzun otomatik oynatma durdurulabilir olmalı. Gerçek adaylar: döngü animasyon `.mesh-default` `driftA 40s infinite` (`globals.css:466`; reduced-motion'da durur `:503-504`) ve 3D sahne (reduced-motion'da `SceneHost` `hidden`, `SceneHost.tsx:278-281`; `experience/` korunur). 3.6 sn yükleyici (`YulaExperience.tsx:46-48`) eşiği aşmaz, A11Y-10 adayı değil (atlama sorusu ADR§8 #6'dadır). Sitede video/ses otomatik oynamaz | Kod taraması + `emulateMedia` kare farkı |
| A11Y-11 | Durum metin+simge | SS dizisi |
| A11Y-12/13 | Sıra görsel sırayı izler; panel modal değil; `scroll-margin-top`; skip link `PR #51` | Klavye yürüyüşü TA; `e2e/skip-link` |
| A11Y-14 | >=44px tercih | Ölçü tablosu |
| A11Y-15 | Dekoratif cam `aria-hidden`; rozet metinli; panel `aria-live` değil, `aria-controls` | Playwright snapshot |
| A11Y-16 | Menü `<dialog>` mevcut (`Header.tsx:143-172`); panel modal değil; onay diyaloğu varsa odak kuralı | Klavye TA |
| A11Y-17 | N/A (ADR§10 istisna) | Gerekçe ADR'de |
| A11Y-18..20 | §8, §9 | SS + TA |
| A11Y-21 | Kısmi (ADR§10) | Gerekçe ADR'de |
| A11Y-22 | N/A | Gerekçe |
| A11Y-23 | Kısmi | Lead formu TA |
| A11Y-24/25 | Rozet renk+metin+simge; claim kesin gösterilmez ("Güncellik kontrolü bekleniyor") | Gri tonlama SS |
| PERF-01 | <=2 blur; G1 | DevTools sayımı her temel ekran (ÖÇ) |
| PERF-02 | <=24px; mevcut cam 10-22px; İSTİSNA: dekoratif `.mesh-default` `blur(120px)` (G4, ADR§10; `globals.css:455-462`) | Kod taraması |
| PERF-03/04 | G5 yedek | SS çifti, `@supports not` yolu |
| PERF-05/06 | `NOT_TESTED` (gerçek cihaz yok, 01§UNKNOWN 6) | Cihaz modeli + ÖÇ geldiğinde |
| PERF-07 | Mobil statik (ADR-003); yeni canvas yok | Mobil kayıt |
| PERF-08 | LCP <=2.5 sn / FCP <=1.8 sn mobil `[Ö]`; bugün LCP simüle 4235 ms (`PR #55`; 01§3), mobil Perf 73-84 aralığı gürültülü (01§6) | Lighthouse (`web-yayin-dogrulama`) ÖÇ |
| PERF-09/10 | INP <=200 ms, CLS <=0.1 `[Ö]` | Chrome Performance, Lighthouse |
| PERF-11 | N/A web | ADR istisna |
| PERF-12 | Başlangıç görsel yükü <=500 KB `[Ö]`; ekran görüntüsü yeniden boyutlu | Ağ sekmesi |
| PERF-13 | Mobil perf >=80, a11y >=95; kayıtlı canlı: mobil 76, a11y 100 (01§6) | Lighthouse JSON |
| PERF-14 | UX-05 öncesi/sonrası aynı ekranda karşılaştırma, bozulma >%10 gerekçeli | İki ÖÇ + fark |
Bütçeler `[Ö]` işaretli eşikler öneridir (QA-UX-01 §1). Lighthouse koşulmadı (makine yükü 70+).

## 11. Yeni ve mevcut bileşenlerin eşleştirilmesi
| Mevcut bileşen / dosya | Yeni rol | Değişiklik |
|---|---|---|
| `src/components/common/StatusPill.tsx` | Rozet (live/beta/Yakında) | live/beta çizilir (ADR§7 a); düz yüzey |
| `src/components/landing/ProjectCard.tsx` | Evren listesi kartı (düz yüzey) | Rozet, erişim satırı; `kind:"product"` ekran korunur (`:104,131`) |
| `src/lib/product-index.ts` | Tek sıra/grup kaynağı | Yaşam döngüsü sırası + "ana ürün" alanı (`:44-56`) |
| `src/components/projects/ProductPage.tsx` | Ürün detay şablonu | Bölüm sırası 8 madde; gizlilik/durum bağlantısı |
| `ProductShowcase.tsx` | Yetenek + SSS + fiyat | Sıra değişir, içerik aynı |
| `ProductShot.tsx` / `DevelopmentPreviewSection.tsx` | (4) Ekran | Boş durum metni |
| `ClaimsSection.tsx`, `ProofCard.tsx`, `SourceStamp.tsx` | (6) Durum/kanıt | `claimState` etiketi (#44) |
| `PageShell.tsx`, `SectionHeader.tsx` | Tüm yeni sayfaların çerçevesi | Yok |
| `Header.tsx`, `Footer.tsx`, `nav-config.ts` (#48) | 4 öğe + Kapılar paneli | Kapılar girişi |
| `PR #58:Scene7Start.tsx` | Kapı şeridi gövdesi | 3 yol → 4 kapı |
| `contact/MailCard.tsx`, `LeadForm.tsx` | Kitle yolları kartı / kapalı form | Düzen |
| `experience/*`, `PageTransition.tsx`, `motion.ts` | DOKUNULMAZ | — |
| **YENİ** `GateStrip` | Ana sayfa kapı şeridi | Sunucu bileşeni |
| **YENİ** `GatesPage` (`/start`) | Kapılar | Sunucu |
| **YENİ** `ProductUniverse` + `ProductPanel` | Liste + masaüstü panel; mobilde panel yok | İstemci yalnız panel |
| **YENİ** `StatusSummary` | Kayıttan türeyen durum özeti | Sunucu |
| **YENİ** `LabHub` (`/lab`) | Lab hub | Sunucu |
| **YENİ** `AudiencePaths` | `/contact` kitle yolları | Sunucu |
| **YENİ** `EmptyState` | Ortak boş durum | Sunucu |
| **YENİ** `DemoLabel` | "Örnek simülasyon / Gerçek ürün yeteneği" etiketi | Sunucu |
| **YENİ** CSS yedeği | `.glass` düz yüzey yedeği (G5) | `globals.css`, yeni renk yok |
Yeni bileşenler `src/components/{start,universe,lab}/` altına konur (`experience/` dışı).

## 12. Mevcut ekranlardan yeni deneyime geçiş planı
Aşamalar (her alt bilet bağımsız PR, `main`'e yeni dal; açık PR yığını nedeniyle sıra EK-C'de):
| Bilet | Kapsam | Kabul ölçütü (özet; ayrıntı §14) |
|---|---|---|
| WEB-UX-05a | Tek sıra kaynağı + `StatusPill` live/beta (kurucu kararı a) | Üç sıra tek kaynak; `lifecycleLabels` live/beta dolu; build sıra koruması yeşil |
| WEB-UX-05b | Ürün evreni `/projects` (grup, süzgeç, panel) | Mobilde panel yok; panel modal değil; 320px |
| WEB-UX-05c | Ürün detay 8 madde + demo etiketi + boş ekran + gizlilik bağlantısı | 8 madde sıra; hedefsiz CTA yok |
| WEB-UX-05d | Kapılar: `/start`, kapı şeridi, header Kapılar | Mevcut 22 rota erişilebilir; 14 dil anahtar paritesi |
| WEB-UX-05e | `/lab` hub + `/transparency` ürün çapaları + durum özeti | Boş durumlar yazılı; çapalar benzersiz `id` |
| WEB-UX-05f | `/contact` kitle yolları + `/consulting` zincir kısaltma | Form kapalıyken çizilmez; mailto çalışır |
| WEB-UX-05g | Glass yedek (G5) + a11y/perf denetimi + e2e | QA:PERF-03/04, A11Y-01..04 kanıtı |
Gerçek geçiş sırası (tek sıra, EK-C ile aynı): 05a → 05c → 05b → 05e → 05f → 05d → 05g (gerekçe EK-C). Her adım geri alınabilir (rota silinmez). Netlify/merge/yayın kurucu onayı gerektirir; bu belgede yok.

## 13. UX test senaryoları
Playwright e2e (mevcut: Chromium tek proje, `workers:1`, `playwright.config.ts:11-18`; CI `--grep-invert @hardware-webgl`, `ci.yml:267`) ve elle kontrol listesi. Kullanıcı sayısı/başarı oranı hedefi YOK.
| ID | Yolculuk | Playwright e2e | Elle kontrol |
|---|---|---|---|
| J1 | Ürün kullanıcısı: ana sayfa → Ürünleri keşfet → LifeOS → App Store bağlantısı | `/projects` ilk viewport'ta ürün adı + rozet; LifeOS CTA `href` gerçek; Ostinato'da bağlantı yok, mailto var | 320px'te rozet metni; gri tonlama |
| J2 | Kurumsal: `/` → İşime AI → `/consulting` → mailto | 2 tıkta mailto bölümü; `limits` metni görünür | Konu satırı hazır mı |
| J3 | İş ortağı/yatırımcı: `/start` → İş birliği ve şirket → durum özeti | Çizilmeyen: "yatırım" düğmesi; mailto var; özet sayıları kayıtla eşit | Metin "taahhüt" ima etmiyor |
| J4 | Geliştirici: `/start` → İnceleme → `/transparency#lifeos` | Çapa `id` benzersiz; bayat claim etiketi görünür | Kod CTA'sı yok |
| J5 | Ürün sayfası 8 madde | Bölüm sırası; `/privacy/<slug>` bağlantısı 200; ekran boş durum metni | Her ürün için gözle |
| J6 | Demo: Braavolabs plan kartı | "Örnek simülasyon" etiketi her durumda; ağ isteği=0 | Etiket 14 dilde (yedek) |
| J7 | Lab boş durumu | `/case-studies` "henüz yok" metni; not güncellik tarihi | Ürün süzgeci boş durum |
| J8 | Tema/dil/RTL | axe `wcag2a/2aa/21a/21aa` (`e2e/accessibility.spec.ts:19`), `ar` döngü; açık/koyu | RTL elle (e2e kapsamı UNKNOWN) |
| J9 | Reduced-motion + düşük donanım | `emulateMedia reduced-motion` + `prefers-reduced-transparency`: cam düz; `.scene-host` gizli (`globals.css:495-529`) | Gerçek düşük cihaz (`NOT_TESTED`) |
| J10 | Klavye ve menü | Tab sırası, `<dialog>` odak tuzağı (`Header.tsx:154-170`), skip link | VoiceOver/NVDA yürüyüşü |
| J11 | JS'siz | Sunucu içeriği görünür (`e2e/accessibility.spec.ts:170` kalıbı) | — |
| J12 | Mevcut 22 rota erişilebilirliği | Rota listesi testi (`tests/header-footer-routes.test.ts` kalıbı, #48) tüm sayfaları erişilebilir sayar | — |

## 14. Uygulama backlog'u ve kabul kriterleri
Biçim: `WEB-UX-05x` · ad · bağımlılık · KABUL · + QA-UX-01 §5 cümlesi ("A11Y-01…A11Y-25 ve PERF-01…PERF-14 maddeleri ilgili yüzey için PR'da kanıtla işaretlidir; kalan madde gerekçeli istisna ADR'de, QA-P0-01 durum kodu `TESTING`"). Ortak kabul: `pnpm lint`, `typecheck`, birim, `verify:claims:local`, `verify:translations`, E2E yeşil (01§7 CI); yeni renk/animasyon/sahne dosyası değişikliği 0; PR `ci.yml` pinini yeniler.
| Bilet | Ad | Bağımlılık | KABUL (QA-UX-01 §5 maddeleri) |
|---|---|---|---|
| WEB-UX-05a | Tek sıra + rozet | #44 (claim durumu) ve #61/#62 sonrası ya da onlarla uyumlu | (1) `/`, `/projects`, ürün eyebrow'u aynı sıra; (2) live/beta/Yakında rozeti registry'den; (3) birim test: 8 ürün rozet eşlemesi; QA: A11Y-24, A11Y-14, A11Y-01 |
| WEB-UX-05b | Ürün evreni | 05a | (1) mobilde panel yok; (2) panel modal değil, Esc/odak kuralı; (3) süzgeç klavye; (4) `?katman=` derin bağlantı; QA: A11Y-05, A11Y-12/13, PERF-01, PERF-07 |
| WEB-UX-05c | Ürün detay + demo etiketi | 05a, #60 | (1) 8 madde sırası; (2) hedefsiz CTA yok (test); (3) `/privacy/<slug>` bağlantısı; (3b) durum satırı geçici olarak `/transparency`'ye bağlanır (çapa 05e'de); (4) demo etiketi zorunlu; (5) ekran boş durumu; QA: A11Y-15, A11Y-18, A11Y-25, PERF-12 |
| WEB-UX-05d | Kapılar `/start` + header paneli | 05a, #48, #58, 05e (`/lab` hedefi), 05f (`/contact#yollar` hedefi) | (1) 4 kapı yalnız mevcut rotalara; (2) `/start` + sitemap; (3) 14 dil parite; (4) anchor sözleşmesi bozulmaz; (5) yolculuk etkisi ölçümü (ADR§8 #7); QA: A11Y-12/16, PERF-08..10, PERF-14 |
| WEB-UX-05e | `/lab` + `/transparency` genişlemesi | 05a, #44, #59, 05c (durum bağlantısı çapaya yükseltilir) | (1) `/lab` boş durumlar yazılı; (2) `/transparency#<slug>` çapa benzersiz ve 05c'deki durum bağlantısı çapaya yükseltilir; (3) durum özeti kayıttan, elle sayı yok; (4) bayat claim gizlenmez; QA: A11Y-18, A11Y-24/25 |
| WEB-UX-05f | İletişim ve kitle yolları | #68 | (1) form kapalıyken çizilmez; (2) mailto çalışır; (3) iş ortağı/yatırımcı yatırım-talep CTA'sı yok; (4) kurucu kararı #1-#4 varsayılanıyla; QA: A11Y-20, A11Y-21 (kısmi, yalnız lead formu), A11Y-23 (kısmi) |
| WEB-UX-05g | Glass yedek (G5) | 05b..05f (ölçüm için) | (1) `@supports not`/`prefers-reduced-transparency` düz yüzey; (2) PERF-01 sayımı her temel ekran; (3) iki `.glass` tanımı belgelenir; (4) yeni renk 0; QA: A11Y-01..04, A11Y-08/09, PERF-01..04 |
Yapılmayacaklar: yeni sahne/animasyon, harita, `/ledger`, yeni demo, yeni renk (ADR§9).

## EK-A. §6.2 A-G → bölüm eşlemesi
| Alan | Hangi bölümde / ekranda | Karar özeti |
|---|---|---|
| A Ana sayfa / ilk izlenim | §5 E1, §4, §7 | Yolculuk aynen; kapı şeridi + durum şeridi; mobil statik |
| B Ürün evreni | §5 E3, §11 | Tek sıra, Ana ürünler/Portföy, rozet, süzgeç |
| C Ürün detay (8 madde) | §5 E4 tablosu | Karar sırası; boş durumlar yazılı |
| D İnteraktif demo | §5 E5, §8 | "Örnek simülasyon"/"Gerçek ürün yeteneği" etiketi; yalnız Braavolabs adayı |
| E Laboratuvar | §5 E6, §8 | `/lab` hub; uydurma yok |
| F Mühendislik/şeffaflık | §5 E7, §9 | Ürün çapaları + durum özeti; K3 yalnız burada |
| G1 Ürün kullanıcısı | §5 E2/E3/E8 | Ürünleri keşfet → mağaza/web |
| G2 Kurumsal müşteri | §5 E2/E8 | İşime AI → `/consulting` |
| G3 İş ortağı | §5 E2/E8 | Bilgi + genel adres; ayrı kanal yok (KURUCU KARARI #1) |
| G4 Geliştirici/araştırmacı | §5 E2/E6/E7 | İnceleme; kod CTA'sı yok (KURUCU KARARI #4) |
| G5 Yatırımcı | §5 E8 | Yasal biçim + durum özeti + adres; yatırım düğmesi yok (KURUCU KARARI #1, #2) |

## EK-B. §6.3 istenmeyenlerin her biri nasıl önlenir (talimat 564-571)
| # | İstenmeyen | Nasıl önlenir | Atıf |
|---|---|---|---|
| 1 | Sıradan kurumsal şablon | Niyet kapıları + tek odak cam + işlevli ürün paneli; mevcut 3D yolculuk dokunulmaz; kurumsal "kart ızgarası" yerine karar sırası | 02§3 #1; §1 |
| 2 | Kanıtsız iddia | Her durum registry'den; claim bayatsa etiketli; yasaklı kalıp kapısı; yeni sayı yok | `scripts/forbidden-patterns.mjs:13-25` |
| 3 | Uzun açılış animasyonu | Yeni yükleyici YOK; sunucu HTML'i hemen okunur; mevcut masaüstü yükleyici atlanamıyor → ADR§8 #6 KURUCU KARARI | `YulaExperience.tsx:46-48,276-282` |
| 4 | Mobilde ağır deney | Mobil statik (ADR-003); yeni canvas yok; PERF-07 kanıtı | `PR #54`; §4 |
| 5 | Hepsi canlı ima | Rozet her kartta (live/beta/Yakında); "Ana ürünler" ≠ "yayında"; Ostinato "Yakında" | ADR§7; `StatusPill.tsx:13` |
| 6 | Yüzeysel blog | Yeni içerik üretilmez; Lab yalnız mevcut 3 not + boş durum; tarih görünür | `notes.ts:17,29,41` |
| 7 | Sahte demo | "Örnek simülasyon" etiketi zorunlu; demosuz ürüne demo yok; ağ=0 | E5; 02§2 D |
| 8 | Tek dashboard'a birleştirme | Her ürün kendi sayfası/rengi/erişimi; panel yalnız önizleme, ortak kullanıcı paneli yok | `PP:26-30,49`; 02§3 #8 |

## EK-C. Açık PR yığını (#42-#68) çakışma haritası
Not: #42-#68 = 27 açık PR, hiçbiri merge değil (`gh pr list`, 2026-11-09). Her PR `.github/workflows/ci.yml` ağaç pinine ve çoğu `.github/ci/reviewed-source-changes.json` dosyasına dokunur (`gh pr view --json files`); bu yüzden her UX-05 PR'ı ve öncesindeki her birleştirme pin/makbuz yenilemesi ister (01§7 CI; STATUS `:53`). `ci.yml` pin çakışması = TÜM PR'lar ortak (zorunlu sıralama).
**Yığılı dallar** (`baseRefName`): #49, #50, #52, #53, #56, #57, #58 → #48 ya da #50; #54 → #50; #55, #59 → #54; #67 → #65 (UX-01 dalı); #66, #68 → `main`. #54 birleşince `close+reopen` (01§8; STATUS `:58`). UX-03 dalı (`docs/WEB-UX-03-design`) UX-02 ucundan, bu belgeler yalnız `docs/` değiştirir ama aynı pin yenilemesini ister.
| UX-05 bileti | Dokunacağı dosyalar | Çakışan açık PR (dosya) |
|---|---|---|
| 05a | `StatusPill.tsx`, `product-index.ts`, `src/app/[locale]/page.tsx`, `projects/page.tsx`, `ProjectCard.tsx`, `src/data/projects/*.ts` | #49 (`ProjectCard.tsx`), #50 (`page.tsx`), #54 (`page.tsx`), #44 (`public-registry.ts`, `types.ts`, `proof.ts`), #61/#62 (`ostinato.ts`) |
| 05b | `projects/page.tsx`, `ProjectCard.tsx`, yeni `universe/*` | #49 (`ProjectCard.tsx`) |
| 05c | `ProductPage.tsx`, `ProductShowcase.tsx`, `DevelopmentPreviewSection.tsx` | #60 (`ProductPage.tsx` + yeni demo dosyaları), #61/#62 (`ostinato.ts` içerik) |
| 05d | `Header.tsx`, `Footer.tsx`, `nav-config.ts`, `layout.tsx`, `globals.css`, `HomeScenes.tsx`, `Scene7Start.tsx`, `sitemap.ts` | #48 (Header/Footer/layout/LocaleSwitcher/nav-config; `LocaleSwitcher.tsx` header'da yer değiştirirse), #51 (`layout.tsx`, `globals.css`), #58 (`Scene7Start.tsx`, `globals.css`, `HomeScenes.tsx`), #50 (`HomeScenes.tsx`, `home-scenes.ts`, `page.tsx`); `HomeScenes.tsx` ayrıca #52/#53/#56/#57/#59 ile çakışır (01§8 açık risk) |
| 05e | `transparency/page.tsx`, `ClaimsSection.tsx`, `notes/page.tsx`, `case-studies/page.tsx`, yeni `/lab` | #44 (`transparency/page.tsx`, `ClaimsSection.tsx`), #59 (`notes/page.tsx`, `Scene5Lab.tsx`), #47 (`case-studies/page.tsx`) |
| 05f | `contact/page.tsx`, `consulting/page.tsx`, `LeadForm.tsx` | #68 (`consulting/page.tsx`, `LeadForm.tsx`), #66 (e2e `contact.spec.ts`), #64 (API) |
| 05g | `globals.css`, `e2e/*` | #47 (`globals.css`), #51 (`globals.css`), #58 (`globals.css`) |
Doğrulandı (gh, 2026-11-09): `gh pr view N --repo kocakkmustafa/yulalab-web --json files` ile #47, #48, #50, #51, #54, #58, #59, #60 dosya listeleri kontrol edildi; yanlış iddia çıkmadı, eksik olan #47 `case-studies/page.tsx` (05e satırına) ve #48 `LocaleSwitcher.tsx` (05d) eklendi. #44, #49, #61-#64, #66, #68 önceki sorguda doğrulanmıştı.
Çakışma özeti: `globals.css` #47/#51/#58 (3 PR); `HomeScenes.tsx` #50/#52/#53/#56/#57/#58/#59 (7 PR); `page.tsx` #50/#54; `ProductPage.tsx` yalnız #60; `ProjectCard.tsx` yalnız #49; `ostinato.ts` #61/#62; `transparency/page.tsx`+registry #44; `experience/` dosyalarına #50/#54/#63 dokunur (bu belge dokunmaz).
**Önerilen birleştirme sırası** (kurucu onayıyla, bu belge birleştirme yapmaz; her adım `ci-yesil-merge` ile, `main`'e göre yeniden dalla):
1. Ortak zemin: #45 (CI kırmızısı), #46, #42, #43, #47, #51 (bağımsız, `main`'e).
2. İçerik/veri: #44, #61, #62, #60, #64, #66, #68 (UX-05a/c/e/f'in dosyalarını ÖNCE oturtur).
3. Yığın: #48 → #50 → #54 → #55/#59/#63, sonra Sahne PR'ları #52, #53, #56, #57, #58 (`HomeScenes.tsx` çakışması sırayla çözülür); #49 `ProjectCard`.
4. UX-01/02 belge dalları #65 → #67 → UX-03 dalı.
5. UX-05: 05a → 05c → 05b → 05e → 05f → 05d → 05g (ardışık; 05d en çok çakışan dosyaya dokunduğundan yığın birleştikten sonra).
Alternatif (daha az risk): 05a/05c/05e/05f'i yığından BAĞIMSIZ `main` tabanlı yap (yalnız `ProjectCard.tsx`, `ProductPage.tsx`, `transparency`, `contact` dosyaları), 05d/05g'yi yığın birleştikten sonra aç. UNKNOWN: #62-#68 güncel CI durumu (01§8) ve #47 token adı örtüşmesi (01§UNKNOWN 1).
