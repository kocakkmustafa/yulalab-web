# CLAUDE.md — yulalab.com (Next.js 15)

YULA Lab şemsiye/vitrin sitesi — Braavolabs, Burun Farkı ve LifeOS'u sergiler. 14 dilli (next-intl), statik üretim. Kanonik program: `BITIRME-PROGRAMI.md` + `DEFTER.md` (bu dizinde). Vizyon/durum: `../VENTURE.md`.

## Komutlar
```bash
npm install
npm run dev        # next dev (--turbopack varyantı: dev:turbo)
npm run lint && npm run typecheck
npm run build      # üretim build'i — push öncesi yeşil olmalı
```

## Deploy — DİKKAT
- **Sağlayıcı Netlify, prod dalı = `main`** → main'e merge canlıya çıkar (Netlify kredisi harcar). Merge ve deploy kurucu onayıyla yapılır; eski Vercel anlatımı tarihseldir.
- Yayından sonra canlı okuma: `python3 -I scripts/release/live-readback.py <out.json> [yerel-taban]` (aynı ağacın `next start` derlemesiyle sayfa sayfa karşılaştırır).
- (Karşıt örnek ekosistemde: burunfark-web'in prod dalı `develop` — iki kuralı karıştırma.)

## Bilinmesi gerekenler
- **Çapraz-iddia yüzeyi:** bu site diğer ürünlerin metrik/durumunu gösterir (BF doğruluk oranları, store rozetleri). Kaynak ürün değişince burası bayatlar — `holding/registry/connections.yaml` impact_rules'a bak.
- Tasarım kaynağına erişim yalnız `DesignSync` MCP ile (paylaşım linki 403 verir; `get_file` 256KiB'de keser).
- Y2 (gerçek ekran görüntüleri) kurucu kararıyla bekletiliyor; Y3 (Lighthouse/a11y) açık iş.
