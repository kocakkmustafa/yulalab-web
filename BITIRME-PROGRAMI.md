# yulalab.com — BİTİRME PROGRAMI (Y) v1.0

**Tarih:** 2026-07-22 · **Amaç:** Siteyi "pazarlamaya tam hazır" (Y-DONE) hale getirip YULA AI Holding'e bağlamak.
**Bu dosya kendi kendine yeter** — yeni oturum yalnız bunu + `DEFTER.md`'yi okuyarak başlar. Üst bağlam (istenirse): `yula-holding-workspace/HAT-A-PROGRAM.md`.

**Önerilen açılış:** model **Sonnet**, düşünme **orta** (Y3 kapanış denetimi oturumu: yüksek). Mühür denetimleri Opus alt-ajanla koşulur (Agent `model:'opus'` — ana model Sonnet olsa da çalışır).

## Oturum protokolü (LOOP)
1. Bu dosya + `DEFTER.md` oku. 2. Açık P0/P1 önce; sıradaki işaretsiz görevi al. 3. Kod değişikliği = branch + PR; **main'e merge/push kurucu onaylı** (Vercel prod = main push!). 4. Oturum sonunda: buradaki İlerleme Kaydı'na tarihli girdi + DEFTER güncelle (kapanış = kanıtla). 5. Riskli/yayın işi: Fable + Opus doğrulama; rutin iş Sonnet.

## Durum özeti (2026-07-22 taraması — kanıtlı)
Repo: `kocakkmustafa/YULA-Lab`, main senkron+temiz, 32 commit, son 2026-07-11. Next.js 15 + Vercel otomatik deploy (main). Eski FABLE_PLAN'ın (2026-07-08, untracked) P0'larının ÇOĞU kodda çözülmüş: LifeOS "live", footer sosyal linkler, terms, JSON-LD, notes/changelog, analytics, sıkı CSP hepsi mevcut. Kalan iş sınırlı ve aşağıda.

## Loop haritası

### Y1 — Tutarlılık (tek oturum hedefi) — ✅ TAMAMLANDI 2026-07-23 (mühür bekliyor)
- [x] README proje tablosu: LifeOS "Soon" → "Live" (Y-001) + genel README güncellik turu.
- [x] Konum metin taraması: İstanbul/Kayseri tutarlılığı (footer/privacy/contact) (Y-005) — bulgu yok, kod her yerde yalnız "Türkiye" kullanıyor.
- [x] BF showcase metriklerini vault'taki güncel v4 rakamıyla (~%69 dürüst model) teyit et/güncelle (Y-006) — zaten eşleşiyor, değişiklik gerekmedi.
- [x] FABLE_PLAN.md'yi karar ver: commit (tarihsel) veya `docs/arsiv/`e taşı (Y-003) — `docs/arsiv/FABLE_PLAN-2026-07-08.md`'e taşındı.
- [x] Footer sosyal linklerinin hedef hesapları canlı mı? (x/linkedin/instagram @yulalab) — değilse footer'dan geçici kaldır, hesap canlanınca geri (Y-004) — x✅ instagram✅ linkedin❌(404) → linkedin footer'dan kaldırıldı.
- Mühür: PR diff + canlı sayfa kontrolü + kurucu onayı. **Branch `y1-tutarlilik-2026-07-23` hazır, main'e merge kurucu onayı bekliyor.**

### Y2 — Görsel varlıklar
- [ ] LifeOS gerçek ekran görüntüleri: simülatörden set üret (flutter-skill/mobile-mcp), `visuals.screenshots`'a bağla (Y-002). Seçim: visual-polish-critic merceği.
- [ ] Braavolabs showcase tazeleme — **BR2 (Braavolabs UI seansı) SONRASI ideali**; ara çözüm: canlı braavolabs.com'dan yeniden hasat (Y-007). Y-DONE'u bloklamaz.
- Mühür: görseller canlı sitede + retina/mobil kontrol.

### Y3 — Kapanış
- [ ] Lighthouse + a11y hızlı denetimi (skorlar kayda).
- [ ] Artboard/prototip estetiği kararı — kurucu (Y-008).
- [ ] **Y-DONE kabulü:** README tutarlı + tüm projelerde gerçek görsel + metrikler güncel + kurucu görsel onayı.

## Kurucudan bekleyenler
Y1 PR onayı · Y-004 hesap durumu bilgisi (hangi sosyal hesaplar gerçekten açık?) · Y-008 artboard kararı · Y3 final görsel onay.

## İlerleme Kaydı
- 2026-07-22 — Program kuruldu (Fable, holding kuruluş oturumu). Henüz başlanmadı.
