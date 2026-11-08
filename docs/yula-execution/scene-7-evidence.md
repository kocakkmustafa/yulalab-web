# WEB-P0-03h: Sahne 7 kanıt tablosu

Tarih: 2026-11-08. Sahne 7 ("Başlangıç") üç yol gösterir: bireyler, işletmeler, mühendisler. Tüm bağlantılar var olan rotalardır (`src/app/[locale]/`). Birincil vurgu yok: her CTA aynı çerçeveli hap. Sayı, sayaç, müşteri, "ücretsiz deneme", "hemen başla" ifadesi yok. Footer'a dokunulmadı.

| CTA | Hedef | Hedefin gerçekte yaptığı (kaynak) |
|---|---|---|
| Ürünlere göz at | `/projects` | Ürün dizini (`src/app/[locale]/projects/page.tsx`) |
| Birlikte nasıl çalışabileceğimizi gör | `/consulting` | AI danışmanlığı hizmetleri, adım listesi, e-posta adresi; form yok (`consulting/page.tsx`, `e2e/consulting.spec.ts`) |
| Değişiklik notlarını oku | `/notes` | Üç tarihli değişiklik kaydı, çoğu site değişikliği; "laboratuvar defteri" diye büyütülmez (`notes/page.tsx`, `src/data/notes`) |
| Çalışma biçimini oku | `/operating-system` | Sayfa başlığı "Nasıl çalışıyoruz"; kanıt seviyeleri, ürün durum makinesi, iddia politikası (`operating-system/page.tsx`) |
| Ekiple iletişime geç | `/contact` | Genel yazışma adresi (destek, ortaklık, basın) (`contact/page.tsx`) |

## Kararlar
- `/studio` verilmedi: `STUDIO_ENABLED` bayrağına bağlı (`src/server/studio-surface.ts`). Data-room ya da kayıt formu bağlantısı yok; böyle rota yok.
- "Dene" ve "ücretsiz" yok: ürün sayfaları deneme sunduğunu kayıtla göstermiyor; birey yolu yalnız "göz at".
- İşletme yolunda tek giriş var (`/consulting`). Braavolabs CTA'sı ve aşama rozeti kaldırıldı: rozet `ProjectConfig.status` ile `public-registry` yaşam döngüsü arasında ikili kaynak olurdu; ürün keşfi "Ürünlere göz at" yolunda.
- Bağlantılar `Link` yerine düz `<a href={localePath(...)}>` (03e deseni); paylaşılan wiring testine mock eklenmedi.
- Link metinleri footer/header adlarından (Notes, Contact, How we work, AI consulting) farklıdır; sayfada aynı adlı iki bağlantı yok.
- 12 dilde İngilizce metin + `lang="en"` `dir="ltr"`; blokta rozet/durum sözcüğü yok.
- İstemci JS, animasyon, form, e-posta toplama, telemetri yok.
