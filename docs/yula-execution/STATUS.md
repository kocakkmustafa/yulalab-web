# yulalab.com — yürütme durumu (WEB-P0)

Güncelleme: 2026-11-09 · Ana dal `069477c` (canlı, Netlify `6aee6f8fc6b7d8c21f0eac44`) · Talimat: Dört Ürün Ana Talimatı §8, §12.
Durum kodları §12.4'tür. Bu dosya kanıtı taşır; kanıtı olmayan satır `UNKNOWN`/`NOT_TESTED` yazar.

## Bilet durumu
| Bilet | Durum | Kanıt / not |
|---|---|---|
| WEB-P0-01 envanter | `IN_REVIEW` | AUDIT-01 güncel ana dala (`069477c`) göre tamamlandı: ana CI kırmızısının kök nedeni bulundu (aşağıda). |
| WEB-P0-04 claim/kanıt kaydı | `IN_REVIEW` | PR #44 (`feat/WEB-P0-04-claim-state`, baş `4f636d7`); test 1963/1963 yerelde, CI sonucu PR'da. |
| Ana CI kırmızısı (WEB-P0-04 kapsamı) | `IN_REVIEW` | PR #45: tek E2E testi sağlamlaştırıldı. |
| WEB-P0-02a tokenlar | `IN_REVIEW` | PR #47 (`63ef5f3`), CI SUCCESS. `verify:contrast` 780 çift, en düşük 4.51 (marj dar). |
| WEB-P0-02b header/footer/mobil menü | `IN_REVIEW` | PR #48 (`3549ffc`), CI SUCCESS. |
| WEB-P0-02c a11y + wireframe + h2 | `IN_REVIEW` | PR #49 (`4b48336`), CI SUCCESS; üst üste #48. |
| WEB-P0-02d skip link + main | `IN_REVIEW` | PR #51 (`700c511`), CI SUCCESS; main'den bağımsız. |
| WEB-P0-03a yedi sahne iskeleti + ADR-003 | `IN_REVIEW` | PR #50 (`b6b90e8`), CI SUCCESS. ADR-003 öneri (c) KABUL (Project orchestration, 2026-11-08); ADR dosyası "Kabul edildi" PR #54'te. |
| WEB-P0-03a2 mobil statik varsayılan | `IN_REVIEW` | PR #54 (`769000b`), CI SUCCESS. Yerel mobil Lighthouse 74→84 [79–86] gürültülü (yük ≈56); masaüstü 95→88 UNKNOWN. |
| WEB-P0-03a3 mobil LCP kaynağı | `IN_REVIEW` | PR #55 (`39fcea1`), CI SUCCESS; üst üste #54. LCP öğesi h1, render gecikmesi %89; LCP düşmedi (4235→4233 ms); öneri 03a5. |
| WEB-P0-03b S1 Kimlik | `IN_REVIEW` | PR #52 (`05ea007`), CI SUCCESS; üst üste #50. |
| WEB-P0-03c S2 Fark | `IN_REVIEW` | PR #53 (`b123ca8`), CI SUCCESS. |
| WEB-P0-03e S4 Ortak mühendislik | `IN_REVIEW` | PR #57 (`6ebf838`), CI SUCCESS. |
| WEB-P0-03f S5 Yaşayan laboratuvar | `IN_REVIEW` | PR #59 (`bdcef6e`), taban #54, CI SUCCESS. |
| WEB-P0-03g S6 Güven | `IN_REVIEW` | PR #56 (`44332f9`), CI SUCCESS. |
| WEB-P0-03h S7 Dönüşüm | `IN_REVIEW` | PR #58 (`044a3a7`), CI SUCCESS. |
| WEB-P0-03d S3 Amiral ürünler | `READY` (bağımlılık) | #44 (WEB-P0-04) merge'ü bekler; claim durumu `presentClaims`'e bağlanacak. |
| WEB-P0-03a4 / 03a5 | `READY` | 03a4 mobilde WebGL sondasını ilk jeste ertele; 03a5 ana sayfa kritik yol bayt bütçesi. |
| WEB-P0-05 Braavolabs plan kartı | `IN_REVIEW` | PR #60 (`b6d3892`, main'e dayalı); `/projects/braavolabs` bağımsız bileşen, ağ=0 e2e, ibare her kartta; Sahne 3 bağlama 03d'de. CI SUCCESS (2026-11-09). |
| WEB-P0-10 Ostinato ücretsiz ders metni | `IN_REVIEW` | PR #61 (`3ab6c40`, main'e dayalı); 40+25; kaynak doğrulama kısmi. CI SUCCESS (2026-11-09, baş `3ab6c40`). |
| WEB-P0-10b Ostinato Kurslar maddesi | `IN_REVIEW` | PR #62 (`09d040d`, main'e dayalı); gitar 4 seviye 240, kulak 2 seviye 50, şan/piyano yakında; ukulele/bas/gizli eski kurslar çıktı; bağımsız reviewer geçti. CI bekleniyor. `WEB-P0-10c` (240/50/690 = dosya sayısı; ders 235/48/676) Ostinato oturumu doğrulaması bekliyor. |
| WEB-P0-07c rate limit istemci IP | `IN_REVIEW` | PR #64 (`4a3d4f3`, main'e dayalı); ortak `clientIp()` (leads/events/data-request), Netlify başlığı > XFF; UNKNOWN: Netlify başlık güveni belgesiz → `WEB-P0-07c2`. CI bekleniyor. |
| WEB-P0-03a4 mobil WebGL sonda erteleme | `IN_REVIEW` | PR #63 (`345e9d9`, main'e dayalı); telefonda sonda ilk jeste ertelendi, masaüstü değişmedi; TBT ölçümü UNKNOWN (makine yükü). CI bekleniyor. |
| WEB-P0-10 Ostinato metin tutarsızlığı | `READY` | `ostinato.ts` l.22 ↔ l.55; metin koda uydurulacak. |

## Doğrulanan gerçekler (2026-11-08)
- **Ana CI:** push koşusu 42317954806 (`069477c`) `failure`. Tek kırmızı adım "Final gate"; sebep `technical_checks: FAIL_OR_UNRUN` çünkü E2E adımı 1 test kaybetti (`e2e/core-routes.spec.ts:185` "locale-aware 404 en desktop": `GET /_next/static/css/91301ab450412518.css net::ERR_ABORTED`; 243 test geçti). npm audit **sebep değildir** (`audit_blocking_issues: []`; önceki AUDIT-01 tahmini yanlıştı). Önceki ana koşu 42315400517 yeşil; aynı ağacın PR koşuları yeşil. Mekanizma (tarayıcının yinelenen stylesheet isteğini iptali) log'dan **kanıtlanmadı**; iz dosyası yüklenmiyor.
- **Birim testleri (CI):** 92 dosya / 1925 test geçti. **E2E (CI):** `--grep-invert @hardware-webgl`, 244 test; `@hardware-webgl` 4 test CI dışı (PR #43 yerelde 18/18).
- **Locale:** 14; `messages/<locale>.json` 659/659 anahtar, TR/EN eşit. Çeviri kalitesi için insan denetimi yok (`UNKNOWN`).
- **Registry (ana dalda):** 6 claim + 5 tarihli yüzey, hepsinin `expiresAt` değeri geçmiş (en geç 2026-09-24); canlıda "Güncellik kontrolü bekleniyor" ile işaretli. PR #44 dört kaynak claim'ini yeniden doğrular; Burun Farkı claim'leri (dokunulmaz) ve yüzeyler (24 saat penceresi) süresi dolmuş kalır.
- **Lighthouse (canlı, 3 koşu, 2026-11-07):** ana sayfa mobil 76 / masaüstü 91, a11y 100. CI'da kapı yok; hedef mobil ≥80 açık iş.

## Açık PR'lar
| PR | Konu | Durum |
|---|---|---|
| #42 | AGENTS.md | CI yeşil; merge kurucu onayında |
| #43 | `@hardware-webgl` düzeltmesi | CI yeşil; merge kurucu onayında |
| #44 | WEB-P0-04 claim durumu | CI sonucu PR'da |
| #45 | 404 E2E sağlamlaştırma | CI sonucu PR'da |
| #46 | Bu belge + DECISIONS.md | CI sonucu PR'da |
| #47–#59 | WEB-P0-02a–d, 03a–h (yukarıdaki tablo) | CI SUCCESS (2026-11-09); hepsi merge kurucu onayında (merge = Netlify yayını) |
| #60, #61 | WEB-P0-05, WEB-P0-10 (main'e dayalı, bağımsız) | CI SUCCESS; merge kurucu onayında |
| #62, #63, #64 | WEB-P0-10b, WEB-P0-03a4, WEB-P0-07c (main'e dayalı, bağımsız) | CI bekleniyor; merge kurucu onayında |

**Birleştirme notu:** CI ağaç pini tüm depo ağacını sabitler; her PR kendi ağacını pinler. İlk merge'den sonra diğerleri `git merge origin/main` + pin/makbuz yenilemesi ister (force push yok). Merge = Netlify yayını.

## Riskler
1. Süresi dolmuş claim/yüzeyler: yenileme düzenli iş değil; `store-readback.yml` yalnız mağaza okur. Önerilen: claim sahibi ürün oturumlarının yenilemesi (kurucu kararı gerekmez, ADR-001).
2. 3D sahne varsayılan açık ↔ §8.1: ADR-003 kabul edildi (masaüstü 3D varsayılan, mobil statik varsayılan); uygulama PR #54'te, merge'e kadar canlıda eski davranış. Lighthouse ölçümleri yüklü makinede, sakin makinede yeniden ölçülmeli.
3. Birleştirme çakışması: #52, #53, #56, #57, #58 aynı `HomeScenes.tsx`'e satır ekliyor; her merge sonrası kalan PR'larda `git merge origin/main` + makbuz + pin yenileme. #55 ve #59 #54 dalına yığılı: #54 merge olunca `gh pr close` + `reopen`.
4. Yedek diller: 12 dilde ana sayfa sahne metinleri İngilizce (`lang="en"`); çeviri insan denetimi gerektirir (`UNKNOWN`).
5. Ostinato site metni ↔ uygulama: `coming-soon` ama "açık" diyor (AUDIT-01 U1/U3); ücretsiz kısım PR #61'de düzeltildi, "Kurslar" maddesi PR #62'de düzeltildi (WEB-P0-10b); "240/50/690 ders" dosya sayısı, ders sayısı değil: WEB-P0-10c.
