# WEB-P0-03f: Sahne 5 kanıt tablosu

Tarih: 2026-11-08. Sahne 5 ("Yaşayan laboratuvar") `src/data/notes.ts`'teki gerçek notları ve depodaki bir gerçek tasarım kararını `soru → hipotez → ne yaptık → ne öğrendik → sonraki test` şablonuna koyar. Sayı, ölçüm, "doğrulandı" ifadesi ve makale yoktur (3 gerçek makale WEB-P0-09'dadır).

| Kayıt | Tarih | Kaynak | Dolu alanlar | "henüz yazılmadı" | Bağlantı |
|---|---|---|---|---|---|
| Tasarım kararı: 3D sahne varsayılan açık mı (KABUL EDİLDİ 2026-11-08, Project orchestration; uygulama ayrı değişiklikte inceleniyor) | 2026-11-08 | `docs/yula-execution/adr-003-3d-default.md` | soru (belge başlığı), ne yaptık (Seçenekler + Lighthouse koşusu), ne öğrendik (belgenin "Bilet kabulüne göre durum", "Ölçüm" ve "03a2 sonrası" bölümleri, rakamsız; sonuç "oynak" diye belirtilir), sonraki test ("Karar (kabul)" + "Açık risk: mobil LCP"); durum satırı belgenin ilk satırı + koordinatörün bildirdiği inceleme durumu | hipotez (belge hipotez yazmaz) | yok: depo içi belge, sitede sayfası yok |
| Not `site-motion` | 2026-07-10 | `src/data/notes.ts` | ne yaptık = notun `body` | soru, hipotez, ne öğrendik, sonraki test | `/notes#site-motion` |
| Not `terms-of-service` | 2026-07-10 | `src/data/notes.ts` | ne yaptık = notun `body` | aynı dört alan | `/notes#terms-of-service` |
| Not `lifeos-live` | 2026-07-10 | `src/data/notes.ts` | ne yaptık = notun `body` | aynı dört alan | `/notes#lifeos-live` |

## Kararlar

- Notlar yalnız `title`, `date`, `body` taşır; bu yüzden yalnız "ne yaptık" dolar, kalan dört alan boş ve dürüstçe "henüz yazılmadı" der. Uydurma doldurma yok.
- ADR-003 artık KABUL EDİLDİ (belgenin ilk satırı: "KABUL EDİLDİ — Project orchestration (teknik tercih), 2026-11-08"; dal `feat/WEB-P0-03a2-mobile-static` ile birleştirildi). Sahne "Durum: kabul edildi (2026-11-08, Project orchestration); mobil statik varsayılan uygulaması ayrı bir değişiklikte inceleniyor" der; "yayında" demez. Belgedeki Lighthouse tablosunun rakamları gösterilmez (yerel denemeler, canlıda denenmedi, gerçek cihaz kanıtı yok; metin bunu söyler). ADR Türkçe yazılmıştır; İngilizce metin onun özetidir ve "kaynak belge Türkçe" diye etiketlenir.
- Notlar hangi dilde yazıldıysa o dilde gösterilir. Bir not istenen dilde yoksa diğer dilde ve `lang` ile, "Çeviri yok" etiketiyle gösterilir (`pickNoteText`, `tests/scene5-lab.test.ts`). Şu an üç notun da `tr` ve `en` metni vardır; yedek dil bloğu (12 dil) İngilizce metni gösterir ve `lang="en"` taşır.
- Her notun bağlantısı `/notes#<slug>`: `/notes` sayfasındaki kart `id={slug}` aldı (yalnız bu eklendi). Bağlantı metni notun başlığıdır (benzersiz).
- `src/data/public-registry.ts` claim'leri KULLANILMADI (süresi dolmuş). Burun Farkı kaydı kullanılmadı.
- Bağlantılar `Link` yerine düz `<a href={localePath(...)}>` (03e deseni); `/notes#slug` locale önekli kalır.
- Sahne istemci JS'i, animasyon, ses ya da yeni bağımlılık içermez.
