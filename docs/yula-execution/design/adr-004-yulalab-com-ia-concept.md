# ADR-004 — yulalab.com bilgi mimarisi ve gezinme konsepti (WEB-UX-03, Aşama 4)

Durum: Kabul edildi (Aşama 4 kararı kurucuya sorulmaz; seçimi bu ADR yapar) · Tarih: 2026-11-09 · Taban: UX-02 dalı ucu (`main` `069477c` + `01-audit.md`, `02-mental-model.md`, `03-concepts.md`) · Kapsam: yalnız belge; kod, görsel, renk, sahne, animasyon değişikliği yok.
Atıf: `01§n` = `01-audit.md` bölüm n; `02§n` = `02-mental-model.md`; `03§n` = `03-concepts.md`; `PP` = `src/components/projects/ProductPage.tsx`; `PR #n:dosya` = açık PR dalındaki dosya (main'de yok). Kanıtsız sayı yazılmadı; bilinmeyen = UNKNOWN. Ayrıntı: `04-design.md`.

## 1. Bağlam
- Problem (03§1): ziyaretçi "kimsin, neye varsın, nereye gideceksin" sorusuna kısa yolda cevap bulamıyor; ilk karede ürün adı yok (02§1.1 s3), ürün sırası üç yerde farklı (`src/app/[locale]/page.tsx:16-25`, `src/lib/product-index.ts:44-56`, 02§5 #6), live/beta rozeti çizilmiyor (`src/components/common/StatusPill.tsx:13`), ürün sayfasında ekran görüntüsü ve gizlilik bağlantısı yok (02§2 C4, C5), yatırımcı/iş ortağı yolu yok (02§2 G3, G5).
- Sınırlar (değişmez): 3D sahne (`src/components/experience/` tamamı), animasyonlar, marka, renk tokenları, tipografi aynen; yalnız sayfa düzeni, bilgi mimarisi, gezinme, içerik akışı (01§Korunacaklar). ADR-003: masaüstü 3D, mobil statik varsayılan (01§9; PR #54). Mevcut 22 rota ve 14 dil kaybolmaz (01§1.1, 01§5).
- Matris (03§5, DEĞİŞTİRİLMEDİ): K1 Niyet Kapıları 24 · K2 Ürün Evreni Haritası 23 · K3 Kanıt Defteri 22; fark 1-2 puan, öznel yargı, kullanıcı verisi yok (03§5 son satır). Karşılaştırma notu eğilimi: "K1 kapı mantığı + K2 ürün katmanı; K3 aşamalı" (03§6).
- Kullanıcı davranışı verisi YOK: analitik çıktısı okunmadı (02§5 #1). Bu yüzden karar, puandan çok sitenin gerçekte yapabildiği işlere dayanır.

## 2. Gerçek işlevler (karar zemini)
Sitenin bugün gerçekten çalışan işlevleri:
1. Ürüne ulaştırmak: yalnız üç ürünün gerçek erişim yolu var (LifeOS App Store `src/data/projects/lifeos.ts:100`; Braavolabs web+App Store `braavolabs.ts:130-131`; Burun Farkı web `burunfarki.ts:157`); beşinde yok (Ostinato `ostinato.ts:88`).
2. Danışmanlık için e-posta: `/consulting` mailto (`src/app/[locale]/consulting/page.tsx:53-59`); iletişim formu varsayılan KAPALI (`src/server/lead-surface.ts:31-33`).
3. Kanıt göstermek: `/transparency` (`src/app/[locale]/transparency/page.tsx:106-219`), claim kaydı (`src/lib/types.ts:277-330`).
4. Yatırımcıya, iş ortağına, geliştiriciye ÖZEL kanal yok: tek genel adres (`src/data/company.ts:66-67`; 02§1.3 s1, 02§1.5 s1, 02§1.4 s1). Kod/doküman hedefi yok (`messages/tr.json:268,278,279`; 02§5 #9).
Sonuç: "5 kitle = 5 kapı" kurgusu bu işlevlerle örtüşmez; ayrı kanalı olmayan iki kitle için kapı, çalışmayan CTA üretir (talimat §6.2 G: "gerçek bağlantısı ve hizmeti bulunmayan çağrı butonları oluşturmayın").

## 3. Karar
**Seçilen: Melez H = K1 (daraltılmış, 4 kapı) + K2 (ürün katmanı, işlevsel) + K3 (yalnız `/transparency` genişlemesi, aşamalı).** Üç ayrı gezinme sistemi aynı anda çalışmaz (03§6): tek gezinme mantığı "kapı → ürün/kanıt sayfası"dır.
- **K1'den:** niyet kapıları, ama 5 değil 4: Ürünler (ürün kullanıcısı) · İş (kurumsal) · İş birliği ve şirket (iş ortağı + yatırımcı; ikisinin gerçek kanalı aynı genel adres) · İnceleme (geliştirici/araştırmacı; yatırımcı için kanıt girişi de burada). Yeni rota yalnız `/start` (K1'in 6 rotası yerine 1) + `/lab` (hub). Açık PR yığınında Sahne 7 zaten üç yol (bireysel/iş/mühendis) sunar (`PR #58:src/components/landing/Scene7Start.tsx` `PATHS`); H bunu genişletir, çakıştırmaz. Header etiketleri PR #48'in Ürünler/Laboratuvar/Yaklaşımımız/İş Birliği takımıyla uyumludur (`PR #48:src/components/layout/nav-config.ts` `HEADER_NAV`).
- **K2'den:** ürün evreni = tek sıra kaynağı + durum rozeti + "Ana ürünler / Portföy" iki grup + durum süzgeci; masaüstünde (>=1024px) ana-ayrıntı paneli, mobilde panel YOK. "Harita" (uzamsal halka yerleşimi) v1'de YAPILMAZ: ek işlev katmaz, erişilebilirlik riski taşır (03§5 K2 erişilebilirlik 3; 03§3 madde 12). Ürün detayı K2'nin "katman" sırasına değil, talimat §6.2 C'nin 8 maddelik karar sırasına göre dizilir (K1 sırası, 03§2 madde 4).
- **K3'ten:** `/ledger` KURULMAZ. Yalnız `/transparency` ürün bazlı çapa + durum/claim etiketi + "Durum özeti" (kayıttan türeyen) alır. Gerekçe: yeni veri modeli ve içerik üretim sürekliliği gerekir; bugün 3 not (üçü 2026-07-10, `src/data/notes.ts:17,29,41`) ve tüm claim süreleri geçmiş (`src/data/public-registry.ts:30-201`); seyrek defter "eski site" izlenimi verir (03§4 madde 12). Yeniden değerlendirme koşulu: içerik üretim sürekliliğinin kurucu tarafından tanımlanması (UNKNOWN).

## 4. Eğilimin gözden geçirilmesi (03§6 "K1 + K2; K3 aşamalı")
Eğilim KISMEN KORUNDU, iki noktada DEĞİŞTİRİLDİ:
1. K1 5 kapı → 4 kapı. Neden: matris K1'e "kullanım kolaylığı 5" verir (03§5) ama bu kitle seçimini ilk adımda ister; ürün kullanıcısı en somut işlevli kitledir ve kapı gerektirmez, doğrudan "Ürünler" yolundadır. Yatırımcı ve iş ortağı için ayrı kapı, 03§2 madde 12'nin kendi riskini üretir (zayıf içerik; 03§2 madde 12 ikinci madde).
2. K2 "harita" → işlevsel liste + panel. Neden: 03§3 madde 2 liste eşdeğerini DOM'un birincil biçimi sayar; uzamsal harita yeni bir işlev eklemez. Ostinato'yu "çekirdek halka"da göstermek "hepsi canlı" imasına kayabilir (03§3 madde 12 ikinci madde); çözüm: "Ana ürünler" etiketi + her kartta durum rozeti.
Matris puanları (24/23/22) bu kararın girdisidir, hakemi değil.

## 5. Reddedilen alternatifler
| Alternatif | Neden reddedildi |
|---|---|
| Saf K1 (5 kapı, 6 yeni rota; 03§2) | Yatırımcı/iş ortağı için gerçek kanal yok (02§1.5 s1, 02§1.3 s1); 6 rota + 14 dil anahtarı bakım yükü; kapı sayfası ürün kullanıcısına fazladan adım |
| Saf K2 (harita) (03§3) | Uzamsal harita erişilebilirlik riski (03§5: 3); işlev katmaz; Ostinato çekirdek ima riski; kurumsal/geliştirici kitleye cevap vermez |
| Saf K3 (`/ledger`) (03§4) | Yeni veri modeli (03§4 madde 12); içerik seyrek (`notes.ts:17,29,41`); ürün arayan için dolambaçlı (03§5 kullanım kolaylığı 3) |
| Üçünün birden uygulanması | Üç gezinme sistemi çalışmaz (03§6 "Melez olasılığı") |
| Hiç yeniden düzen (yalnız Sahne 7 + #48) | Üç ürün sırası, rozet, ekran görüntüsü, gizlilik bağlantısı, ayrı demo/simülasyon dili çözülmez (01§4, 02§2) |

## 6. 5 kitlenin ilk 5 saniyesi (ayrıntı `04-design.md` §5)
- Ürün kullanıcısı: `/projects` ilk karede ürün adı + durum rozeti + erişim yolu (kayıttan); ana sayfada ilk kapı "Ürünleri keşfet".
- Kurumsal: header "İş Birliği" + kapı "İşime AI" → `/consulting`; kapsam ve sınır (`limits`, `messages/tr.json:831`) ilk ekranda.
- İş ortağı: "İş birliği ve şirket" kapısı: yasal biçim (`src/data/company.ts:6-11`), ürün durum özeti, tek muhatap adresi; ayrı form/CTA yok.
- Geliştirici/araştırmacı: "İnceleme" kapısı: `/transparency`, `/operating-system`, `/lab` tarihleriyle; kod bağlantısı çizilmez.
- Yatırımcı: aynı "İş birliği ve şirket" sayfasında ürün durum özeti (kayıttan türer, elle sayı yok) + yasal biçim + genel adres; "yatırım talebi" düğmesi yok.

## 7. Kurucu kararları
(a) 2026-11-09, Project orchestration oturumunda kurucunun sözü: **"Evet, rozet ekle"** — soru: "Sitede canlı/beta ürünlere durum rozeti eklensin mi?" Bu karar 2026-10-31 kararının (kartlar yayın durumu yazmaz; `StatusPill.tsx:6-13`) YERİNE GEÇER: `StatusPill` live/beta için de rozet çizer, durum registry'den gelir, yeni iddia yok. Uygulama UX-05a kapsamında (ya da ayrı küçük bilet). Etki: 03§6 açık soru 11 KAPANIR; süzgeç ve "Durum özeti" kurguları bu karara dayanır. Doğrulama bekleyen iki nokta (kurucu sorusu değil, UX-05a işi): `lifecycleLabels` ana sayfada live/beta için boş (`PR #50:src/app/[locale]/page.tsx` `lifecycleLabels`), `ProjectStatus` ile `ProductLifecycle` eşlemesi.
(b) Aşama 4 kararı kurucuya sorulmaz; seçimi bu ADR yapar (talimat Aşama 4: "Tasarım kararını ilgili ajan ekibi vermelidir").

## 8. 03-concepts "AÇIK sorular" (03§6, 11 madde) — karar tablosu
| # | Soru | Karar |
|---|---|---|
| 1 | Yatırımcı/iş ortağı için gerçek kanal ve yayın cümlesi | **KURUCU KARARI GEREKİR.** Varsayılan tasarım: ayrı kanal yok, genel adres + durum özeti, CTA yok |
| 2 | "Sermaye sağlamıyoruz / dış müşteri işi tamamlamadık" cümlelerinin `/studio` dışında yayını (`messages/tr.json:759`) | **KURUCU KARARI GEREKİR.** Varsayılan: yayınlanmaz; `/case-studies` boş durumu (`src/app/[locale]/case-studies/page.tsx:52-69`) ve "referans listesi değildir" metni yeterli sayılır |
| 3 | ADR kayıtlarının kamuya açılması | **KURUCU KARARI GEREKİR.** Varsayılan: kapalı; Lab'da ADR listesi yok |
| 4 | Kod/doküman/basın kiti hedefi | **KURUCU KARARI GEREKİR.** Varsayılan: hedef yok → CTA çizilmez (02§5 #9) |
| 5 | Ürün sırası kaynağı; Ostinato'nun "çekirdek" gösterimi | **KAPANDI (bu ADR).** Tek kaynak, "Ana ürünler" = LifeOS, Braavolabs, Ostinato (talimat §1, §6.1), Ostinato rozeti "Yakında"; uygulama UX-05a |
| 6 | Yükleyici atlama denetimi (02§3 #3) | **KAPANDI (teknik karar, Project orchestration, 2026-11-09):** `src/components/experience/ExperienceLoader.tsx` için dokunma İZİNLİ, şartla: 3D sahne, animasyon ve görsel çıktı birebir aynı kalır; önce/sonra ekran görüntüsü (masaüstü + mobil) alınır ve mevcut sahne testleri yeşil kalır. Uygulama UX-05 kapsamında (ilgili alt bilet kabulüne bu şartlar yazılır). |
| 7 | Yolculuğun önüne/arkasına blok eklemenin storyboard etkisi | **UX-05d'ye ertelendi.** Tasarım: bloklar `YulaExperience` DIŞINDA, `HomeScenes` anchor sözleşmesine uyar (`PR #50:src/components/landing/home-scenes.ts`); etki ölçümü UX-05d kabul ölçütü |
| 8 | Demo "Gerçek yetenek" etiketi için kanıt kaydı | **UX-05c'ye ertelendi.** Kural: kanıt kaydı yoksa her demo "Örnek simülasyon"; "Gerçek" etiketi yalnız claim kaydı + kurucu doğrulamasıyla |
| 9 | Claim sürelerinin yenilenmesi (`public-registry.ts:30-201`) | **Kurucu/veri işi, UX kapsamı dışı.** Tasarım bayat claim'i gizlemez ("Güncellik kontrolü bekleniyor"); yenileme ayrı bilet |
| 10 | 14 dil yeni anahtarların insan incelemesi | **UX-05'e ertelendi.** Kural: çevrilmemiş anahtar etiketli İngilizce yedekle gider (01§5); insan inceleme kapasitesi UNKNOWN, kapsam raporlanır |
| 11 | Live/beta rozeti | **KAPANDI** (§7 a) |

KURUCU KARARI GEREKİR özeti: #1, #2, #3, #4 (kurucuya soruldu, yanıt bekleniyor; bunlara dayanan metin "karar bekliyor" notuyla dışarıda bırakılır). #6 teknik karar olarak kapandı (yukarıda). (Gerçek yatırımcı/iş ortağı kanalı = #1.)

## 9. Sonuçlar ve riskler
- Olumlu: UX-01 bulgularının çoğu (üç sıra, rozet, ekran boş durumu, gizlilik bağlantısı, yatırımcı/iş ortağı dürüst yolu) yeni sahne/animasyon/renk olmadan çözülür; ADR-003 ile uyumlu.
- Risk 1: açık PR yığını (#42-#68, hiçbiri merge değil) aynı dosyalara dokunur; her PR `ci.yml` ağaç pinine de dokunur (01§7 CI; `PR #48:.github/workflows/ci.yml`); UX-05 sırası `04-design.md` EK-C'dedir.
- Risk 2: yeni rotalar (`/start`, `/lab`) 14 dilde anahtar ister; eksik çeviri etiketli İngilizce yedek (01§5).
- Risk 3: iki `.glass` tanımı (`src/app/globals.css:62`, `:556`) ve düz yedeğin yokluğu (`@supports`/`prefers-reduced-transparency` taraması boş) QA-UX-01 PERF-03/04 için UX-05g'de kapatılır.
- Risk 4: kurucu kararı #1-#4, #6 gelene kadar ilgili yüzeyler varsayılan (CTA'sız, dürüst) hâliyle çıkar.
- Eşleştirme dışı: yeni demo icadı, yeni animasyon, yeni renk, `/ledger` bu ADR'de YOKTUR.

## 10. QA-UX-01 §5 referansı (UX-05 PR'larının uyacağı maddeler)
Kabul cümlesi (QA-UX-01 §5): "QA-UX-01 A11Y-01…A11Y-25 ve PERF-01…PERF-14 maddeleri ilgili yüzey için PR'da kanıtla (SS yolu, ölçüm çıktısı, test adı) işaretlidir; kalan madde varsa gerekçeli istisna ADR'de ve QA-P0-01 durum kodu `TESTING` altında kalır." UX-03 cümlesi: her madde için ilgili yüzeyde karar ve kanıt planı `04-design.md` §10'dadır.
UX-05 PR'larının uyacağı maddeler (yüzey = web `[W]`): **A11Y-01..07, 08..11, 12..16, 18..20, 21 (kısmi), 23 (kısmi), 24..25 ve PERF-01..04, 07..10, 12..14.** Gerekçeli istisnalar (web yüzeyinde uygulanamaz/ertelenir):
- A11Y-17 (konuşma/dikte yedeği): sitede sesli/dokunsal girdi işlevi yok; ses sorusu (`src/components/experience/SoundPrompt.tsx:7`) `experience/` içindedir, korunur → N/A.
- A11Y-21 (çevrimdışı, kısmi): sitede çevrimdışı çalışan işlev yok (PWA yok: UNKNOWN taraması); yalnız bağlantı hatası metni (`04-design.md` §9) → kısmi.
- A11Y-22 (izin reddi): site kamera, mikrofon, konum, bildirim, sağlık verisi izni istemez; izin akışı yok → N/A. Ses sorusu `experience/` içinde korunur (`SoundPrompt.tsx:7`).
- A11Y-10 (otomatik oynatma, ölçüt: 5 sn'den uzun): gerçek adaylar döngü animasyon `.mesh-default` (`driftA 40s infinite`, `src/app/globals.css:466`; reduced-motion'da durur `:503-504`) ve 3D sahne (reduced-motion'da gizli, `SceneHost.tsx:278-281`; `experience/` korunur) → mevcut yedekle karşılanır, yeni animasyon/değişiklik önerilmez; 3.6 sn yükleyici (`YulaExperience.tsx:46-48`) eşiği aşmaz. Gerekçeli istisna: sahne ve `.mesh-default` dokunulmaz.
- PERF-02 (`.mesh-default` `blur(120px)`, `src/app/globals.css:462`; `YulaBanner.tsx`): dekoratif arka plan, cam değil; eşiği aşar, değişiklik önerilmez (görsel korunur) → gerekçeli istisna, UX-05g ölçer.
- PERF-05, PERF-06 (kare hızı, düşük donanım cihazı): gerçek cihaz kaydı gerekir; makine yükü ve cihaz yok → `NOT_TESTED` (01§UNKNOWN 6).
- PERF-11 (soğuk açılış): `[F, R, M]` yüzeyleri; web için N/A (PERF-08 karşılar).
- A11Y-23 (onay bekleyen): sitede geri alınması zor işlem yok; lead formu gönderimi için §9'daki onay kuralı uygulanır → kısmi.
QA-P0-01 durum kodu `TESTING` altında kalır; PERF-13 Lighthouse (mobil >=80, a11y >=95) `web-yayin-dogrulama` akışıyla, canlı değil yerel ölçülür (makine yükü notu).
