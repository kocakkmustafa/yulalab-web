# yulalab.com — Aşama 2: zihinsel model (WEB-UX-01)

Tarih: 2026-11-09 · Taban: `origin/main` `069477c` · Kapsam: yalnız belge. Kod, görsel, renk, animasyon değişikliği ve yeni tasarım önerisi yok (konsept işi UX-02'nindir).
Kaynaklar: `01-audit.md` (atıflar oradan taşındı, bu oturumda kaynakla yeniden doğrulananlar `dosya:satır` ile verilir) · talimat §6.2/6.3/7 (Aşama 2 soruları satır 595-602) · ekran görüntüleri `scratch/2026-11-09-web-ux-01/*.png` (INDEX.md).
Okuma kuralı: **"İhtiyaç"** sütunu kitlenin ulaşmak istediği şeyin mantıksal çıkarımıdır; kullanıcı araştırması, analitik verisi ve kullanıcı sayısı bu oturumda yoktur (UNKNOWN). **"Bugün sitede"** sütunu yalnız kaynakta/ekranda görüleni betimler. Öznel görsel değerlendirme yoktur. Sayı, başarı göstergesi, kullanıcı sayısı yazılmadı.
Kısaltmalar: `PP` = `src/components/projects/ProductPage.tsx`; `tr.json` = `messages/tr.json`; PNG adları `scratch/2026-11-09-web-ux-01/` altındadır; PR etiketi = main'de olmayan, açık PR'daki durum.

## 1. Kitle × 9 soru matrisi

Bugünkü yol özeti (main): Ana sayfa `/` (3D yolculuk, 8 ürün sabit sırada, `src/app/[locale]/page.tsx:16-25`) → `/projects` (tek ızgara, `src/app/[locale]/projects/page.tsx:60-90`) → `/projects/[slug]` (`PP`) → mağaza/web bağlantısı ya da e-posta. Ayrı yollar: `/consulting`, `/contact`, `/transparency`, `/operating-system`, `/notes`, `/case-studies`, `/studio` (varsayılan kapalı).

### 1.1 Ürün kullanıcısı

| # | Soru | İhtiyaç (çıkarım) | Bugün sitede (atıf) |
|---|---|---|---|
| 1 | Hangi sonuca ulaşmak ister? | Kendi sorununa uyan uygulamayı bulmak ve indirmek/denemek. | Kart → ürün sayfası → birincil CTA yalnız gerçek hedef varsa çizilir (`PP:226-244`). LifeOS: App Store bağlantısı var (`src/data/projects/lifeos.ts:100`); Ostinato: bağlantı listesi boş (`src/data/projects/ostinato.ts:88`), yalnız "Çıkınca haber ver" mailto (`PP:261-268`). |
| 2 | Neden açar? | Bir ürünün adını duymuş/arıyor; "ne işe yarar, ücretli mi, güvenli mi" sorusu. | Sekiz kart, kategori + tagline + kısa açıklama (`projects/page.tsx:60-90`); fiyat bölümü (`PP:207`, `src/data/product-showcase.ts:34-38`); gizlilik SSS'si (`src/components/projects/ProductShowcase.tsx:49-70`). |
| 3 | İlk 5 saniyede ne anlamalı? | Hangi ürün, ne yapıyor, nerede alınır. | Ana sayfa ilk karede "Az sayıda ürün. Uzun süre düşünülmüş." + AI danışmanlığı bağlantısı (`tr.json:602-604`); masaüstü ilk karede yükleyici adımları 01-04 görünür, ürün adı yok (`home-desktop.png`); mobil ilk karede ürün adı yok (`home-mobile.png`). Portföy sahnesi metinleri (`tr.json:609-610`) ürün adı değil eylem etiketleridir ("Ürünü incele", "Araştırma notunu oku"); ürün adı bu belgede doğrulanan ilk yer `/projects` ilk karesidir (`projects-mobile.png`: "Aile." + Burun Farkı kartı). |
| 4 | En çok hangi ekrana döner? | Ürün sayfası / mağaza sayfası; siteye dönüş nedeni gizlilik ya da destek. | UNKNOWN (analitik verisi yok; olay toplama `src/app/api/events/route.ts:121` var, çıktısı bu oturumda okunmadı). Kaynakta destek ve gizlilik: footer `src/components/layout/Footer.tsx:149-159`. |
| 5 | Sürekli tekrar ettiği işler? | Site düzeyinde yok; tekrar işleri uygulamanın içindedir. | Sitede tekrarlı iş akışı yok. Uygulama içi işler bu belgenin kapsamı dışı: UNKNOWN (ürün repoları incelenmedi). |
| 6 | Hangi bilgi otomatik gelebilir? | Dil, tema, hareket tercihi, ürün durumu. | Dil: 14 dil, tarayıcı/URL (`src/i18n/routing.ts:4-8`); tema: `light/dark/system` (`src/lib/theme.ts:4`); reduced-motion sözleşmesi (`src/app/globals.css:495-529`); ses sorusu oturumda hatırlanır (`src/components/experience/SoundPrompt.tsx:7`). Hepsi ayarlanabilir, ürün durumu sayfada elle yazılı. |
| 7 | Ne zaman konuşmalı / dokunmalı / incelemeli? | Dokunmak: karttan ürüne geçiş; incelemek: özellik, fiyat, SSS; konuşmak: soru için e-posta. | Dokun: kart bağlantısı (`src/components/landing/ProjectCard.tsx:109`; giriş animasyonu `:115-123`); incele: özellik kartları (`ProductShowcase.tsx:28-35`), spec tablosu (`PP:180-203`), `<details>` SSS (`ProductShowcase.tsx:49-70`); konuş: "E-posta ile sor" mailto (`PP:269-274`). |
| 8 | Hangi karmaşıklık gizlenebilir? | 3D sahne mekaniği, kayıt/claim tazelik ayrıntısı. | Claim tazelik/yayın kanıtı ürün sayfasından `/transparency`'ye taşınmıştır (`PP:53-55`; `src/app/[locale]/transparency/page.tsx:188-205`). Sahne kalite katmanı kullanıcıya otomatik atanır (`src/components/experience/quality.ts:99-140`). |
| 9 | Hangi kritik bilgi asla gizlenmemeli? | Yayın durumu, fiyat/abonelik, gizlilik, "yol haritasında" ayrımı, yasal çekince. | Fiyat görünür (`PP:207`). "Yol haritasında" etiketi her dilde korunur (`ProductShowcase.tsx:28-35`). Çekince (Burun Farkı bahis ürünü değildir) `product.burunfarki.disclaimer`ta (`PP:276-280`). Boşluk: kart/sayfa durumu yalnız "Yakında"yı işaretler; live ve beta için rozet çizilmez (`src/components/common/StatusPill.tsx:13`); ürün sayfasında gizlilik sayfasına doğrudan bağlantı yok (`PP` içinde `privacy` geçmez; bağlantılar `/privacy` merkezinde). |

### 1.2 Kurumsal müşteri

| # | Soru | İhtiyaç (çıkarım) | Bugün sitede (atıf) |
|---|---|---|---|
| 1 | Hangi sonuca ulaşmak ister? | Bir iş problemi için AI danışmanını değerlendirip görüşme başlatmak. | `/consulting`: dört hizmet + teslimat satırı (`src/app/[locale]/consulting/page.tsx:35-42`), dört adımlı süreç (`:44-47`), e-posta bağlantısı (`:56`). |
| 2 | Neden açar? | Somut bir iş akışı/problem var; güvenilir, ölçülü bir ekip arıyor. | Hero "Yapay zekayı işinizde faydaya dönüştürün." (`consulting-mobile.png`); kanıt bölümü "kendi ürünlerimiz" (`consulting/page.tsx:48-52`). |
| 3 | İlk 5 saniyede ne anlamalı? | Ne sunuluyor, kimler için, nasıl başlanır. | `consulting-mobile.png` ilk karede başlık, tek cümlelik giriş, "Projenizi konuşalım" düğmesi görünür; hizmet listesi kaydırınca. Header'da "AI danışmanlığı" bağlantısı (`src/components/layout/Header.tsx:19-28`). |
| 4 | En çok hangi ekrana döner? | `/consulting` ve kapsam/sınır metni; ürün kanıtı için `/projects`, `/transparency`. | UNKNOWN (veri yok). Sayfa içi: `Link /projects` (`consulting/page.tsx:51`). |
| 5 | Sürekli tekrar ettiği işler? | Tedarikçi değerlendirme: referans, kapsam, fiyat, gizlilik sorularını tekrar eder. | Sitede karşılığı yok; fiyat "görüşmede netleşir" (`consulting/page.tsx:58`), müşteri referansı yok ("müşteri referans listesi değildir", `tr.json` consulting.proofBody). |
| 6 | Hangi bilgi otomatik gelebilir? | Konu satırı, ürün adı, dil. | mailto konu satırı hazır (`consulting/page.tsx:24`). `/contact` formu (ürün listesi otomatik gelir, `contact/page.tsx:105-112`) varsayılan KAPALI (`src/server/lead-surface.ts:31-33`); form dili yalnız tr/en. |
| 7 | Ne zaman konuşmalı / dokunmalı / incelemeli? | İncelemek: hizmet, süre, sınırlar; konuşmak: kapsam netleşince. | İncele: hizmetler + `limits` ("gelir artışı, hatasız model çıktısı veya yayın tarihi taahhüt etmeyiz", `tr.json:831`); konuş: tek mailto (`consulting/page.tsx:53-59`). |
| 8 | Hangi karmaşıklık gizlenebilir? | Ürün evreninin geri kalanı, 3D arka plan. | Danışmanlık sayfası `page` tonunda sahne örtüsüyle çizilir (`src/components/experience/scene-route.ts:6`, örtü 0.82 `globals.css:242-244`); ürün detayı sayfada yok, tek bağlantı. |
| 9 | Hangi kritik bilgi asla gizlenmemeli? | Kapsam sınırı, taahhüt edilmeyenler, ücret yöntemi, veri paylaşma uyarısı, gerçek referans durumu. | `limits` ve `terms` görünür (`consulting/page.tsx:45,58`); "Parola, API anahtarı veya gizli müşteri verisi göndermeyin" (`tr.json` consulting.contactBody). Boşluk: "hiçbir dış müşteri işini tamamlamadık" yalnız `/studio` metninde (`tr.json:759`); `/studio` varsayılan kapalı (`src/server/studio-surface.ts:8-10`); danışmanlık sayfasında karşılığı yok. |

Zincir gözlemi: `/contact` "Projenizi konuşalım" bağlantısı `/consulting`'e gider (`contact/page.tsx:96`), oradan aynı etiketli düğme sayfa içi çapaya (`consulting/page.tsx:31`), orada mailto (`:56`): contact → consulting → çapa → e-posta.

### 1.3 İş ortağı

| # | Soru | İhtiyaç (çıkarım) | Bugün sitede (atıf) |
|---|---|---|---|
| 1 | Hangi sonuca ulaşmak ister? | Ortaklık/entegrasyon için doğru kişiye ve koşula ulaşmak. | Ayrı iş ortağı yolu yok. Genel adres kartı: "iş birliği ve basın talepleri" (`tr.json:245`, `contact/page.tsx:116-123`). |
| 2 | Neden açar? | Bir ürünle entegrasyon, dağıtım ya da ortak çalışma fırsatı. | `/contact` ve `/studio` (proje başvurusu, kapalı: `studio-surface.ts:8-10`; `contact-desktop.png` header'ında Stüdyo yok). |
| 3 | İlk 5 saniyede ne anlamalı? | Şirketin kimliği, ölçeği, güvenilirliği. | Ana sayfada kimlik cümlesi (`tr.json:602-604`); `/manifesto` değerler; yasal ünvan "YULA Lab — şahıs işletmesi" (`src/data/company.ts:6-11`). Ölçek/ortak bilgisi: UNKNOWN (sitede yok). |
| 4 | En çok hangi ekrana döner? | `/transparency`, `/operating-system`, ürün sayfaları. | UNKNOWN (veri yok). `/operating-system` "Nasıl çalışıyoruz." (`src/app/[locale]/operating-system/page.tsx:88`), kayıt sayıları render anında hesaplanır (`:70-78`). |
| 5 | Sürekli tekrar ettiği işler? | Ürün durumu ve gizlilik duruşunu yeniden doğrulamak. | `public/portfolio-registry.json` makine-okur kayıt, `links.yulalab.com` tüketir (`netlify.toml:15-20`); sayfa kullanıcıya JSON bağlantısı vermez (UNKNOWN: bağlantı var mı, footer taranmadı). |
| 6 | Hangi bilgi otomatik gelebilir? | Ürün listesi, yayın durumu, gizlilik/destek URL'si. | Kayıt: `slug, lifecycle, surfaces, privacyUrl, supportUrl` (`src/lib/types.ts:331-345`); ürün başına `/privacy/<slug>` (`src/data/public-registry.ts:99,161,204`). |
| 7 | Ne zaman konuşmalı / dokunmalı / incelemeli? | İncele: durum ve gizlilik; konuş: koşul belirince. | İncele: `/transparency` üç sütun + dört ilke (`transparency/page.tsx:116-186`); konuş: mailto (`contact/page.tsx:116-123`). Başvuru formu `LEADS_ENABLED` kapalıyken görünmez (`contact/page.tsx:103-114`). |
| 8 | Hangi karmaşıklık gizlenebilir? | Sahne, ayrıntılı claim tazelik mekaniği. | Claim ayrıntısı `/transparency` altında (`transparency/page.tsx:188-205`). |
| 9 | Hangi kritik bilgi asla gizlenmemeli? | Ürünün gerçek yayın durumu, veri akışı, şirketin hukuki biçimi, kim muhatap. | Yasal biçim `src/data/company.ts:6-11`. Yayın kanıtı yalnız `/transparency`'de; süresi geçmiş claim "Güncellik kontrolü bekleniyor" ile işaretlidir (`tr.json:622`), tüm `expiresAt` 2026-09-18..24 (`public-registry.ts:30-201`). |

### 1.4 Geliştirici / araştırmacı

| # | Soru | İhtiyaç (çıkarım) | Bugün sitede (atıf) |
|---|---|---|---|
| 1 | Hangi sonuca ulaşmak ister? | Yaklaşımı, mimariyi ve doğrulanmış kararları okumak; gerekirse kaynağa/dokümana ulaşmak. | `/operating-system`, `/transparency`, `/notes`. Kaynak kodu, doküman, GitHub bağlantısı yok: `links.github/documentation/pressKit` etiketleri tanımlı (`tr.json:268,278,279`) ama hiçbir ürün kaydı bu türde bağlantı taşımaz (`src/data` taraması: `kind: "github"` yok). |
| 2 | Neden açar? | Bir iddiayı doğrulamak, yaklaşımı öğrenmek, referans almak. | `/transparency` pillars: Braavolabs maliyet/audit, Burun Farkı metodoloji, LifeOS cihaz üstü (`transparency/page.tsx:116-186`). |
| 3 | İlk 5 saniyede ne anlamalı? | Burada gerçek, kaynaklı mühendislik var mı. | Ana sayfada "KANIT DEFTERİ — Her iddia, sınırı ve kaynağıyla birlikte." (`tr.json:615-618`) ikinci yarıda; ilk karede yalnız hero (`home-desktop.png`). |
| 4 | En çok hangi ekrana döner? | Not/changelog akışı, kanıt sayfası. | UNKNOWN (veri yok). `/notes` 3 giriş, üçü de 2026-07-10 (`src/data/notes.ts:17,29,41`); bugüne 122 gün. |
| 5 | Sürekli tekrar ettiği işler? | Yeni sürüm/claim değişikliğini izlemek. | Takip aracı yok (RSS/feed bulunmadı: UNKNOWN, tarama yapılmadı). `case-studies` kasıtlı boş: `caseStudies = []` (`src/data/case-studies.ts:27`); sayfa boşluğunu açıkça yazar (`src/app/[locale]/case-studies/page.tsx:52-69`). |
| 6 | Hangi bilgi otomatik gelebilir? | Makine-okur kayıt, claim kaynağı/kapsamı/sahibi. | `ProductClaim`: kanıt türü, kaynak, kapsam, `verifiedAt/expiresAt` (`src/lib/types.ts:277-330`); `portfolio-registry.json` (`netlify.toml:15-20`). |
| 7 | Ne zaman konuşmalı / dokunmalı / incelemeli? | İncelemek ağırlıklı; konuşmak: hata/soru bildirimi. | İncele: kanıt kartları (`ProofCard`, `transparency/page.tsx:195-200`) ve tarihli geliştirme görüntüleri (`:212-219`); konuş: tek genel mailto. Geliştirici özel kanalı: yok. |
| 8 | Hangi karmaşıklık gizlenebilir? | Üretim/sunum katmanı (3D, geçiş). | Sunucu HTML'i tam doğrusal belge (`src/components/experience/YulaExperience.tsx:501-510`); `quiet` rotalarda 3D paketi inmez (`scene-route.ts:8-10`). |
| 9 | Hangi kritik bilgi asla gizlenmemeli? | Kanıt türü, kapsam, tarih, geçerlilik; "planlanan" ile "var olan" ayrımı. | Claim kapsamı ve süre durumu kartta (`tr.json:615-622`); yol haritası etiketi (`ProductShowcase.tsx:28-35`). Boşluk: claim "durumu" (planned/prototype/stale) main'de yok, yalnız PR #44'te (`claimState`; audit §4). |

### 1.5 Yatırımcı

| # | Soru | İhtiyaç (çıkarım) | Bugün sitede (atıf) |
|---|---|---|---|
| 1 | Hangi sonuca ulaşmak ister? | Şirketin ne ürettiğini, nerede olduğunu ve kimle konuşacağını görmek. | Yatırımcıya özel yol yok. Genel iletişim (`contact/page.tsx:116-123`). Scene 7'nin üç yolu bireysel/iş/mühendis'tir; yatırımcı yolu yok (PR #58 `src/components/landing/Scene7Start.tsx` `PATHS`). |
| 2 | Neden açar? | Ekibin ve portföyün ciddiyetini, yayın gerçeğini değerlendirmek. | `/manifesto` kurucu bölümü (`tr.json` manifesto.founderEyebrow); `/projects` sekiz kart; `/transparency`. |
| 3 | İlk 5 saniyede ne anlamalı? | Ne yapıyor, ne kadar ilerlemiş (dürüstçe). | "Bağımsız ürün laboratuvarı" (`tr.json:601-602`). Sekiz üründen yalnız LifeOS ve Burun Farkı "live", Braavolabs "beta", beşi "research" (`src/data/public-registry.ts:20,104,166,209-259`); bu ayrım ilk karede yok. |
| 4 | En çok hangi ekrana döner? | Çıkarım: kayıt ve kanıt ekranları (`/transparency`, `/projects`); gerçek dönüş verisi yok (UNKNOWN). | Yatırımcı yolu yok (Soru 1). Kayıt ve kanıt `/projects` ve `/transparency`'de (Soru 2); hangisine dönüldüğü ölçülmedi: UNKNOWN. |
| 5 | Sürekli tekrar ettiği işler? | Çıkarım: kayıt ve yayın durumunun güncel kalıp kalmadığını yeniden kontrol etmek; araştırma verisi yok (UNKNOWN). | Takip aracı yok; karşılık yalnız `/notes` girişleri (`src/data/notes.ts:17,29,41`) ve claim `verifiedAt/expiresAt` alanları (`src/lib/types.ts:277-330`). |
| 6 | Hangi bilgi otomatik gelebilir? | Ürün yaşam döngüsü, yayın yüzeyleri. | Kayıt `lifecycle` ve yüzeyler (`src/lib/types.ts:231,247,331-345`). Gelir/kullanıcı/büyüme verisi sitede yoktur ve olmamalıdır (kanıt kapısı: `scripts/forbidden-patterns.mjs:13-25`). |
| 7 | Ne zaman konuşmalı / dokunmalı / incelemeli? | İncelemek: kayıt ve kanıt; konuşmak: ilgi varsa tek adres. | `contact/page.tsx:116-123`. Yatırım odaklı yönlendirme yok. |
| 8 | Hangi karmaşıklık gizlenebilir? | Teknik sahne/performans ayrıntısı. | Aynı ana sayfa doğrusal belge (`YulaExperience.tsx:501-510`). |
| 9 | Hangi kritik bilgi asla gizlenmemeli? | Gerçek yayın durumu, ölçülmemiş olan, bağımsız (şahıs) yapı, müşteri durumu. | Yasal biçim (`company.ts:6-11`); "Sermaye ya da yatırım sağlamıyoruz. Bugüne kadar hiçbir dış müşteri işini tamamlamadık" yalnız `/studio` içinde (`tr.json:759`), `/studio` kapalı. Yatırımcı için bu cümlenin karşılığı açık sayfada: UNKNOWN (karar kurucunundur). |

## 2. §6.2 A-G karşılık tablosu

Durum: VAR / KISMİ / YOK (main `069477c`). "Açık PR etkisi" sütunu PR başlıkları ve dosya listesinden (audit §8) okundu; PR içeriği bu oturumda çalıştırılmadı, görsel doğrulama yapılmadı.

| Alan | Durum (main) | Gerekçe + atıf | Açık PR etkisi (#42-#64, hiçbiri merge değil) |
|---|---|---|---|
| **A. Ana sayfa / ilk izlenim** | KISMİ | Kimlik cümlesi ve danışmanlık bağlantısı ilk karede (`tr.json:602-604`, `home-mobile.png`); sekiz sahne yolculuğu hero→kapanış (`src/components/experience/types.ts:4-12`). Masaüstü ilk karede yükleyici adımları (çizim 3600 ms, `YulaExperience.tsx:46-48`, yalnız yetenekli masaüstü `:276-282`; `home-desktop.png`). Mobilde yolculuk 3D'ye terfi edebilir (canvas=1, `INDEX.md`). Doğrusal yedek tam (`YulaExperience.tsx:501-510`). | #50 yedi sahne iskeleti, #52 sahne 1, #53 sahne 2; #54 mobil statik varsayılan; #55/#63 mobil LCP/sonda; #51 skip link. Hepsi main'de yok. |
| **B. Ürün evreni** | KISMİ | Sekiz kayıt, aynı registry'den (`public-registry.ts`); `/projects` tek ızgara, sıra yaşam döngüsü + doğrulama tarihine göre (`src/lib/product-index.ts:44-56`). Her kartta kategori, tagline, kısa metin; yalnız "Yakında" rozeti (`StatusPill.tsx:13`). Üç ayrı sıra: ana sayfa (`page.tsx:16-25`), `/projects` (rank), ürün eyebrow numarası (LifeOS "Ürün 01", Braavolabs "Ürün 03", `tr.json` product.*.eyebrow). Erişim yolu: yalnız LifeOS/Braavolabs/Burun Farkı (`lifeos.ts:100`, `braavolabs.ts:129-131`, `burunfarki.ts:156-160`). | #56 sahne 6 (ürün bazında güven akışı), #61/#62 Ostinato metni uygulamaya uyar, #44 claim durumu. |
| **C1. Değer önerisi** | VAR | `eyebrow` + `lede` + `pitchTitle` (`PP:102-153`). | #61/#62 yalnız Ostinato metni. |
| **C2. Gerçek kullanım deneyimi** | KISMİ | `s1Kicker` iki başlık + spec tablosu (`PP:161-203`); kullanım akışı/senaryo anlatımı ayrı yok, ekran akışı yok (UNKNOWN: pitch metinlerinin ürün koduyla eşleşmesi, `PP:127-129` yorumu "main'in sunduğu" der, kanıt kaydı yok). | #60 yalnız Braavolabs. |
| **C3. Öne çıkan yetenekler** | VAR | `ProductFeatures` kartları; olmayan yetenek "Yol haritasında/Yakında" (`ProductShowcase.tsx:28-35`; `product-showcase.ts` içinde 16 `roadmap: true` satırı). | Yok. |
| **C4. Gerçek ekran/demo** | KISMİ | Ürün sayfasında ekran görüntüsü çizilmez; yalnız ikon (`PP:104`). Ekran yalnız hub kartında, `kind: "product"` varsa (`ProjectCard.tsx:104,131`): Braavolabs 2, Burun Farkı 2 (`braavolabs.ts:44-53`, `burunfarki.ts:43-67`); LifeOS ve Ostinato `screenshots: []` (`lifeos.ts:41`, `ostinato.ts:41`). Tarihli geliştirme görüntüleri (6 ürün, 2026-10-16) yalnız `/transparency`'de (`product-presentations.ts:13,45,57,69,81,93`; `transparency/page.tsx:212-219`). | #60 Braavolabs deterministik plan kartı (ağ=0). Diğer ürünlerde yok. |
| **C5. Gizlilik ve güven** | KISMİ | Ürün SSS'inde gizlilik/hesap soruları (`ProductShowcase.tsx:49-70`), `/privacy/<slug>` sayfaları (LifeOS, Braavolabs, Burun Farkı, Motion; `src/app/[locale]/privacy/*`); ürün sayfasından bu sayfalara doğrudan bağlantı yok (`PP` içinde `privacy` yok). Claim bloğu ürün sayfasından çıkarıldı (`PP:53-55`). | #44 claim durumu; #48 footer değişir. |
| **C6. Mevcut yayın durumu** | KISMİ | Ürün sayfası "bitmiş ürünü tanıtır; yayın durumu `/transparency`'dedir" (`PP:53-55`, kurucu kararı 2026-10-31). Sayfada durum: eyebrow ("Yakında") ve CTA varlığı; live/beta rozeti yok (`StatusPill.tsx:13`). | #44 `claimState` (stale/planned ayrımı); #56 sahne 6. |
| **C7. Gelecek vizyonu** | KISMİ | Yetenek düzeyinde "Yol haritasında" etiketi (`ProductShowcase.tsx:28-35`); ürün başına vizyon/yol haritası bölümü yok. Şirket vizyonu ana sayfada (`tr.json:628-632`). | #57 sahne 4 (mevcut/planlanan ayrı) yalnız ana sayfada. |
| **C8. İndirme/deneme/erken erişim** | KISMİ | İndirme: LifeOS App Store (`lifeos.ts:100`), Braavolabs web+App Store (`braavolabs.ts:130-131`), Burun Farkı web (`burunfarki.ts:157`). Deneme: Ostinato/Gravita "Uygun yeni abonelere 14 gün" metni (`tr.json` product.ostinato.r3v) ama ürün "Yakında" ve bağlantı yok. Erken erişim: yalnız "Çıkınca haber ver" mailto (`PP:261-268`), liste/kayıt yok. | Yok. |
| **D. İnteraktif demolar** | YOK | Main'de demo/sahte etkileşim yok (`src/components` taramasında demo bileşeni bulunmadı). | #60 `BraavolabsPlanDemo` (üç örnek kart seçici, sunucu HTML özeti + istemci seçimi; yalnız tr/en yerel katalog, diğer 12 dil İngilizce işaretli): ilk ve tek demo. Kullanıcı verisi toplamaz (PR kaynağı: `BraavolabsPlanDemo.tsx` üst yorumu). |
| **E. Laboratuvar/araştırma** | KISMİ | `/notes` 3 kısa changelog girişi (`notes.ts:17,29,41`), `/case-studies` kasıtlı boş (`case-studies.ts:27`), `/manifesto`, `/operating-system`. Araştırma notu/deney kaydı yok; sayı/uydurma veri yok. | #59 sahne 5 "yaşayan laboratuvar": gerçek kayıtlar + şablon (ana sayfa içinde). |
| **F. Mühendislik ve şeffaflık** | VAR | `/transparency` (söz, üç sütun, dört ilke, ürün kayıtları, tarihli görüntüler; `transparency/page.tsx:106-219`), `/operating-system`, ürün bazlı gizlilik ve silme URL'leri. Açık borç: tüm claim süreleri dolmuş (`public-registry.ts:30-201`). | #44 claim durumu + present-tense kapısı; #46 STATUS/DECISIONS; #57 sahne 4. |
| **G1. Ürün kullanıcısı yolu** | VAR | `/projects` → ürün → mağaza (`PP:226-260`). | #58 sahne 7 "bireysel" yolu. |
| **G2. Kurumsal müşteri yolu** | VAR | `/consulting` + mailto (`consulting/page.tsx:53-59`); form kapalı (`lead-surface.ts:31-33`). | #58 "iş" yolu: tek giriş (iş birliği). |
| **G3. İş ortağı yolu** | YOK | Ayrı yol yok; yalnız genel adres (`tr.json:245`) ve kapalı `/studio`. | #48 header etiketi "İş Birliği" (audit §1.3); #58'in üç yolunda iş ortağı yok (`Scene7Start.tsx` `PATHS`). |
| **G4. Geliştirici/araştırmacı yolu** | KISMİ | `/notes`, `/operating-system`, `/transparency`; kod/doküman bağlantısı yok (§1.4). | #58 "mühendis" yolu: notlar, yaklaşım, iletişim. |
| **G5. Yatırımcı yolu** | YOK | Yok (§1.5). | #58'de yok. |

## 3. §6.3 "istenmeyenler" taraması (talimat 564-571)

| # | İstenmeyen | Bugün (main) | Kanıt |
|---|---|---|---|
| 1 | Sıradan kurumsal web şablonu | KISMİ (ölçülemez) | "Sıradan" öznel; yapısal tespit: ana sayfa özgün 3D yolculuk (`YulaExperience.tsx`), ama tüm ürün sayfaları aynı bölüm dizisini kullanır (eyebrow, lede, pitch, özellik, spec, fiyat, SSS, CTA; `PP:102-283`) ve iç sayfalar kart+ızgara düzenindedir (`consulting/page.tsx:35-42`). Karar UX-02'ye aittir. |
| 2 | Fazla iddialı, kanıtsız metin | KISMİ | Kapı var: 12 yasaklı kalıp (`scripts/forbidden-patterns.mjs:13-25`), claim kaydı (`src/lib/types.ts:277-330`). Karşı gözlem: tüm claim `expiresAt` geçmiş (`public-registry.ts:30-201`); ürün pitch ve özellik metinleri claim kaydından değil serbest metinden gelir (`PP:127-153`), kanıt bağlantısı yok. |
| 3 | Bekleten uzun açılış animasyonu | VAR (yalnız yetenekli masaüstü) | Yükleyici çizimi 3600 ms, zaman aşımı +6000 ms (`YulaExperience.tsx:46-48`); `home-desktop.png` ilk kare yükleyici adımları. `ExperienceLoader.tsx` içinde atlama düğmesi, Escape ya da klavye işleyicisi yok (dosyada `skip|escape|keydown|onClick|button` taraması boş); yükleyici atlanamıyor. Mobilde yükleyici yok (`:276-282`). |
| 4 | Mobilde çalışmayan ağır görsel deney | KISMİ | Main'de mobil 3D'ye terfi edebilir (`SceneHost.tsx:70`, `scene-route.ts:55-57`); `INDEX.md` home mobile canvas=1, sayfa yüksekliği 21269 px. Kayıtlı ölçüm: mobil Perf 73-74 (3D) / 82 (statik), JS 532/238 KB (PR #50 ölçüm belgesi, yüklü makine; audit §3). İç sayfalar mobilde canvas=0 (`INDEX.md`). Hata/yatay taşma gözlenmedi (`INDEX.md`). #54/#63 bunu azaltır, main'de yok. |
| 5 | Tüm ürünlerin canlı olduğunu ima | KISMİ | Beşi (Gravita, Lissom, JabLab, Ostinato, Choreia) kayıtta `research`, kartta "Yakında" (`page.tsx:76-81`, `StatusPill.tsx:13`). Ama: (a) beta Braavolabs için rozet yok; (b) `/projects` girişi "Sekiz ürün, tek disiplin" (`tr.json:160`); (c) "Yakında" bir yayın beklentisi kurar, tarih/kayıt yok; (d) ürün sayfaları ürünü bitmiş gibi tanıtır (`PP:53-55`, kurucu kararı). Claimsiz kayıtta `fallback.label` yazısı (`src/components/experience/ExperienceOverlay.tsx:225-227`) tetiklenir mi UNKNOWN. |
| 6 | Gereksiz, yüzeysel blog | YOK | `/notes` üç kısa changelog, üçü 2026-07-10 (`notes.ts:17,29,41`); blog akışı yok. Güncellik boşluğu: 122 gün. |
| 7 | Çalışmayan demo / sahte etkileşim | YOK | Main'de demo yok (§2 D). Ölü CTA kapısı: birincil düğme yalnız gerçek hedefle çizilir (`PP:226-228`); iletişim formu kapalıyken hiç çizilmez (`contact/page.tsx:103-114`). Bağlantıların canlı erişimi CI'da bloklayıcı değil (`verify:links` canlı kısım, audit §4): dış bağlantıların bugünkü sağlığı UNKNOWN. |
| 8 | Ürünleri tek dashboard'a zorla birleştirme | YOK | Her ürün kendi rota/sayfasında, kendi vurgu rengiyle (`PP:26-30,49`), kendi mağaza bağlantısıyla; ortak kullanıcı paneli yok. Not: yalnız üç ürünün özel vurgu rengi var, diğerleri varsayılan `#7FD8DC` (`PP:49`). |

## 4. Korunacak görsel varlıklar (değişmez sınır)

| Varlık | Dosya yolu |
|---|---|
| Kalıcı 3D sahne ve rota tonları | `src/components/experience/SceneHost.tsx`, `scene-route.ts`, `quality.ts`, `ExperienceCanvas.tsx`, `ExperienceWorld.tsx`, `GridRoom.tsx`, `HoloRibbon.tsx`, `PortfolioField.tsx`, `PointScan.tsx`, `ValueDioramas.tsx`, `VisionServicePortal.tsx`, `YulaGlyph.tsx`, `CameraRig.tsx`, `LightformerEnvironment.tsx`, `ExperienceErrorBoundary.tsx`, `ExperienceInstruments.tsx`, `StageWord.tsx`, `point-scan.ts`, `presentation-canvas.ts`, `useShowcaseTextures.ts` |
| Yolculuk, hikâye tahtası, doğrusal yedek | `src/components/experience/YulaExperience.tsx`, `StaticExperience.tsx`, `storyboard.ts`, `timeline.ts`, `types.ts`, `ExperienceOverlay.tsx`, `ExperienceLoader.tsx`, `Experience.module.css`, `instruments.ts`, `layout.ts`, `loader.ts`, `useExperienceProgress.ts` |
| Tüm deneyim dizini | `src/components/experience/` dizininin tamamı (yeni dosyalar dahil) korunur; yukarıdaki satırlar bugünkü dosyaları sayar |
| Sahne paleti | `src/components/experience/theme.ts` |
| Animasyonlar | `src/lib/motion.ts`, `src/components/layout/PageTransition.tsx`, `src/components/common/Reveal.tsx`, `StaggerWords.tsx`, `ScrambleText.tsx`, `SlotLabel.tsx`, `GlassSheen.tsx`, `ScrollMarquee.tsx`, `src/components/experience/useSmoothScroll.ts`, reduced-motion sözleşmesi `src/app/globals.css:495-529` |
| Ses | `src/components/experience/audio.ts`, `SoundPrompt.tsx` |
| Logo / marka | `src/components/common/YulaMark.tsx`, `YulaEmblem.tsx`, `YulaBanner.tsx`, `ProjectMonogram.tsx`, `public/brand/`, `public/icon.svg`, `public/apple-icon.svg`, ürün ikonları `public/projects/*/icon.png`, `logo.png` |
| Tipografi | `src/app/[locale]/layout.tsx:22-44` (Inter, Manrope, Space Grotesk, JetBrains Mono), `tailwind.config.ts:47-55`, dil yedek yazı tipleri `src/app/globals.css:589-597,714-717` |
| Renk tokenları | `src/app/globals.css:603-721` (`--yula-*` koyu/açık takımı, marka karışımı), `tailwind.config.ts:20-33`, `src/lib/theme.ts:5-8` |
| Marka sistemi / adlandırma | "YULA Lab" (kullanıcıya dönük), `src/data/company.ts` marka alanları, ürün marka alanları `src/data/projects/*.ts` (`brand`), Burun Farkı claim'leri ve Iron Bank dokunulmaz |

**UX-02/03 bu listenin dışına çıkmaz.** Değişebilecek olan yalnızca sayfa düzeni ve içerik akışıdır: hangi bölüm hangi sırada, hangi sayfada/sekmede/panelde sunulur, hangi bilgi hangi kitle yolunda öne çıkar; sahne, hareket, renk, tipografi ve marka varlıkları aynen kalır.

## 5. Açık sorular (UNKNOWN) ve doğrulanması gerekenler

1. Kullanıcı davranışı: en çok dönülen ekran, kitle dağılımı, dönüşüm; analitik çıktısı bu oturumda okunmadı (§1 Soru 4 satırları).
2. Tek tek ürün repolarındaki gerçek işlevler ve tekrarlayan uygulama içi işler (§1.1 Soru 5); ürün pitch metinlerinin güncel uygulamayla eşleşmesi (`PP:127-129`).
3. KAPANDI: ana sayfa yükleyicisi atlanamıyor, `ExperienceLoader.tsx` içinde atlama/Escape/klavye işleyicisi yok (§3 madde 3).
4. Beta (Braavolabs) ve "Yakında" (araştırma) ürünlerinin kullanıcıya nasıl okunduğu; rozet eksikliğinin kurucu kararı mı eksiklik mi olduğu (`StatusPill.tsx:13`, kurucu kararı 2026-10-31 yalnız "Yakında"yı açıkça yazar).
5. `ExperienceOverlay.tsx:225-227` claimsiz ürün için `fallback.label` yazar; hangi ürünün tetiklediği.
6. Üç farklı ürün sırası (ana sayfa, `/projects`, eyebrow numarası) bilinçli mi.
7. Yatırımcı ve iş ortağı yolu için kurucu niyeti: "Sermaye ya da yatırım sağlamıyoruz" cümlesi yalnız `/studio`'da ve `/studio` varsayılan kapalı (`tr.json:759`); üretimde `STUDIO_ENABLED` ve `LEADS_ENABLED` değerleri UNKNOWN (sır dosyası okunmadı).
8. Dış bağlantıların canlı sağlığı (mağaza, `braavolabs.com`, `burunfark.com`): `verify:links` canlı kısmı bu oturumda koşmadı.
9. Kamuya açık kod/doküman/basın kiti: etiketler var, hedef yok (`tr.json:268,278,279`); istenip istenmediği UNKNOWN.
10. 12 dilde sahne metinleri İngilizce yedek, çeviri kalitesi ve RTL e2e kapsamı (audit UNKNOWN 4).
11. Açık PR #62-#64 güncel CI durumu ve #47 token adlarının main ile örtüşmesi (audit UNKNOWN 1-2).
12. Gerçek cihaz pil/akıcılık ve mobil TBT (audit UNKNOWN 6); bu oturumda Lighthouse/test koşulmadı.
13. KAPANDI: "2D" düğmesi `src/components/experience/ExperienceOverlay.tsx:187-191` (`aria-label` "2D — <fallback.label>"), `onLinearView` ile doğrusal görünüme geçiş anahtarıdır (işleyici `YulaExperience.tsx:493`, bağlama `:595`).
14. Danışmanlık için `yula@yulalab.com` ile genel `support@yulalab.com` ayrımının kitleye nasıl anlatıldığı (`src/data/company.ts:66-67`).
