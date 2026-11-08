# WEB-P0-03c: Sahne 2 kanıt tablosu

Tarih: 2026-11-08. Sahne 2 ("Fark") üç çift gösterir. Sağ hücre ya "Mevcut yetenek" (bir ürün kaydına bağlı) ya "Vizyonumuz" etiketlidir. Sayı, ölçüm ve "doğrulandı" ifadesi yoktur.

| Çift | Sağ hücre (özet) | Etiket | Kaynak |
|---|---|---|---|
| 1. Daha fazla ekran, giriş ve model seçimi ↔ Tek uygulama, hesap gerekmez | LifeOS: beş yaşam alanı bir arada, çevrimdışı öncelikli | Mevcut yetenek | `src/data/projects/lifeos.ts`: `short` ("Five life areas in one place; no account needed"), `features[0]`, `features[1]`; `status: "live"` (rozet kayıttan okunur) |
| 2. Hatalı kesinlik ↔ Cevabın kaynağını ve belirsizliğini söylemek | Her sonuçta kaynak ve belirsizlik göstermek | Vizyonumuz | Kayıt yok; ürün yeteneği olarak iddia edilmez |
| 3. Sonsuz bildirim ↔ Anlamlı zamanda müdahale | Daha az, doğru zamanda bildirim | Vizyonumuz | Kayıt yok; ürün yeteneği olarak iddia edilmez |

## Kararlar

- `src/data/public-registry.ts` claim'leri (ör. `lifeos-on-device-encryption`) bu sahnede KULLANILMADI: hepsinin `expiresAt` tarihi geçmiş (en geç 2026-09-18). Süresi dolmuş claim "doğrulandı" sayılmaz. Satır 1 yalnız ürün kaydının kendi beyanına dayanır ve metin bunu söyler ("bağımsız doğrulama ya da ölçüm değildir").
- Brief'teki "Açık kaynak ve belirsizlik" ifadesi "açık kaynaklı yazılım" olarak okunabilir; yanlış iddiaya yol açmamak için "Cevabın kaynağını ve belirsizliğini açıkça söylemek" yazıldı.
- Burun Farkı kaydı kullanılmadı.
- 12 dilde İngilizce metin + `lang="en"` (03a/03b deseni); çeviri uydurulmadı.
- Sahne istemci JS'i, animasyon, ses ya da yeni bağımlılık içermez.

## İnceleme düzeltmeleri (reviewer, 2026-11-08)
- Capability satırının başlığı kayıttaki ifadeye çekildi ("Tek uygulama, hesap gerekmez"; `features[1]`, `short`); "daha az adım/daha çok sonuç" kayıtta yok, kaldırıldı. `detail`: "çevrimdışı öncelikli" kayıttaki `description` ifadesidir.
- "Sık görülen" sütunu başkalarının genel örüntüsünü anlatır, ölçüm iddiası değildir; dayanaksız genelleme olduğu `note` içinde de "yaklaşım" olarak çerçevelenir.
- Kaynak satırındaki durum kelimesi yedek dillerde İngilizce katalogdan okunur (lang="en" dir="ltr" bloğunda karışık dil olmaz).
- Liste `aria-label` taşır. Bilinen sınır: `Yayında` kaydı LifeOS'un iOS durumunu yansıtır; Android hâlâ kapalı test (kayıt yorumu), satır "ürün kaydı durumu" der, mağaza kapsamı iddia etmez.
