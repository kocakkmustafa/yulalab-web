# ADR-003 — 3D sahne varsayılan açık mı? (WEB-P0-03a)

Durum: KARAR VERİLDİ (öneri c), UYGULANMADI — ayrı bilet gerekir. Tarih: 2026-11-08.
DECISIONS.md PR #46'dadır; bu belge o girdiye bağlanacak ayrıntıdır.

## Bilgi
Ana sayfa varsayılan olarak R3F/three yolculuğunu yükler (`YulaExperience`). Korumalar: WebGL2 ve yazılım-render tespiti, `prefers-reduced-motion`, kısa-yatay görünüm (`compactViewport`), düşük katman, `StaticExperience`. Dört Ürün Ana Talimatı §8.1: gerçek tarayıcıda görülmeden yoğun GPU/3D efektleri varsayılan açılmaz.

## Seçenekler
- (a) Korumalı hâli ölçümle kabul et.
- (b) Mobilde statik varsayılan, dokununca 3D.
- (c) Yalnız masaüstünde varsayılan 3D; mobilde (b).

## Ölçüm (yerel üretim derlemesi, Lighthouse 12.8.2, `/tr`, 3 koşu medyanı)
Varyant A = mevcut varsayılan (3D). Varyant B = `--force-prefers-reduced-motion` (kodun gerçek statik yolu). Ayrıntı ve ham JSON: scratch `2026-11-08-web-p0-03a/lh/`.

| Durum | Biçim | Perf | LCP ms | TBT ms | CLS | JS KB |
|---|---|---|---|---|---|---|
| 03a öncesi, A | mobil | 73 | 5035 | 190 | 0 | 532 |
| 03a öncesi, A | masaüstü | 95 | 1033 | 10 | 0 | 539 |
| 03a öncesi, B | mobil | 82 | 4893 | 26 | 0 | 238 |
| 03a öncesi, B | masaüstü | 99 | 978 | 0 | 0 | 242 |
| 03a sonrası, A | mobil | 74 | 4874 | 186 | 0 | 532 |
| 03a sonrası, A | masaüstü | 95 | 1040 | 10 | 0 | 539 |
| 03a sonrası, B | mobil | 82 | 4892 | 26 | 0 | 238 |
| 03a sonrası, B | masaüstü | 99 | 975 | 0 | 0 | 242 |

Yedi sahne iskeleti gerileme yaratmadı (mobil A 73 → 74). Canlı değerler (mobil 76 / masaüstü 91, 2026-11-07) yerelden farklıdır; karar canlı değil yerel A/B farkına dayanır. INP lab'da ölçülmez; TBT vekil.

## Karar
Mobil A 73-74 < 80, mobil B 82 ≥ 80; fark 3D'nin 294 KB ek JS'inden ve 160 ms TBT'sinden gelir. Ölçüt gereği (a) kabul edilmez. Öneri (c): masaüstü korumalı 3D kalır, mobil (≤767 px) statik varsayılan, 3D dokununca. Masaüstü A zaten 95.

## Neden bu bilette uygulanmadı
Değişiklik küçük değil: mobil statik varsayılan yalnız `useStatic` değil, ilk boyama CSS'ini de ister (`.journey` 2520vh yüksekliği ve açılış kartı şimdi yalnız reduced-motion ve kısa-yatay medya için gizli), dokunma ile 3D'ye geçiş için yeni arayüz metni (13 dil) ve statik→yolculuk kaydırma geçişi gerekir; mevcut mobil `experience*` testlerini etkiler. Önerilen ayrı bilet: `WEB-P0-03a2 — mobil statik varsayılan (bayraklı)`.

## Risk
Mobilde ilk izlenimdeki 3D kimliği kaybolur (mobil ziyaretçi için kabul edilmiş ödünleşim). Gerçek cihaz (kurucu telefonu) pil/akıcılık kanıtı: UNKNOWN. Kullanıcıya yeni dokunma düğmesi erişilebilir ad ve odak testi ister.

## Geri dönüş
Tek sabit bayrak (`MOBILE_STATIC_DEFAULT`) ve CSS öznitelik seçicisi; `git revert`. Veri akışı, maliyet (0 USD) ve güvenlik etkisi yok.
