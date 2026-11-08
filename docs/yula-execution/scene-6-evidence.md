# WEB-P0-03g: Sahne 6 kanıt tablosu

Tarih: 2026-11-08. Sahne 6 ("Güven") dört satırdır: Veri koruma, Kontrol ve onay, Ölçülebilir sonuç, Şeffaf ürün aşaması. Hiçbir cümle "tüm ürünler" için konuşmaz; her satır tek bir ürünü adlandırır ve dayandığı kaynağı (ürün kaydı ve/veya gizlilik sayfası) gösterir. Rakam yoktur.

| Satır / ürün | İfade (özet) | Kaynak |
|---|---|---|
| Veri koruma / LifeOS | Kayıtlar cihazda kalır, hesap gerekmez, bazı özellikler App Store aboneliği ister; izinle okunan sağlık verisi cihazda işlenir, sunucuya gitmez; hesap/satın alma/çökme raporu başka yollardan gider | `projects/lifeos.ts` `description` (kayıt cümlesine sadık), `features[2]`; `/privacy/lifeos` ("Sunucumuza giden veriler", HealthKit bölümü) |
| Veri koruma / Braavolabs | Sunucuda işlenir: hesap bilgileri, iş akışları, çalıştırma sonuçları çalışma alanında; AI istekleri model sağlayıcısına gider; ürün kaydı bu akışı anlatmaz | `/privacy/braavolabs` ("Topladığımız veriler", "Üçüncü taraflar": Anthropic/Groq). Kayıtta veri akışı cümlesi YOK; metin bunu söyler |
| Veri koruma / Ostinato | Gitar kursunda mikrofon isteğe bağlı; ses yalnız geçici cihaz belleğinde, kaydedilmez/yüklenmez | `projects/ostinato.ts` `features` (mikrofon); `/privacy/motion` (aynı ifade) |
| Veri koruma / Lissom, Gravita, Choreia, JabLab | Yayınlanmadı; kayıtları veri akışı anlatmıyor, biz de anlatmıyoruz | Kayıtlar (`status: coming-soon`); `/privacy/motion` |
| Kontrol ve onay / Braavolabs | Para harcayan adımlar insan onayı bekler, denetim izi; roller, izinler, kesin bütçe durdurmaları | `projects/braavolabs.ts` `features[3]`, `features[4]` |
| Kontrol ve onay / LifeOS | Sağlık verisi yalnız izinle okunur; çevrimiçi yapay zekâ isteğe bağlı, onaylanan metin gider | `features[2]`; `/privacy/lifeos` ("Çevrimiçi yapay zekâ (isteğe bağlı)") |
| Ölçülebilir sonuç | "Henüz yayımlanmış sonuç ölçümü yok"; kayıtlardaki sayılar özellik adedidir, sonuç değildir; bazı public-registry claim'lerinin süresi dolmuştur; rakam gösterilmez | `src/data/public-registry.ts` (tüm `expiresAt` <= 2026-09-24) |
| Şeffaf ürün aşaması | Her ürün için ad + durum etiketi | `src/data/projects/*` `status` (okuma anında; yedek dilde İngilizce katalog); Burun Farkı listelenmez |

## Kararlar

- Süresi dolmuş `public-registry` claim'leri "doğrulandı" olarak kullanılmadı; sahne "doğrulandı/onaylandı/ölçüldü" ve "asla/her zaman" sözcüklerini taşımaz (e2e TR+EN denetler).
- Braavolabs satırı, kayıt veri akışı anlatmadığı için ürün kaydına değil gizlilik politikasına dayanır; satır "ürün kaydı bu veri akışını anlatmaz" der.
- Ostinato'nun `description` metnindeki "ölçülü pratik" ifadesi kullanılmadı.
- LifeOS "Yayında" iOS durumunu yansıtır; Android hâlâ kapalı testtir (kayıt yorumu). Aşama satırı mağaza kapsamı iddia etmez.
- 12 dilde İngilizce metin + `lang="en"` dir="ltr" (03a/03b/03c deseni); durum etiketleri İngilizce katalogdan okunur.
- İstemci JS'i, animasyon, ses, yeni bağımlılık yoktur.
