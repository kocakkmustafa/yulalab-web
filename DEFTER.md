# yulalab.com — DEFTER (Bulgu Defteri)

Format: FABLE_PLAN v2.0 §5C (holding). Kapanış kanıtı zorunlu. Kaynak tarama: 2026-07-22.

| ID | Tür | Şiddet | Bulgu | Durum | Kapanış kanıtı |
|---|---|---|---|---|---|
| Y-001 | hata | P1 | README proje tablosu LifeOS'u "Soon" gösteriyor; kod `status:"live"` — tutarsızlık | kapandı | `README.md`: "Soon"→"Live" (branch `y1-tutarlilik-2026-07-23`) |
| Y-002 | görev | P1 | LifeOS ürün ekran görüntüsü YOK (`visuals.screenshots: []`; public/projects/lifeos/ yalnız ikon) | açık | — (Y2 loop) |
| Y-003 | görev | P2 | FABLE_PLAN.md untracked (hiç commit'lenmemiş) — arşivle veya commit et | kapandı | `docs/arsiv/FABLE_PLAN-2026-07-08.md`'e taşındı |
| Y-004 | risk | P2 | Footer sosyal linkleri (x/linkedin/instagram @yulalab) render ediliyor ama hesapların canlı/aktif olduğu doğrulanmadı — ölü link riski | kapandı | Chrome MCP doğrulama: x.com/yulalab CANLI ("YULA Lab @YULAlab"), instagram.com/yulalab CANLI; linkedin.com/company/yulalab **404 "Sayfa bulunamadı"** → `company.ts`'den linkedin key'i geçici kaldırıldı (yorum: sayfa canlanınca geri eklenecek) |
| Y-005 | görev | P2 | Konum tutarlılığı (İstanbul vs Kayseri) footer/privacy/contact metinlerinde denetlenmedi (eski plan P0-2) | kapandı | Kod taraması: her yerde yalnız "Türkiye" kullanılıyor (footer/privacy/terms/contact/OG image), hiçbir şehir adı geçmiyor — İstanbul/Kayseri tutarsızlığı kodda mevcut değil |
| Y-006 | görev | P2 | BF showcase metriklerinin vault'taki en güncel v4 rakamıyla eşleştiği teyit edilmedi (son commit dürüstlük fix'i yapmış ama güncellik belirsiz) | kapandı | `src/data/projects/burunfarki.ts` stats: Top-1 ~%35, Top-3 ~%69 — vault'taki güncel v4 dürüst rakamıyla ([[burunfarki-store-ready-2026-06-23]]) eşleşiyor, değişiklik gerekmedi |
| Y-007 | görev | P2 | Braavolabs showcase görselleri 2026-07-11 hasadı — rebrand (07-18) sonrası bayat olabilir; BR2 UI seansı sonrası tazele | açık | — |
| Y-008 | karar | P2 | Artboard/prototip estetiği kader kararı (eski plan §8.4) kurucudan alınmadı | açık | — |
