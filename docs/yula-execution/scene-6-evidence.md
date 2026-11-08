# WEB-P0-03g: Sahne 6 kanıt tablosu

Tarih: 2026-11-08. Sahne 6 ("Güven") dört satırdır: Veri koruma, Kontrol ve onay, Ölçülebilir sonuç, Şeffaf ürün aşaması. Hiçbir cümle "tüm ürünler" için konuşmaz; her satır tek bir ürünü adlandırır ve YALNIZ gerçekten dayandığı kaynağı etiketler (ürün kaydı, gizlilik politikası ya da ikisi). Rakam yoktur.

| Satır / ürün | İfade (özet) | Kaynak etiketi → dayanak |
|---|---|---|
| Veri koruma / LifeOS | Kayıtlar cihazda kalır, hesap gerekmez, bazı özellikler App Store aboneliği ister; izinle okunan sağlık verisi cihazda işlenir, sunucuya gönderilmez; hesap/satın alma/çökme raporu başka yollardan gider | kayıt + politika → `lifeos.ts` `description` (kayıt cümlesine sadık), `features[2]`; `/privacy/lifeos` |
| Veri koruma / Braavolabs | YALNIZ mobil uygulama: sunucuda işlenir (hesap bilgileri, iş akışları, çalıştırma sonuçları, onay kararları; AI istekleri model sağlayıcısına). Kayıttaki bilgisayarda çalışan ajanlar için politika bu satırda yok, satır bunu söyler | yalnız politika → `/privacy/braavolabs` (`com.braavolabs.mobile` kapsamlı); kayıtta veri akışı cümlesi YOK |
| Veri koruma / Ostinato | "Yakında"; ilk sürümde gitar kursunda mikrofon isteğe bağlı; gizlilik sayfasına göre ses yalnız cihaz belleğinde, ham ses dosyası kaydedilmez/yüklenmez | kayıt + politika → `ostinato.ts` (`status: coming-soon`, mikrofon özelliği); `/privacy/motion` |
| Veri koruma / Lissom, Gravita, Choreia, JabLab | Yayınlanmadı; kayıtları veri akışı anlatmıyor, biz de anlatmıyoruz | kayıtlar + Motion politikası |
| Kontrol ve onay / Braavolabs | Para harcayan adımlar insan onayı bekler, denetim izi; roller, izinler, kesin bütçe durdurmaları | yalnız kayıt → `braavolabs.ts` `features[3]`, `features[4]` (politika bu akışı anlatmaz) |
| Kontrol ve onay / LifeOS | Sağlık verisi yalnız izinle okunur; çevrimiçi yapay zekâ isteğe bağlı: "uygulamada sunulduğunda ve kullanmayı seçersen" ekranda gösterilen ve onaylanan metin gider | yalnız politika → `/privacy/lifeos` ("Çevrimiçi yapay zekâ (isteğe bağlı)"); ürün kaydında çevrimiçi yapay zekâ yok |
| Ölçülebilir sonuç | "Henüz yayımlanmış sonuç ölçümü yok"; kayıtlardaki sayılar özellik adedidir; bazı public-registry claim'lerinin süresi dolmuştur; rakam gösterilmez | `src/data/public-registry.ts` (tüm `expiresAt` <= 2026-09-24) |
| Şeffaf ürün aşaması | Her ürün için ad + durum etiketi | `src/data/projects/*` `status` (yedek dilde İngilizce katalog); Burun Farkı listelenmez |
| Aşama notu / LifeOS | "Yayında" iOS içindir; Android kapalı testte; diğer ürünlerin mağaza kapsamı için ürün sayfası | `lifeos.ts` `links` yorumu (kayıt notu) |

## Kararlar

- Süresi dolmuş `public-registry` claim'leri "doğrulandı" olarak kullanılmadı; sahne "doğrulandı/onaylandı/ölçüldü" ve "asla/her zaman" sözcüklerini taşımaz (e2e TR+EN denetler).
- Bağlantı metinleri ürün adı taşır ("LifeOS gizlilik politikası" vb.); her hedef e2e'de HTTP 200 ve doğru başlıkla doğrulanır.
- Ostinato'nun `description` metnindeki "ölçülü pratik" ifadesi kullanılmadı.
- 12 dilde İngilizce metin + `lang="en"` dir="ltr" (03a/03b/03c deseni); durum etiketleri İngilizce katalogdan okunur.
- İstemci JS'i, animasyon, ses, yeni bağımlılık yoktur.
