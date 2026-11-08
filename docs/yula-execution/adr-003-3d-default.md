# ADR-003 — 3D sahne varsayılan açık mı? (WEB-P0-03a)

Durum: KABUL EDİLDİ — Project orchestration (teknik tercih), 2026-11-08; uygulama WEB-P0-03a2.
DECISIONS.md PR #46'dadır; bu belge o girdiye bağlanacak ayrıntıdır.

## Bilgi
Ana sayfa varsayılan olarak R3F/three yolculuğunu yükler (`YulaExperience`). Korumalar: WebGL2 ve yazılım-render tespiti, `prefers-reduced-motion`, kısa-yatay görünüm (`compactViewport`), düşük katman, `StaticExperience`. Dört Ürün Ana Talimatı §8.1: gerçek tarayıcıda görülmeden yoğun GPU/3D efektleri varsayılan açılmaz.

## Seçenekler
- (a) Korumalı hâli ölçümle kabul et.
- (b) Mobilde statik varsayılan, dokununca 3D.
- (c) Yalnız masaüstünde varsayılan 3D; mobilde (b).

## Ölçüm (yerel üretim derlemesi, Lighthouse 12.8.2, `/tr`, mobil varsayılan emülasyon + masaüstü ön ayarı)
Varyant A = mevcut varsayılan (3D). Varyant B = Chrome `--force-prefers-reduced-motion` (kodun gerçek statik yolu; ayrı bir statik anahtar yok). Hücre = medyan [3 koşu]. Ham JSON repo dışında (scratch `2026-11-08-web-p0-03a/lh/`); özet bu tablodur.

| Durum | Biçim | Perf | LCP ms | TBT ms | CLS | JS KB |
|---|---|---|---|---|---|---|
| 03a öncesi, A | mobil | 73 [72,73,74] | 5035 [5035,5160,4863] | 190 [213,178,190] | 0 | 532 |
| 03a öncesi, A | masaüstü | 95 [95,95,95] | 1033 [1042,1032,1033] | 10 [10,9,10] | 0 | 539 |
| 03a öncesi, B | mobil | 82 [82,82,82] | 4893 [4892,4894,4893] | 26 [14,26,27] | 0 | 238 |
| 03a öncesi, B | masaüstü | 99 [99,99,99] | 978 [978,978,975] | 0 | 0 | 242 |
| 03a sonrası, A | mobil | 74 [74,72,74] | 4874 [4874,5082,4870] | 186 [161,188,186] | 0 | 532 |
| 03a sonrası, A | masaüstü | 95 [95,95,95] | 1040 [1036,1042,1040] | 10 [11,6,10] | 0 | 539 |
| 03a sonrası, B | mobil | 82 [82,82,82] | 4892 [4892,4892,4893] | 26 [23,26,28] | 0 | 238 |
| 03a sonrası, B | masaüstü | 99 [99,99,99] | 975 [975,977,975] | 0 | 0 | 242 |

INP lab'da ölçülmez; TBT vekildir. Cihaz/ağ: Mac üzerinde Lighthouse varsayılan mobil emülasyonu (Moto G Power sınıfı, yavaş 4G kısıtı) ve masaüstü ön ayarı; gerçek cihaz kanıtı UNKNOWN.

## Bilet kabulüne göre durum (açık)
- Bilet kabulü "mobil Lighthouse ≥ mevcut canlı 76": yerel mobil A 73–74 canlı 76'nın altındadır; **literal kabul karşılanmıyor**. Yerel değişiklik öncesi taban 73'e göre gerileme yoktur (74). Canlı doğrulama merge sonrası yapılacak. Canlı (mobil 76 / masaüstü 91, 2026-11-07) ile yerel ölçüm farklı ortamlardır.
- Eşik "≥ 80" bilet hedefidir (WEB-P0-03a: "hedef ≥80"), karar ölçütü olarak kullanıldı. Mobil B 82 bu hedefi karşılar, A karşılamaz.

## Karar (kabul)
(a) kabul edilemez (A < 80). Kabul edilen (c): masaüstü korumalı 3D kalır (A 95), mobil (≤767 px) statik varsayılan, 3D dokununca. Fark 3D'nin ~294 KB ek JS'inden ve ~160 ms TBT'sinden gelir.

## Uygulama (WEB-P0-03a2)
- Tek sabit bayrak: `src/components/experience/mobile-default.ts` → `MOBILE_STATIC_DEFAULT = true` (false: eski davranış; `git revert` de geri alır). Sorgu: `(max-width: 767px)`.
- Sunucu HTML'i `.journey` üzerinde `data-mobile-static-default="true"` taşır; CSS yalnız ≤767 px'te ve `data-mobile-3d` yokken `.journey` yüksekliğini `auto` yapar, açılış kartını gizler, statik bloğu gösterir. İlk boyama ile istemci ilk render'ı aynı; e2e: CLS 0, hydration uyarısı yok. Masaüstü CSS'i ve davranışı değişmedi.
- İstemci: `YulaExperience` içinde `mobileStatic = bayrak && ≤767px && !mobile3d`. Bu iken `useStatic` doğru, zaman çizelgesi kapalı, açılış kartı yok ve three.js sahnesi İSTENMEZ (dinamik import yalnız opt-in sonrası). Viewport bilgisi `mounted`'dan önce bir layout effect'te okunur (ilk bağlanan render'da 3D yoluna sıçrama yok).
- Düğme "3D deneyimi aç" (`StaticExperience` hero, `data-open-3d`): ≥48 px hedef, erişilebilir ad metni, klavye (Enter/Space), özel odak halkası `--yula-focus`. Reduced-motion ve kısa-yatay görünümde CSS ile gizli. Dokununca `mobile3d` açılır; mevcut korumalar (WebGL2, yazılım-render, düşük katman, 8.6 sn canvas zaman aşımı) geçerli: WebGL yoksa dürüst "Doğrusal deneyim" bildirimi kalır.
- Statike dönüş: 3D açıkken mevcut "doğrusal görünüm" denetimi (`showLinearView`) korunur; sonra düğme yeniden görünür ve 3D tekrar açılabilir.
- Capture harness (`?capture=1&progress=…`) 3D'yi açıkça istemiş sayılır: mevcut mobil capture e2e testleri değişmeden geçerli kalır.
- Metin: `experience.open3d`. tr/en yazıldı; diğer 12 dilde İngilizce metin ve düğmede `lang="en"` (`dir="ltr"`); çeviri uydurulmadı.
- Testler: `e2e/mobile-static-default.spec.ts` (390x844 statik varsayılan/canvas yok/CLS 0, düğme erişilebilirliği, dokununca 3D yolu, en/fr etiketi, masaüstünde düğme yok; `@hardware-webgl`: düğme→canvas→doğrusal görünüm, masaüstü 3D) ve `tests/mobile-static-default.test.ts`.
- **03a2 sonrası (yerel üretim derlemesi, `/tr`, Lighthouse 12.8.2 varsayılan mobil emülasyon, medyan [3 koşu]).** Makine yükü (`uptime` load avg 1 dk): başta 55.9, sonda 56.4 (<60; ancak yüksek, gürültülü). Ham JSON: scratch `2026-11-08-web-p0-03a2/lh/`.

| Durum | Biçim | Perf | LCP ms | TBT ms | CLS | JS KB |
|---|---|---|---|---|---|---|
| 03a sonrası, A (önce) | mobil | 74 [74,72,74] | 4874 | 186 | 0 | 532 |
| 03a2 sonrası | mobil | 84 [79,86,84] | 4093 [4456,4067,4093] | 152 [252,119,152] | 0 | 238 |
| 03a sonrası, A (önce) | masaüstü | 95 | 1040 | 10 | 0 | 539 |
| 03a2 sonrası | masaüstü | 88 [86,88,92] | 1135 | 178 [205,178,101] | 0 | 539 |

Okuma: mobil JS 532 → 238 KB (üç.js yüklenmiyor), mobil perf 74 → 84 (hedef ≥80 karşılandı, ancak koşular arası 79–86 dalgalı). Mobil TBT medyanı 152 ms, B varyantındaki 26 ms'den yüksek: yük gürültüsü olası, doğrulanmadı. Masaüstü kodu ve JS boyutu (539 KB) aynı; masaüstü 95 → 88 ve TBT 10 → 178 yüksek makine yükünden (≈56) kaynaklı olarak değerlendirildi ve değişiklikle ilişkilendirilmedi (aynı baytlar); kıyaslanabilir değil, UNKNOWN: boş makinede tekrar ölçüm. LCP ~4.1 sn hâlâ ayrı bilet 03a3'te.

## Açık risk: mobil LCP
Mobil LCP iki varyantta da ~4.9 sn'dir (A 4874, B 4892). Öneri (c) bunu çözmez; LCP 3D'den değil ilk boyama içeriğinden ve ağdan gelir. Ayrı bilet önerisi: `WEB-P0-03a3 — mobil LCP kaynağı` (LCP öğesi, yazı tipi/görsel yükü, ilk HTML boyutu). Hedef ≥80 yalnız B ile sağlanıyor ve kalan puan LCP'de kaybediliyor.

## Diğer riskler
Mobilde ilk izlenimdeki 3D kimliği kaybolur (kabul edilmiş ödünleşim). Pil/akıcılık gerçek cihazda UNKNOWN. Yeni dokunma düğmesi erişilebilir ad ve odak testi ister.

## Geri dönüş
Tek sabit bayrak (`MOBILE_STATIC_DEFAULT`) ve CSS öznitelik seçicisi; `git revert`. Veri akışı, maliyet (0 USD) ve güvenlik etkisi yok.

---

# Ek: `IntlError: MISSING_MESSAGE` kök nedeni (WEB-P0-03a)
- Kök neden: doğru anahtar `status.comingSoon`; `experience.comingSoon` hiçbir katalogda yoktur. `page.tsx` bunu `tStatus` ile okur. İki testin (`tests/experience-locale-content.test.tsx`, `tests/content-locale-wiring.test.tsx` zincirindeki `getTranslations` mock'u) namespace'i yok sayıp hep `"experience"` kullanması, vitest günlüğünde fr/ja/ar için `MISSING_MESSAGE` üretti. Sunucu/üretim kodunda kırık anahtar yok.
- CI kanıtı: koşu 42503914169 (PR #49, bu düzeltme olmadan) vitest günlüğünde `experience.comingSoon` fr/ja için `MISSING_MESSAGE` gösterdi.
- Düzeltme: mock `namespace`'i geçirir; `tests/home-message-keys.test.ts` sayfanın literal anahtarlarını 14 katalogda doğrular. Düzeltme sonrası vitest, build ve e2e sunucu günlüklerinde `MISSING_MESSAGE` = 0.
- UNKNOWN: değişiklik öncesi ilk yerel vitest günlüğünde 0 görülmüştü, ara bir koşuda fr/ja/ar satırları göründü; bu tutarsızlık açıklanamadı.

# Ek: ana sayfa sahne metinleri ve dil fallback'i
- Sahne 1–7 metinleri Dört Ürün Ana Talimatı §8.2 başlangıç kopyasıdır. Sahne 3/4/5 metinleri 03d/03e/03f'de gerçek içerik ve kayıt durumuyla doğrulanacaktır. Uydurma sayı/ölçüm/demo yoktur.
- Dürüst fallback: tr ve en tam yazılmıştır. Diğer 12 dilde (ar, de, es-419, fr, hi, id, it, ja, ko, pl, pt-BR, zh-Hans) çeviri henüz yoktur; İngilizce metin gösterilir ve sahne bloğu `lang="en"` (RTL dillerde `dir="ltr"`) ile etiketlenir (WCAG 3.1.2). Çeviri uydurulmadı.
- Doğrulama sınırı: `/#scene-n` doğrudan bağlantısı 3D yolculuk yolunda e2e'de sınanır yalnız WebGL'in kullanılabildiği tarayıcıda (test, açılan yolu bilet notuna yazar); yazılım-render tespiti statik yola düşürürse 3D yolda hash kaydırma elle/birim testle (`homeSceneIdFromHash`) doğrulanır: UNKNOWN.
