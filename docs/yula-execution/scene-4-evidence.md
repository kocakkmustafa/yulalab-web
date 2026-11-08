# WEB-P0-03e: Sahne 4 kanıt tablosu

Tarih: 2026-11-08. Sahne 4 ("Bağımsız ürünler. Ortak mühendislik ilkeleri.") dört ilke gösterir. Her ilkede iki ayrı hücre vardır: "Mevcut (ürün kaydı)" ve "Planlanan". Sayı, ölçüm ve "doğrulandı" ifadesi yoktur. Ortak bir model ya da ortak bir veritabanı iddiası yoktur; sahne bunun tersini açıkça yazar.

"Mevcut yetenek" hücresi, kayıttaki cümleyi sözcüğü sözcüğüne (sayfa dilinde; yedek dillerde İngilizce) ve kaydın kendi durumunu gösterir. Cümle ekrana `src/data/projects/*` dosyasından okunur, mesaj kataloğundan değil; bu yüzden kayıt değişirse sahne de değişir.

| İlke | Mevcut hücre (kayıt cümlesi, özet) | Kaynak satırı | Durum (kayıttan) | Planlanan hücre |
|---|---|---|---|---|
| 1. Yerel öncelikli veri | Temel kayıtlar yerel çalışır; hesap gerekmez, bu sürümde bulut senkronu yok | `src/data/projects/lifeos.ts` `features[1]` ("Offline-first" / "Yerel-öncelikli") | `status: "live"` → Yayında | Aynı ilkeyi diğer ürünlerde de uygulamak; şimdilik onların yeteneği olarak iddia edilmez |
| 2. İş başına izin ve kanıt | Para harcayan adımlar açık insan onayını bekler; her adım denetim izinde görünür | `src/data/projects/braavolabs.ts` `features` ("Spend approval" / "Harcama onayı") | `status: "beta"` → Beta | Ürünlerde benzer bir izin ve kanıt dili hedefi; bugün ortak bileşen ya da sistem yok |
| 3. Cihaz içi sinyal analizi | İzinle okunan sağlık verisi cihazda işlenir, sunucuya gönderilmez | `src/data/projects/lifeos.ts` `features[2]` ("Health data, read-only" / "Sağlık verisi, yalnız okuma") | `status: "live"` → Yayında | Yeni sinyalleri ancak gerçek cihazlarda sınandıktan sonra açmak |
| 4. Anlaşılır arayüz | Kayıt satırı yok ("Kayıt yok" etiketi, kaynak satırı yok) | yok | yok | Bir ekranın ne yaptığını ve yapmadığını açıkça söylemek; yön, yetenek değil |

Kayıtlar satırlarını İngilizce başlıkla bulur (`feature(record, "…")`); başlık değişirse derleme hata verir, sessizce başka satıra kaymaz.

## İç bağlantılar
- `/operating-system`: canlı. e2e: `GET /operating-system` 200 ve "Nasıl çalışıyoruz" içeriyor; bağlantıya tıklanınca sayfa açılır, `h1` doğru.
- `/studio`: `STUDIO_ENABLED` sunucu bayrağına bağlıdır (`src/server/studio-surface.ts`, yalnız tam `"true"` açar; kapalıyken sayfa `redirect` eder ve header/footer bağlantısı yoktur). Sahne `studioEnabled()` ile bayrağı okur: kapalıysa `/studio` bağlantısı VERİLMEZ, yerine var olan canlı rota `/transparency` verilir. e2e (bayrak kapalı): `/studio` bağlantısı yok, `/transparency` 200 ve "Kara kutu değil" içeriyor, tıklanınca açılır. Bayrak açık yol e2e'de koşulmadı (bkz. NOT_TESTED).
- Bağlantılar `<nav>` değil, etiketli liste içindedir: sahne rayı bu blokta tek `<nav>`dır ve `home-scenes` testi `nav a` sayar.

## Kararlar
- `src/data/public-registry.ts` claim'leri bu sahnede KULLANILMADI: hepsinin `expiresAt` tarihi geçmiş. Süresi dolmuş claim "doğrulandı" sayılmaz; metin kayıtların kendi beyanı olduğunu ve bağımsız doğrulama olmadığını söyler.
- Ostinato kaydı kullanılmadı (cihaz içi mikrofon cümlesi `description` içinde uzun bir paragrafın parçası ve ürün `coming-soon`); satır yalnız kısa, kendi başına duran kayıt cümlelerine dayanır.
- Burun Farkı kaydı kullanılmadı.
- 12 dilde İngilizce metin + `lang="en"` `dir="ltr"` (03a deseni); durum etiketi ve kayıt cümleleri bu bloklarda İngilizce okunur, çeviri uydurulmadı.
- Bilinen sınır: `Yayında` LifeOS'un iOS durumunu yansıtır; Android hâlâ kapalı test (kayıt yorumu). Satır "ürün kaydı durumu" der, mağaza kapsamı iddia etmez.
- Sahne istemci JS'i, animasyon, ses ya da yeni bağımlılık içermez.
