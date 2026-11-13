# Mobil LCP kaynağı (WEB-P0-03a3)

Durum: ölçüm ve küçük düzeltme tamam; LCP'de anlamlı düşüş YOK. Kök neden belgelendi, büyük düzeltme öneri olarak bırakıldı.
Ortam: yerel üretim derlemesi, `/tr`, Lighthouse 12.8.2 varsayılan mobil emülasyon (simulated throttling), Chrome headless. Taban: 03a2 ucu (27a00d8). Ham JSON repo dışında (scratch `2026-11-08-web-p0-03a3/lh/`).

## LCP öğesi ve kırılım (03a2 sonrası taban, medyan koşu)
- LCP öğesi: `section#experience-hero > h1` ("Az sayıda ürün. Uzun süre düşünülmüş."), metin; görsel yok. h1 SSR HTML'de var, başlangıçta `opacity: 0` yok, yükleyici/açılış kartı mobilde yok (03a2).
- Gözlenen (kısıtsız) FCP = LCP = 149 ms; yani sayfa gerçekte hızlı boyuyor.
- Simüle edilen: FCP 1523 ms, LCP 4235 ms. Lighthouse kırılımı: TTFB 456 ms (%11), kaynak yükleme gecikmesi 0, kaynak süresi 0, render gecikmesi ~3779 ms (%89). Render gecikmesi bir kaynak beklemesi değil; simülasyonun kötümser grafiği.
- Uygulanan kısıt (`--throttling-method=devtools`, 2 koşu): FCP = LCP = 2954 / 2924 ms, Perf 0.86 / 0.87. Yani gerçek kısıtlı ağda LCP ilk boyamayla aynı anda (~2.9 sn) ve render-blocking CSS + ağ gecikmesinden gelir; 4.2 sn simülasyon artefaktıdır.
- İlk HTML: 42,5 KB (sıkıştırılmış). Sunucu yanıtı 11 ms. Render-blocking: 3 CSS (15,9 + 14,4 + 2,1 KB), Lighthouse tahmini kazanç ~450-490 ms. Yazı tipi: 4 aile, `display: swap` (font-display denetimi temiz); ana sayfada 7 woff2 önyükleniyor (~260 KB). JS 238 KB (3D yok). Ana iş parçacığı 1,0 sn, bootup 0,4 sn.

## Hipotezler
| Hipotez | Sonuç | Kanıt |
|---|---|---|
| Açılış yükleyicisi / opacity-0 hero metni LCP'yi geciktiriyor | Elendi | h1 statik SSR metni, opacity 1; gözlenen LCP 149 ms |
| Yazı tipi `display` engelliyor | Elendi | `display: swap`, font-display denetimi 1 (temiz) |
| Tek bir kaynak türü simüle LCP'yi belirliyor | Elendi | Engelleme probları (simüle LCP, 2 koşu): JS yok 3488/3688; yazı tipi yok 3783/3678; CSS yok 4077/4421; taban 4235. Hiçbiri tek başına ~4,2 sn'yi çözmüyor |
| Boyamadan önce yüklenen toplam bayt (HTML 42 + CSS 32 + yazı tipi ~260 + JS 238 KB ≈ 570 KB) simüle LCP'yi şişiriyor | Doğrulandı (dolaylı) | Lantern'in kötümser grafiği boyamadan önce başlayan tüm istekleri sayar; her kaynak türü yavaş 4G'de payını ekler |

## Yapılan
- `Space Grotesk` önyüklemesi kapatıldı (`preload: false`, `src/app/[locale]/layout.tsx`). Yalnız ürün sayfalarında kullanılıyor (`font-grotesk`); ana sayfada önyüklenen woff2 7 → 5 (~43 KB az). Görsel/davranış aynı (font-face duruyor, kullanılan sayfada istek zamanı yüklenir, `swap`).
- Etki: simüle mobil LCP 4235 → 4233 ms (3 koşu medyanı; [4432,4235,4136] → [4114,4240,4233]). Anlamlı düşüş yok; değişiklik ölçülebilir kazanç getirmedi, yalnız gereksiz önyükleme kalktı.

## Yapılmayan
- CSS satır içi alma (`experimental.inlineCss`): render-blocking 3 CSS'i kaldırır (~450-490 ms tahmin), ancak HTML'i ~32 KB şişirir, her sayfa için önbelleği bozar, deneysel bayrak: bu bilet için "küçük, düşük riskli" ölçüsünü aşar. Ölçülmedi.
- Inter/Manrope latin-ext önyüklemesini dile göre ayırma, yazı tipi alt kümeleme/statik ağırlık: Türkçe latin-ext gerektirir; kapsam dışı.
- JS bölme (238 KB): Lantern pozitif etkisi olası ancak büyük değişiklik.

## Lighthouse (aynı yerel derleme, medyan [3 koşu])
| Durum | Biçim | Perf | LCP ms | TBT ms | CLS | JS KB | uptime yükü (1 dk) |
|---|---|---|---|---|---|---|---|
| Önce (03a2 ucu) | mobil | 83 [79,83,85] | 4235 | 160 | 0 | 238 | 96,8 → 91,5 |
| Sonra (bu değişiklik) | mobil | 84 [81,84,84] | 4233 | 130 | 0 | 238 | 52,6 → 44,3 |
| Sonra | masaüstü | 92 [91,92,93] | 1066 | 107 | 0 | 539 | 53,6 → 69,8 |

Yük >60 olan koşular (önce mobil; masaüstü sonu) KIYASLANAMAZ: 83 vs 84 ve TBT farkı gürültü içindedir. Masaüstü "önce" ölçülmedi (NOT_TESTED, tur sınırı); masaüstü kodu bu değişiklikle yalnız kullanılmayan bir önyükleme etiketini kaybetti, JS 539 KB aynı. Mobil Perf ≥ 80 korundu.

## Kalan açık neden ve önerilen sonraki bilet
Simüle LCP'nin kalan ~4,2 sn'si boyamadan önce yüklenen toplam bayttan ve 3 render-blocking CSS'ten gelir. Öneri: `WEB-P0-03a4 — ana sayfa kritik yol bayt bütçesi`: (1) `inlineCss` denemesi (ölçüm + önbellek etkisi), (2) ana sayfa dışı CSS'in bölünmesi (15,9 + 14,4 KB), (3) yazı tipi önyüklemesini dile göre azaltma, (4) hydration JS'in `/` için bölünmesi. Her adım ayrı ölçülmeli. UNKNOWN: gerçek cihaz LCP'si (CrUX/RUM yok); boş makinede kesin ölçüm.
