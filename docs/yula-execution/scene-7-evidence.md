# WEB-P0-03h: Sahne 7 kanıt tablosu

Tarih: 2026-11-08. Sahne 7 ("Başlangıç") üç yol gösterir: bireyler, işletmeler, mühendisler. Tüm bağlantılar var olan rotalardır (`src/app/[locale]/`). Birincil vurgu yok: her CTA aynı çerçeveli hap. Sayı, sayaç, müşteri, "ücretsiz deneme", "hemen başla" ifadesi yok. Footer'a dokunulmadı.

| CTA | Hedef | Hedefin gerçekte yaptığı (kaynak) |
|---|---|---|
| Ürünlere göz at | `/projects` | Ürün dizini (`src/app/[locale]/projects/page.tsx`) |
| Braavolabs ile işi otomatikleştir + durum rozeti | `/projects/braavolabs` | Ürün sayfası; rozet `braavolabs.status` ("beta") kayıttan okunur (`src/data/projects/braavolabs.ts`) |
| Birlikte nasıl çalışabileceğimizi gör | `/consulting` | AI danışmanlığı hizmetleri, adım listesi, e-posta adresi; form yok (`consulting/page.tsx`, `e2e/consulting.spec.ts`) |
| Laboratuvar defterini oku | `/notes` | Kısa notlar (`notes/page.tsx`, `src/data/notes`) |
| Teknik yaklaşımı oku | `/operating-system` | Kanıt seviyeleri, ürün durum makinesi, iddia politikası (`operating-system/page.tsx`) |
| Ekiple iletişime geç | `/contact` | Genel yazışma adresi (destek, ortaklık, basın) (`contact/page.tsx`) |

## Kararlar
- `/studio` verilmedi: `STUDIO_ENABLED` bayrağına bağlı (`src/server/studio-surface.ts`). Data-room ya da kayıt formu bağlantısı yok; böyle rota yok.
- "Dene" ve "ücretsiz" yok: ürün sayfaları deneme sunduğunu kayıtla göstermiyor; birey yolu yalnız "göz at".
- Braavolabs bağlantısı aşamayı kayıttan gösterir (Beta); "yayında" ima edilmez.
- Link metinleri footer/header adlarından (Notes, Contact, How we work, AI consulting) farklıdır; sayfada aynı adlı iki bağlantı yok.
- 12 dilde İngilizce metin + `lang="en"` `dir="ltr"`; rozet sözcüğü İngilizce katalogdan okunur.
- İstemci JS, animasyon, form, e-posta toplama, telemetri yok.
