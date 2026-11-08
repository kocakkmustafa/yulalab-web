# yulalab.com — yürütme durumu (WEB-P0)

Güncelleme: 2026-11-08 · Ana dal `069477c` (canlı, Netlify `6aee6f8fc6b7d8c21f0eac44`) · Talimat: Dört Ürün Ana Talimatı §8, §12.
Durum kodları §12.4'tür. Bu dosya kanıtı taşır; kanıtı olmayan satır `UNKNOWN`/`NOT_TESTED` yazar.

## Bilet durumu
| Bilet | Durum | Kanıt / not |
|---|---|---|
| WEB-P0-01 envanter | `IN_REVIEW` | AUDIT-01 güncel ana dala (`069477c`) göre tamamlandı: ana CI kırmızısının kök nedeni bulundu (aşağıda). |
| WEB-P0-04 claim/kanıt kaydı | `IN_REVIEW` | PR #44 (`feat/WEB-P0-04-claim-state`, baş `4f636d7`); test 1963/1963 yerelde, CI sonucu PR'da. |
| Ana CI kırmızısı (WEB-P0-04 kapsamı) | `IN_REVIEW` | PR #45: tek E2E testi sağlamlaştırıldı. |
| WEB-P0-02 / 03 / 05 | `BACKLOG` | Sırada; 3D varsayılan ADR'si DECISIONS.md ADR-003. |
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

**Birleştirme notu:** CI ağaç pini tüm depo ağacını sabitler; her PR kendi ağacını pinler. İlk merge'den sonra diğerleri `git merge origin/main` + pin/makbuz yenilemesi ister (force push yok). Merge = Netlify yayını.

## Riskler
1. Süresi dolmuş claim/yüzeyler: yenileme düzenli iş değil; `store-readback.yml` yalnız mağaza okur. Önerilen: claim sahibi ürün oturumlarının yenilemesi (kurucu kararı gerekmez, ADR-001).
2. 3D sahne varsayılan açık ↔ §8.1: korumalı ama açık (ADR-003, karar WEB-P0-02/03'te).
3. Ostinato site metni ↔ uygulama: `coming-soon` ama "açık" diyor (AUDIT-01 U1/U3); WEB-P0-10.
