# yulalab.com — kararlar (ADR)

Biçim: bilgi / delil / güvenlik-maliyet farkı / geri dönüş / kimin sonucu (Ana Talimat §14 "kritik sapma").

## ADR-001 — Claim durumu mevcut `ProductClaim`'e eklenir, `stale` saklanmaz (2026-11-08, WEB-P0-04)
- **Bilgi:** Talimat §8.5 `ClaimState` alanlarını önerir; kayıtta benzer ama farklı adlı yapı var (`evidenceKind`, `verifiedAt/expiresAt`).
- **Karar:** Paralel şema açılmaz. `claimState`, `verificationMethod`, `buildOrCommit`, `publishableAsPresentTense`, `reviewer` isteğe bağlı alan olarak eklenir; `stale` `expiresAt`'ten türetilir. Planned/prototype/unknown claim claim bölümünde görünmez (`withheld`). Süresi açık her claim durumunu bildirmek zorundadır (build kapısı); süresi dolmuş eski claim kapıyı kırmaz, raporlanır. Present tense yalnız doğrulanmış durum + açık `true` + açık pencerede.
- **İnceleme sonrası kısıt (PR #44):** Ana sayfa kaplaması, `StatCards` ve vaka sayfaları claim'leri `presentClaims` üzerinden değil ham `claims[]` ile okur ve yalnız bayatlığa bakar. Bu yüzden build kapısı, planned/prototype/unknown bir olgunun `claims[]` içinde yer almasını reddeder; bu olgular durum etiketinde yaşar. Kısıt, bu yüzeyler `isPresentTenseEligible` ile süzülünce (WEB-P0-03) kalkar. Planned/prototype/unknown claim süresi dolsa da `withheld` kalır ("yenilenmeli" denmez). Kural 5 (TR/EN aynı durum) yapısaldır: tek claim nesnesinde tek `claimState`; ayrıca test edilmez.
- **Güvenlik/maliyet:** Maliyet 0. JSON tüketicisi (links.yulalab.com) için alanlar eklemedir, mevcut alanlar değişmez.
- **Geri dönüş:** PR #44 `git revert`.
- **Kim kazanır:** Siteyi okuyan, "doğrulandı" rozetinin neyi kanıtladığını (kaynak okuma / CI / mağaza / canlı E2E) ve commit'ini görür.
- **Açık nokta:** Bayat claim'in tamamen gizlenmesi yerine "doğrulanmadı" işaretiyle görünür kalması korunur (mevcut davranış; görünmez başarısızlık daha kötü).

## ADR-002 — Ana CI kırmızısı kodda değil testte düzeltilir (2026-11-08, WEB-P0-04 kapsamı)
- **Bilgi:** Ana CI "Final gate" kırmızısı npm audit'ten değil, tek bir E2E testinden (`core-routes.spec.ts:185`, CSS `net::ERR_ABORTED`) geliyor.
- **Delil:** CI logu 42317954806: 243 geçti / 1 kaldı; `audit_blocking_issues: []`; aynı ağacın PR koşuları ve önceki ana koşu yeşil. Sayfa içeriği, axe ve meta denetimleri aynı testte geçti.
- **Karar:** Test, yalnız "aynı URL'nin başarıyla yüklendiği iptal edilmiş stylesheet isteğini" kabul eder; başka hata metni, başka kaynak türü ve hiç yüklenmeyen stylesheet hâlâ kırar. Üretim koduna dokunulmaz.
- **Sınır:** Tarayıcı mekanizması kanıtlanmadı (iz yok); düzeltme gözlenen belirtiye karşı sağlamlaştırmadır. Tekrar ederse `--trace=on` ile yakalanır.
- **Geri dönüş:** PR #45 `git revert`. **Kim kazanır:** Her merge'de güvenilir sinyal.

## ADR-003 — 3D sahne varsayılan açık ↔ §8.1 (AÇIK; karar WEB-P0-02/03'te)
- **Bilgi:** #40/#41 ile ana sayfa varsayılan olarak R3F/three sahnesini yüklüyor. §8.1: "gerçek tarayıcıda görülmeden yoğun GPU/3D efektlerini varsayılan açma".
- **Mevcut koruma:** WebGL2 + yazılım-render tespiti, `prefers-reduced-motion`, düşük katmana iniş, aynı içerikli `StaticExperience`. Canlı mobil Lighthouse 76 (hedef ≥80).
- **Seçenekler:** (a) korumalı hâli ölçümle kabul et; (b) mobilde statik varsayılan, 3D kullanıcı dokununca; (c) yalnız masaüstünde varsayılan.
- **Karar:** WEB-P0-02/03'te, mobil CWV ölçümüyle (LCP/INP/CLS, cihaz ve ağ kaydıyla). Bu ADR o zamana dek **karar vermez**; varsayılan korunur.
