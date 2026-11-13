# yulalab.com — Aşama 3: üç bağımsız konsept ve değerlendirme matrisi (WEB-UX-02)

Tarih: 2026-11-09 · Taban: UX-01 dalının ucu (`main` `069477c` + `01-audit.md`, `02-mental-model.md`) · Kapsam: yalnız belge; kod, görsel, renk, sahne, animasyon değişikliği yok; nihai seçim yok (UX-03).
Atıf biçimi: `[U#]` = bu belgenin §6 UX-01 atıf dizinindeki satır (bölüm veya `dosya:satır`). `A§` = `01-audit.md`, `M§` = `02-mental-model.md`. Sayı, kullanıcı, başarı göstergesi yazılmadı; olmayan şey "UNKNOWN" veya "yok" diye yazıldı.
Ortak zemin (üç konsept için aynı, tekrar edilmez): (a) 3D sahne, `src/components/experience/` tamamı, animasyonlar, marka, renk, tipografi aynen kalır [U29]; (b) ana sayfa yolculuğu (`YulaExperience`) olduğu gibi çalışır, konseptler yolculuğun DIŞINDA kalan düzeni (header/dock, yolculuk sonrası bölümler, iç sayfalar) değiştirir; yolculuk içindeki overlay içeriği `experience/` altında olduğundan ona dokunulmaz; (c) ADR-003: masaüstü 3D varsayılan, mobil statik varsayılan (#50/#54 dalında; main'de yok) [U18]; sunucu HTML'i zaten tam doğrusal belgedir, yeni düzen blokları da sunucu HTML'inde bulunur [U16]; (d) ürün sırası tek kaynaktan gelir, böylece üç farklı sıra biter [U1]; not: `order` bugün `ProjectConfig`'te durur (`src/data/projects/*.ts`: braavolabs 1, burunfarki 2, lifeos 3, ostinato 7), `public-registry.ts`'te yoktur; "çekirdek" ayrımı yeni alan ya da değer değişikliği ister ve `src/app/[locale]/page.tsx:16-25,49-54` sıra koruması (build hatası) buna takılır; (e) durum rozeti: bugün yalnız "Yakında" çizilir, live/beta için `null` döner (`src/components/common/StatusPill.tsx:6-13`, kurucu kararı 2026-10-31: kartlar yayın durumu yazmaz; `02-mental-model.md:144` bunu açık soru bırakmıştı). Live/beta rozetini göstermek bu kurucu kararını değiştirir → KURUCU KARARI GEREKİR; UX-03 ADR'si bu karar alınana kadar rozeti mevcut davranışla (yalnız "Yakında") bırakır ya da karar maddesi olarak sunar; konseptlerdeki rozet/durum satırları bu karara bağlıdır [U2]; (f) yeni metinler 14 dilde anahtar paritesine girer, çevrilmemiş olan etiketli İngilizce yedekle gider [U22].

## 1. Giriş: tasarım problemi

UX-01 bulguları tek bir problemi gösterir: site vizyonu hissettiriyor ama ziyaretçiye "kimsin, neye varsın, nereye gideceksin" sorusunu kısa yolda cevaplatmıyor.
- İlk karede ürün adı yok; masaüstünde yükleyici adımları, mobilde sahne görünür [U15]; yükleyici atlanamıyor [U6].
- Ana sayfa mobilde de canvas çiziyor ve sayfa 21269 px (masaüstü 22680 px) [U7][U8].
- Ürün sırası üç yerde farklı (ana sayfa, `/projects`, eyebrow numarası) [U1].
- Durum dili: live ve beta rozeti bilinçli olarak çizilmiyor (mevcut kurucu kararı, `StatusPill.tsx:6-13`); bunun sonucu olarak beş ürün `research`, üçü live/beta, ama "Sekiz ürün, tek disiplin" ve tüm claim süreleri geçmiş [U2][U21][U9].
- Ürün sayfasında ekran görüntüsü yok; LifeOS ve Ostinato ürün kaydında `screenshots` boş (tarihli geliştirme görüntüsü yalnız `/transparency`'de); sayfadan gizlilik sayfasına doğrudan bağlantı yok [U3][U10].
- Yatırımcı ve iş ortağı yolu yok; kurumsal yol contact → consulting → çapa → e-posta zinciri; lab içeriği 3 not + boş vaka listesi [U4][U5][U11][U13].
Konseptler bu problemi üç farklı gezinme mantığıyla çözer: kitleye göre yol (K1), ürüne göre harita (K2), zamana ve kanıta göre defter (K3).

## 2. Konsept K1 — Niyet Kapıları (niyet/kitle merkezli yollar)

#### 1) Tasarım fikri ve gezinme mantığı
Ziyaretçi önce "burada ne için varım?" sorusuna cevap verir; site 5 kapı sunar (ürünü kullanmak, işime AI uygulatmak, birlikte çalışmak, mühendisliği incelemek, şirketi değerlendirmek). Her kapı o kitlenin sorularına göre sıralanmış kısa, bağımsız bir yol sayfasıdır; yol sayfaları mevcut sayfalara bağlanır, onların yerine geçmez. Gezinme: ana sayfa/header'daki kapı şeridi → yol sayfası → mevcut derin sayfa (ürün, consulting, transparency...). Kitleyi tahmin etmeyiz, kullanıcı seçer; seçim `sessionStorage` dışında hiçbir yerde saklanmaz (kişisel veri yok). Gerekçe: M§1 kitle matrisi her kitlenin farklı "ilk sonuç"u olduğunu gösterir [U31].
#### 2) Sayfa düzeni
```
MASAÜSTÜ  /
+-----------------------------------------------------------+
| header: YULA Lab | Kapılar v | Ürünler | Lab | Dil | Tema  |
+-----------------------------------------------------------+
| [ MEVCUT 3D YOLCULUK — dokunulmaz ]                        |
+-----------------------------------------------------------+
| "Ne için buradasın?"  (cam şerit, odak yüzeyi)            |
| [Ürünü kullan] [İşime AI] [Birlikte çalış] [İncele] [Şirket]|
+-----------------------------------------------------------+
| seçili kapının önizlemesi (3-4 satır + 1 gerçek bağlantı)  |
+-----------------------------------------------------------+
| Ürün durum şeridi: 8 ürün, aynı sıra, durum (karara bağlı)  |
+-----------------------------------------------------------+
| footer (mevcut)                                            |
MOBİL: yolculuk statik (ADR-003); kapılar dikey 5 satır liste; önizleme akordeon.
```
Kapı şeridi header'dan da erişilir (açılır panel), böylece uzun yolculuğu kaydırmadan yola girilebilir [U8][U15].
#### 3) Ürün evreni
Kapı 1 ("Ürünü kullan") 8 ürünü tek sıralı listeyle verir: LifeOS, Braavolabs, Ostinato öne alınır (talimat §6.1), Burun Farkı ve Gravita, Lissom, JabLab, Choreia silinmeden aynı listede kalır; her satırda durum (live/beta rozeti karara bağlı: ortak zemin (e); aksi halde yalnız "Yakında") ve tek erişim yolu: LifeOS App Store, Braavolabs web+App Store, Burun Farkı web; araştırma aşamasındaki ürünlerde "Çıkınca haber ver" mailto [U21][U25]. Burun Farkı kaydı ve claim metni aynen korunur.
#### 4) Ürün detay sayfası düzeni
Sıra "karar sırasıdır": (1) değer önerisi + durum rozeti (live/beta için karara bağlı), (2) indirme/deneme/erken erişim yolu (yalnız gerçek hedef varsa), (3) gerçek kullanım deneyimi, (4) öne çıkan yetenekler (yol haritasındakiler etiketli), (5) gerçek ekran/demo (kayıtta yoksa "ekran görüntüsü henüz yok" boş durumu; uydurma görsel yok), (6) gizlilik ve güven (`/privacy/<slug>` doğrudan bağlantı; Gravita, Lissom, JabLab, Ostinato, Choreia hepsi `/privacy/motion`'a gider, `public-registry.ts:216-264`), (7) mevcut yayın durumu (claim durumu #44'ten gelir), (8) gelecek vizyonu (yalnız "yol haritasında" ve kaynaklı) [U3][U10][U26]. Bugünkü bölüm dizisi aynı kalır, yalnız sıra değişir [U24].
#### 5) Demo/simülasyon ayrımı
Her demo yüzeyinde iki etiketten biri zorunlu: "Gerçek ürün yeteneği" (ürünün çalışan davranışını birebir gösterir) ya da "Örnek simülasyon" (kayıtsız, veri toplamaz, ürünün kendisi değil). #60 açık PR'dır, main'de demo yoktur; #60 Braavolabs plan kartı demosudur; yerel katalogla çalıştığı için "Örnek simülasyon" etiketiyle girer, "Gerçek" etiketi yalnız kurucu doğrulamasıyla verilir (UNKNOWN: kanıt kaydı) [U12]. Diğer ürünlerde demo yok; boş yer doldurulmaz.
#### 6) Laboratuvar/Lab
"İncele" kapısının içinde yaşar: `/notes` (3 giriş) + `/operating-system` + açık boş durumlu `/case-studies`. İçerik uydurulmaz; boş vaka listesi dürüstçe "henüz dış müşteri vakası yok" der (mevcut metin) [U13]. Not güncelliği (son giriş 2026-07-10) sayfada tarihle görünür.
#### 7) Mühendislik ve şeffaflık
`/transparency` ve `/operating-system` aynen kalır; "İncele" ve "Şirket" kapılarının üstünden çıkış noktası olur. Ürün sayfasındaki durum satırının `/transparency` ilgili ürün kaydına derin bağlantısı yeni iştir: sayfada ürün bazlı çapa yok (tek `id`, `transparency/page.tsx:189`). Süresi geçmiş claim'ler "Güncellik kontrolü bekleniyor" etiketiyle görünür kalır, gizlenmez [U9].
#### 8) İletişim yolları
- Ürün kullanıcısı: mağaza/web bağlantısı; destek `support@yulalab.com` (`company.ts:66-67`) [U32]. Kurumsal: `/consulting` + `yula@yulalab.com` mailto (form `LEADS_ENABLED` kapalıyken çizilmez) [U20].
- İş ortağı: gerçek ayrı kanal yok; kapı "genel adres + ne tür iş birliği" açıklaması gösterir, ayrı form/CTA yok (karar: UX-03) [U5].
- Geliştirici/araştırmacı: `/notes`, `/operating-system`, `public/portfolio-registry.json`; kod/doküman bağlantısı kayıtta yok, bu yüzden "GitHub" CTA'sı çizilmez [U14].
- Yatırımcı: yalnız bilgi sayfası (yasal biçim, ürün durumu, kim muhatap) + genel adres; "yatırım talebi" butonu yok; `messages/tr.json:759` bu cümleyi stüdyo bağlamında başvuranlara söyler ("sermaye ya da yatırım sağlamıyoruz"); yatırımcı mesajı olarak yanlış okunabilir (yatırım alıp almadığı anlamına gelmez). Yatırımcıya ne söyleneceği kurucu sorusudur [U4][U23].
#### 9) 5 kitlenin ilk 5 saniyesi
Ürün kullanıcısı: kapı etiketinden hangi ürünün ne yaptığını ve durumunu liste satırında görür. Kurumsal: "İşime AI" kapısı hizmet ve sınır özetini verir. İş ortağı: "Birlikte çalış" kapısı kimlik (şahıs işletmesi, ürün durumları) ve tek muhatabı verir. Geliştirici: "İncele" kapısı kanıt/yaklaşım sayfalarını tarihleriyle listeler. Yatırımcı: "Şirket" kapısı ürün durum şeridini ve yasal biçimi tek ekranda verir.
#### 10) Mevcut 3D sahneyle ilişki
`journey` tonundaki yolculuk (hero→closing) ana sayfada aynen oynar; kapı şeridi yolculuğun hemen altında ve header'da durur, sahne değişmez. İç sayfalar bugünkü `page` tonu (örtü 0.82) ve `quiet` rotalar (3D inmez) olarak kalır; yol sayfaları `page` tonu alır [U17][U29]. Yeni sahne/animasyon yok; kapı geçişleri mevcut `PageTransition`'dır.
#### 11) Glass kullanımının işlevi
Tek bir "odak cam" yüzey vardır: seçili kapının önizlemesi. Kapı şeridi ve ürün şeridi düz/ince yüzey olur, böylece hiyerarşi "şerit (seçenek) → cam önizleme (odak) → bağlantı" olur; her yüzeye cam konmaz. Mevcut `surface/raised/inset` tokenları kullanılır. ÖNERİ (eklenmesi gereken kural, bugün yok: `globals.css:495-529` ve `quality.ts` içinde `backdrop-filter` kapatma yoktur): düşük donanımda/reduced-motion'da cam yüzey düz yüzeye düşer [U33].
#### 12) Riskler ve UX-01 atıfları
- Kitleyi ayrıştırmak ortak içeriği çoğaltır (aynı sayfa 2 kapıda): tek kaynak + kapıya özgü giriş paragrafı gerekir [U31].
- 5 kapı, "yatırımcı" ve "iş ortağı" için gerçek kanal olmadığında zayıf içerik üretir [U4][U5][U23].
- Kapı şeridi yolculuğun altında kalırsa uzun sayfada geç görünür; header paneli bu yüzden zorunlu [U8].
- Atıflar: [U1][U2][U4][U5][U8][U9][U12][U13][U14][U15][U16][U17][U18][U20][U21][U23][U24][U25][U26][U31][U32].
Yönlendirme planı: mevcut 22 rota ve 14 dil aynen kalır; yeni rotalar `/start` ve `/start/{users,business,partners,builders,investors}` eklenir; hiçbir mevcut rota yönlendirilmez. `/contact → /consulting` zinciri kapıdan kısa yolla bağlanır [U11].

## 3. Konsept K2 — Ürün Evreni Haritası (ürün/katman merkezli keşif)

#### 1) Tasarım fikri ve gezinme mantığı
Site bir ürün evreni olarak okunur: çekirdekte üç stratejik ürün, çevrede portföyün geri kalanı. Gezinme "yakınlaş" mantığıdır: evren görünümü → ürün katmanı (panel) → ürün tam sayfası; her adımın kendi URL'si vardır (`/projects`, `/projects/[slug]`), panel aynı rotanın hafif sürümüdür. Ürünler bir dashboard'a birleştirilmez (talimat §6.3): her ürün kendi kimliğiyle ayrı katmandır [U34]. Filtreler: durum (live/beta/yakında), tür (uygulama/araç). "Harita" 2D düzendir; yeni 3D yok.
#### 2) Sayfa düzeni
```
MASAÜSTÜ  /projects  (ana sayfada aynı bileşen "mini" boyutta)
+-----------------------------------------------------------+
| header                                                    |
+-----------------------------------------------------------+
| durum süzgeci: (hepsi) (live) (beta) (yakında)            |
+--------------------------------+--------------------------+
|  EVREN                         |  KATMAN (cam panel)      |
|        [LifeOS]               |  LifeOS  [live]          |
|   [Braavolabs]  [Ostinato]    |  değer önerisi           |
|  . Burun Farkı  . Gravita      |  indir/dene (gerçek)     |
|  . Lissom . JabLab . Choreia   |  gizlilik · durum · ...  |
|                                |  [Tam sayfayı aç ->]     |
+--------------------------------+--------------------------+
MOBİL: harita yerine 2 bölümlü statik liste (Çekirdek / Portföy); kart dokununca ürün tam sayfası; panel yok (ADR-003).
```
Harita arka planı ek WebGL kullanmaz; klavye ve ekran okuyucu için sıralı liste eşdeğeri DOM'un birincil biçimidir (harita onun görsel katmanıdır) [U16].
#### 3) Ürün evreni
Çekirdek halka: LifeOS (live), Braavolabs (beta), Ostinato (araştırma; "Yakında", erişim yolu "Çıkınca haber ver"). Dış halka: Burun Farkı (live, claim'ler aynen), Gravita, Lissom, JabLab, Choreia (araştırma). Hiçbiri silinmez. Halka yerleşimi tek bir sıra kaynağından türer (ortak zemin (d): `order` `ProjectConfig`'te, çekirdek ayrımı yeni alan/değer ister); ana sayfa, `/projects` ve ürün eyebrow'u aynı sırayı kullanır [U1][U21]. Çekirdek/dış ayrımı tasarım iddiası değil, talimat §6.1'in "üç stratejik ürün ön plana çıkabilir" izniyle uyumlu sıralamadır.
#### 4) Ürün detay sayfası düzeni
Ürün sayfası "katmanlar" halinde sunulur (sekme yerine dikey bölüm + sabit mini içindekiler): Katman A Değer ve kullanım (1, 2, 3), Katman B Ekran/demo (4), Katman C Güven (5: gizlilik doğrudan bağlantı; slug'lı `/privacy/` yalnız braavolabs, burunfarki, lifeos; Motion beşlisi `/privacy/motion`), Katman D Durum ve gelecek (6, 7), Katman E Erişim (8: indirme/deneme/erken erişim) — erişim ayrıca panelin her katmanında sabit görünür. 8 madde de korunur; ürün kaydında ekran görüntüsü olmayan ürünlerde boş durum açıkça yazılır [U3][U10][U19].
#### 5) Demo/simülasyon ayrımı
Katman B'de iki ayrı alt alan: "Ürünün kendisi" (gerçek ekran görüntüsü, tarihli; bugün ürün kaydında Braavolabs 2 ve Burun Farkı 2, LifeOS/Ostinato `screenshots` boş; ikisinin 2026-10-16 tarihli geliştirme görüntüsü yalnız `/transparency`'de, `product-presentations.ts:13,45`) ve "Örnek simülasyon" (#60 açık PR, main'de yok; plan kartı, etiketli). İki alan aynı çerçeveye konmaz; simülasyon çerçevesi görünür bir "simülasyon" yazısı taşır [U3][U12]. Ağ=0 ilkesi (kullanıcı verisi toplama yok) yüzeyde yazılır.
#### 6) Laboratuvar/Lab
Evrenin bir "araştırma" katmanıdır: Gravita, Lissom, JabLab, Choreia, Ostinato kayıtlarının araştırma durumu + `/notes` girişleri ürün bazlı süzülür. Not yoksa ürün katmanında "henüz not yok" yazılır; kayıt uydurulmaz. `/case-studies` boş durumuyla kalır [U13][U21].
#### 7) Mühendislik ve şeffaflık
Her ürün katmanında "Durum ve kanıt" satırı `/transparency` ilgili kaydına bağlanır (ürün bazlı derin bağlantı yeni iştir: tek `id`, `transparency/page.tsx:189`); claim süresi/durumu (stale/planned) #44 sonrası etiket olarak çizilir. `/transparency` ve `/operating-system` evrenin dışında "Şeffaflık" başlığı altında kalır. Süresi geçmiş claim'ler gizlenmez [U9][U26].
#### 8) İletişim yolları
- Ürün kullanıcısı: panelden mağaza/web; destek `support@yulalab.com`. Kurumsal: `/consulting` evrenden ayrı, header'da sabit "AI danışmanlığı"; `yula@yulalab.com` [U20][U32].
- İş ortağı: ürün katmanında "Bu ürünle ilgili iş birliği" mailto (konu satırı ürün adıyla hazır); ayrı kanal olmadığından genel adrese gider, bunu açıkça yazar [U5].
- Geliştirici: katman C'de kayıt dışa aktarımı (`portfolio-registry.json`) ve `/transparency`; kod/doküman hedefi yok → CTA yok [U14].
- Yatırımcı: evren görünümünün "Durum özeti" (live/beta/araştırma dağılımı kayıttan türetilir, elle sayı yazılmaz) + genel adres; yatırım butonu yok [U4][U23].
#### 9) 5 kitlenin ilk 5 saniyesi
Ürün kullanıcısı: haritada ürün adlarını ve (karara bağlı) durum rozetlerini görür, tek dokunuşla kendi ürününün paneline girer. Kurumsal: header'daki sabit danışmanlık bağlantısını ve "ürünlerimiz kanıt" ilişkisini görür. İş ortağı: hangi ürünün hangi aşamada olduğunu haritadan okur. Geliştirici: ürün panelinden kayıt/şeffaflık bağlantısına ulaşır. Yatırımcı: durum süzgeciyle neyin gerçekten yayında olduğunu tek ekranda görür.
#### 10) Mevcut 3D sahneyle ilişki
Ana sayfada `portfolio` anına karşılık gelen düzen yolculuğun altında mini evren olarak yinelenir; sahne dosyalarına (örn. `PortfolioField`) dokunulmaz, harita onları taklit etmez ve onların yerine geçmez. `/projects` mevcut `page` tonunda kalır; ürün sayfaları aynı `page` tonunda [U17][U29]. Yeni sahne/animasyon yok; panel açılışı mevcut hareket sözlüğündeki (`src/lib/motion.ts`) geçişlerden biridir.
#### 11) Glass kullanımının işlevi
Cam yalnız panelde (katman) kullanılır: harita düz kalır, panel haritanın üstüne çıkan tek odak yüzeyidir; böylece "şu an neye bakıyorum" sorusu görsel derinlikle cevaplanır. İç içe cam yok; panel kapalıyken ekranda cam yüzey sayısı sıfıra yakındır. Okunabilirlik için panel gövdesi bulanıklıkta değil, kontrast korunmuş yüzeyde metin taşır [U33].
#### 12) Riskler ve UX-01 atıfları
- Harita etkileşimi erişilebilirlik riski taşır; liste eşdeğeri ve klavye yolu zorunlu (320px, odak tuzağı testleri yeniden yazılır) [U16][U35].
- Çekirdek/dış ayrımı Ostinato'yu (araştırma) "çekirdek"te gösterir; durum etiketi bunu dürüst tutmazsa "hepsi canlı" imasına kayar [U2][U21].
- Süzgeç, durum özeti ve şema gösterimleri (live/beta) rozet kararına bağlıdır: kurucu kararı live/beta rozetini göstermemeyi sürdürürse bu kurgu yalnız "Yakında" ve metin etiketiyle yeniden kurulmalıdır (açık soru 11; `StatusPill.tsx:6-13`).
- Panel + tam sayfa çift görünüm bakım maliyeti yaratır; tek bileşen iki biçimde render edilmelidir [U24].
- Atıflar: [U1][U2][U3][U5][U9][U10][U12][U13][U14][U16][U17][U19][U20][U21][U24][U26][U29][U32][U34][U35].
Yönlendirme planı: yeni rota yok; `/projects` evren görünümüne dönüşür, `/projects/[slug]` ve slug'lar aynı kalır, panel `?katman=` sorgusuyla aynı sayfayı açar; mevcut 22 rota ve 14 dil korunur, yönlendirme gerekmez.

## 4. Konsept K3 — Kanıt Defteri (zaman ve kanıt akışı merkezli anlatı)

#### 1) Tasarım fikri ve gezinme mantığı
Site "ne yaptık, ne zaman, neyle doğruladık" sorusuna dayanan tarihli bir defter olarak da okunur: yayın durumu değişimleri, claim doğrulamaları, karar kayıtları ve Lab notları tek zaman akışında. Gezinme: defter (zaman) → süzgeç (ürün, tür, dönem) → kayıt ayrıntısı → ilgili ürün sayfası. Ürün sayfaları kaybolmaz; defter onlara kanıt üzerinden bağlanır. Fikir, sitenin zaten sahip olduğu "KANIT DEFTERİ" dilini [U36] ve `verifiedAt/expiresAt` alanlarını [U9] gezinme mantığına dönüştürür.
#### 2) Sayfa düzeni
```
MASAÜSTÜ  /ledger  (ana sayfada son 5 kayıt şeridi)
+-----------------------------------------------------------+
| header                                                    |
+-----------------------------------------------------------+
| süzgeç: ürün v | tür: durum/claim/karar/not | dönem v      |
+--------+--------------------------------------------------+
| 2026-  |  o  <tarih>  LifeOS · durum: live                |
| 11     |     kayıt özeti + kaynak/kanıt türü              |
|  ...   |  o  <tarih>  Claim doğrulaması · "güncellik      |
|        |     kontrolü bekleniyor" (stale)                 |
|        |  o  <tarih>  Lab notu / karar kaydı              |
+--------+--------------------------------------------------+
| seçili kayıt: ayrıntı (cam panel) + "ürüne git ->"       |
MOBİL: tek sütun dikey akış, süzgeç üstte sticky; ayrıntı akordeon; statik (ADR-003).
```
Boş dönem açıkça "kayıt yok" yazar; boşluk uydurulmaz.
#### 3) Ürün evreni
Ürünler akışın "kimlik" noktalarıdır: her ürünün kayıt sayfası ve en son durum kaydı vardır. Ana sayfa şeridinde LifeOS, Braavolabs, Ostinato öne alınır; tüm 8 ürün süzgeçte listelenir ve hiçbiri silinmez. Sıra yine tek `order` alanından gelir [U1]. Durum kayıttan (rozet olarak gösterilmesi karara bağlı): live (LifeOS, Burun Farkı), beta (Braavolabs), research (Gravita, Lissom, JabLab, Ostinato, Choreia) [U21].
#### 4) Ürün detay sayfası düzeni
Ürün sayfası "ürünün zaman çizgisi" gibi okunur: üstte durum + değer önerisi + erişim yolu (1, 8), altında kullanım ve yetenekler (2, 3), ardından tarihli ekran/demo (4) — `/transparency`'deki tarihli geliştirme görüntüleri (LifeOS/Ostinato, 2026-10-16) bugün ürün kaydında değildir; ürün sayfasına taşınması yeni iştir — gizlilik ve güven (5), durum/claim kayıtları tarih sırasıyla (6), vizyon (7). Ürün kaydında ekran görüntüsü olmayan ürün için boş durum yazılır (taşıma yapılana kadar LifeOS, Ostinato; taşınırsa tarihli geliştirme görüntüsüyle) [U3][U10][U26].
#### 5) Demo/simülasyon ayrımı
Defterde her kayıt türü etiketlidir: "Ölçüldü", "Kaynak kodda doğrulandı", "Beyan", "Üçüncü taraf doğruladı" (mevcut `EvidenceKind`), demolar ise "Gerçek yetenek" ya da "Örnek simülasyon". Aynı etiket dili iki alanı da kapsar; simülasyon hiçbir zaman kanıt kaydı olarak çizilmez. #60 (açık PR, main'de demo yok) plan kartı yalnız "Örnek simülasyon" ve ürün sayfasında kalır, defterde kayıt olmaz [U12][U30].
#### 6) Laboratuvar/Lab
Lab, defterin "not" ve "karar" türüdür: bugün 3 not (üçü 2026-07-10) ve ADR karar kayıtları (ADR-001..003 bugün `docs/yula-execution/` içinde, main'de yok; kamuya açılıp açılmayacağı kurucu kararı). Vaka çalışmaları boş kalır ve öyle yazılır. İçerik üretilmeden bu konseptin Lab alanı seyrek kalır; seyreklik gizlenmez [U13].
#### 7) Mühendislik ve şeffaflık
Konseptin merkezidir: `/transparency` defterin "claim ve durum" görünümüne dönüşür; geçmiş claim süreleri, doğrulama yöntemi, kaynak ve kapsam kayıtta görünür. #44 sonrası `claimState` (stale/planned) kayıt rozeti olur; `verify:claims` kapıları aynı veriyi besler [U9][U26][U30]. `/operating-system` aynen kalır.
#### 8) İletişim yolları
- Ürün kullanıcısı: ürün kaydından mağaza/web; destek adresi. Kurumsal: `/consulting` ve `yula@yulalab.com`; defterde "danışmanlık kapsamı ve sınırları" kaydı olarak da görünür [U20][U32].
- İş ortağı: yayın durumu ve gizlilik kayıtlarına bağlantı + genel adres; ayrı kanal yok [U5].
- Geliştirici/araştırmacı: not ve karar kayıtları, kayıt dışa aktarımı (`portfolio-registry.json`); kaynak/doküman hedefi yoksa CTA yok [U14].
- Yatırımcı: "Durum ve kanıt" süzgeci ön ayarlı bağlantı; ek olarak yasal biçim ve genel adres; yatırım butonu yok; "sermaye sağlamıyoruz" cümlesi stüdyo bağlamında başvuranlara yazılmıştır, yatırımcı mesajı olarak yanlış okunabilir; yatırımcıya ne söyleneceği kurucu sorusudur [U4][U23].
#### 9) 5 kitlenin ilk 5 saniyesi
Ürün kullanıcısı: son kayıtlarda hangi ürünün yayında olduğunu ve ne zaman güncellendiğini görür. Kurumsal: danışmanlık kapsam/sınır kaydını ve gerçek referans durumunu (dış müşteri vakası yok) dürüstçe görür. İş ortağı: tarihli durum kayıtlarından ürünün gerçek aşamasını okur. Geliştirici: kaynak, kapsam ve doğrulama yöntemiyle kayıtları süzer. Yatırımcı: şirketin neyi, ne zaman ve hangi kanıtla yayına aldığını kronolojik görür.
#### 10) Mevcut 3D sahneyle ilişki
Ana sayfadaki `proof` ve `values` anlarına denk gelen anlatı, yolculuk sonrasında defter şeridine bağlanır; sahne ve overlay aynen kalır. `/ledger` `page` tonunda çizilir, `quiet` yasal/silme rotaları değişmez [U17][U29]. Yeni sahne/animasyon yok; kayıt akışı için yalnız mevcut `Reveal` davranışı kullanılır, ek hareket tanımlanmaz.
#### 11) Glass kullanımının işlevi
Cam yalnız "seçili kayıt" için kullanılır: zaman çizgisi düz kalır, seçilen kayıt cam panelle öne çıkar; böylece zaman ekseni (bağlam) ile ayrıntı (odak) ayrışır. Stale/planned gibi durumlar cam derinliğiyle değil metin etiketiyle verilir, renk önerilmez; azaltılmış hareket ve düşük donanımda panel düz yüzeye düşer [U33].
#### 12) Riskler ve UX-01 atıfları
- En büyük risk içerik: bugün 3 not ve süresi geçmiş claim'lerle defter seyrek ve eski görünür; üretim sürekliliği (kimin, hangi sıklıkta) belirsiz (UNKNOWN) [U9][U13].
- Yeni veri modeli (kayıt olayı/tarih) gerekir; `ProductClaim` alanları yetmez, ek şema kararı UX-03/mühendislik işidir [U26].
- Kronolojik akış "ürünü kullanmak isteyen" kitleye ağır gelir; ürün erişim yolu her kayıtta ve header'da kalmalı [U31].
- Atıflar: [U1][U3][U4][U5][U9][U10][U12][U13][U14][U17][U20][U21][U23][U26][U29][U30][U31][U32][U36].
Yönlendirme planı: yeni rota `/ledger`; önce `/notes` ve `/transparency` yan yana yaşar; sonra `/notes → /ledger?type=notes` kalıcı yönlendirme önerilir (UX-03 kararı); `/case-studies`, `/transparency`, `/operating-system` ve mevcut 22 rota ile 14 dil korunur.

## 5. Değerlendirme matrisi

Puan 1–5; yüksek = iyi. **Mühendislik maliyeti ölçütünde yüksek puan = UCUZ** (düşük maliyet) anlamına gelir; diğer beş ölçütte yüksek = daha iyi. Puanlar kullanıcı verisine değil kaynak okumasına ve UX-01 bulgularına dayanan öznel mühendislik/tasarım yargısıdır (ölçüm yok).

| Ölçüt | K1 Niyet Kapıları | K2 Ürün Evreni Haritası | K3 Kanıt Defteri |
|---|---|---|---|
| Kullanım kolaylığı | **5** · Kitle seçimi tek adım, öğrenme gerektirmez [U31] | **4** · Ürün adıyla doğrudan keşif, ama süzgeç/panel biraz öğrenir [U1] | **3** · Kronolojik akış ürün arayan için dolambaçlı [U31] |
| Özgünlük | **3** · Niyet kapıları tanıdık bir kalıp, içerik düzeni özgün | **4** · Ürünler dashboard'a birleşmeden katman olarak keşfedilir [U34] | **5** · Kanıt/zaman akışı sitenin gerçek kanıt kültürüne özgü [U36] |
| Erişilebilirlik | **5** · Liste ve bağlantı ağırlıklı, doğrusal belgeyle örtüşür [U16] | **3** · Harita/panel için liste eşdeğeri ve odak yönetimi şart [U16] | **4** · Doğrusal akış doğal, süzgeç klavyeyle yönetilebilir |
| Profesyonel derinlik | **3** · Derinlik mevcut sayfalara devredilir, kapı yüzeysel kalabilir | **4** · Ürün katmanı gizlilik, durum, erişim bilgisini bir arada tutar [U10] | **5** · Kaynak, kapsam, tarih ve yöntem merkezde [U30] |
| Mühendislik maliyeti (yüksek = ucuz) | **4** · Yeni 6 rota ama mevcut içerik yeniden düzenlenir | **3** · Harita + panel + erişilebilir eşdeğer tek bileşende yeniden kurulur [U24] | **2** · Yeni veri modeli, içerik üretim süreci ve yönlendirme gerekir [U26] |
| Mevcut ürünle uyum | **4** · Mevcut sayfalar ve ADR-003 ile uyumlu [U18] | **5** · Registry ve `/projects` yapısına doğrudan oturur [U1][U21] | **3** · Veri bugün seyrek, claim süreleri geçmiş [U9][U13] |
| **Toplam (30 üzerinden)** | **24** | **23** | **22** |

Ağırlıksız sıralama: 1) K1 Niyet Kapıları (24), 2) K2 Ürün Evreni Haritası (23), 3) K3 Kanıt Defteri (22). Farklar küçüktür (24/23/22); puanlar kesin sıralama değil, UX-03 tartışmasının başlangıcıdır.

## 6. Karşılaştırma notu

- Kitle uyumu: K1 en çok ürün kullanıcısı ve kurumsal müşteri; K2 ürün kullanıcısı ve iş ortağı; K3 geliştirici/araştırmacı ve yatırımcı için daha güçlü. Hiçbiri tek başına beş kitleyi eşit karşılamaz [U4][U5].
- Üç konseptin ortak sorunu içerik boşluğudur (gerçek yatırımcı/iş ortağı kanalı, kod/doküman bağlantısı, ekran görüntüsü yokluğu); düzen bunu çözmez, yalnız dürüst boş durum gösterir [U3][U5][U14].
- Melez olasılığı: K1'in kapı şeridi (giriş) + K2'nin ürün katmanı (ürün evreni) + K3'ün defteri yalnız `/transparency` genişlemesi olarak (kanıt). Üç ayrı gezinme sistemi aynı anda çalışmaz; melez tek gezinme mantığına dayanmalı.
- Öneri eğilimi (nihai seçim değil): K1'in kapı mantığı + K2'nin ürün katmanı; gerekçe: UX-01 bulgularının çoğu (üç farklı sıra, rozet, ekran görüntüsü, yatırımcı/iş ortağı yolu) bu ikisiyle çözülebilir, maliyet K3'ten düşük ve ADR-003 ile uyumlu [U1][U2][U3][U4][U18]. K3 içerik üretim sürekliliği netleşince aşamalı eklenebilir.
- UX-03 ADR'sinde AÇIK sorular: (1) yatırımcı ve iş ortağı için gerçek kanal/yayın cümlesi (kurucu kararı); (2) "Sermaye sağlamıyoruz" ve "dış müşteri işi tamamlamadık" cümlelerinin `/studio` dışında yayını (yatırımcı mesajı olarak yanlış okunabilir; yatırımcıya ne söyleneceği ayrı kurucu sorusu); (3) ADR kayıtlarının kamuya açılması; (4) kod/doküman/basın kiti hedefi var mı; (5) ürün sırası kaynağı ve Ostinato'nun "çekirdek" gösterimi; (6) yükleyici atlama denetimi (animasyon değil davranış; ayrı karar); (7) ana sayfa yolculuğunun önüne/arkasına blok eklemenin storyboard'a etkisi (UNKNOWN); (8) demo "Gerçek yetenek" etiketi için kanıt kaydı; (9) claim sürelerinin yenilenmesi; (10) yeni 14 dil anahtarları için insan inceleme kapasitesi; (11) live/beta durum rozetini göstermek 2026-10-31 kurucu kararını (kartlar yayın durumu yazmaz, `StatusPill.tsx:6-13`) değiştirir: KURUCU KARARI; karar çıkana kadar yalnız "Yakında" [U2][U9][U6][U12][U22].

## 7. UX-01 atıf dizini

| # | Bulgu | Kaynak (bölüm veya `dosya:satır`) |
|---|---|---|
| U1 | Ürün sırası üç yerde farklı | `M§2 B`; `src/app/[locale]/page.tsx:16-25`; `src/lib/product-index.ts:44-56`; `M§5 #6` |
| U2 | StatusPill yalnız "Yakında" çiziyor, live/beta yok | `src/components/common/StatusPill.tsx:13`; `M§1.1 s9`; `M§3 #5` |
| U3 | Ürün sayfasında ekran görüntüsü yok; LifeOS/Ostinato `screenshots: []` | `PP:104`; `src/data/projects/lifeos.ts:41`; `ostinato.ts:41`; `M§2 C4` |
| U4 | Yatırımcı yolu yok | `M§1.5 s1`; `M§2 G5` |
| U5 | İş ortağı yolu yok | `M§1.3 s1`; `M§2 G3` |
| U6 | Yükleyici atlanamıyor | `M§3 #3`; `src/components/experience/YulaExperience.tsx:46-48,276-282` |
| U7 | Mobilde canvas=1 (ana sayfa) | `M§3 #4`; `scratch/2026-11-09-web-ux-01/INDEX.md` home mobile |
| U8 | Ana sayfa uzunluğu 21269 px mobil / 22680 px masaüstü | `INDEX.md` home satırları; `M§3 #4` |
| U9 | Tüm claim `expiresAt` 2026-09-18..24, geçmiş | `A§4`; `src/data/public-registry.ts:30-201`; `M§1.3 s9` |
| U10 | Ürün sayfasından gizlilik bağlantısı yok | `PP` içinde `privacy` yok; `M§1.1 s9`; `M§2 C5` |
| U11 | contact → consulting → çapa → e-posta zinciri | `M§1.2` zincir gözlemi; `src/app/[locale]/contact/page.tsx:96`; `consulting/page.tsx:31,56` |
| U12 | Main'de demo yok; #60 açık PR (henüz main'de değil) | `M§2 D`; `M§3 #7` |
| U13 | `/notes` 3 giriş (2026-07-10); `/case-studies` boş | `src/data/notes.ts:17,29,41`; `src/data/case-studies.ts:27`; `M§1.4 s4,s5` |
| U14 | Kod/doküman/GitHub bağlantısı yok | `M§1.4 s1`; `M§5 #9`; `messages/tr.json:268,278,279` |
| U15 | İlk karede ürün adı yok | `M§1.1 s3`; `home-desktop.png`, `home-mobile.png` |
| U16 | Sunucu HTML'i tam doğrusal belge; "2D" düğmesi | `YulaExperience.tsx:501-510`; `ExperienceOverlay.tsx:187-191`; `M§5 #13` |
| U17 | Sahne tonları journey/page/quiet; quiet'ta 3D inmez | `A§3`; `src/components/experience/scene-route.ts:6-17` |
| U18 | ADR-003: masaüstü 3D, mobil statik (#50/#54'te) | `A§3`; `A§9`; `A§8` PR #50/#54 |
| U19 | Ürün pitch/özellik serbest metin, kanıt bağlantısı yok | `M§3 #2`; `PP:127-153` |
| U20 | İletişim formu varsayılan kapalı; mailto açık | `src/server/lead-surface.ts:31-33`; `contact/page.tsx:44-49`; `A§9` |
| U21 | Registry: 2 live, 1 beta, 5 research | `A§4`; `src/data/public-registry.ts:20,104,166,209-259`; `M§1.5 s3` |
| U22 | 14 dil; yeni anahtarlar insan incelemesi görmedi; header 8 öğe, #48 yeniden etiketler | `A§5`; `A§1.3`; `src/components/layout/Header.tsx:19-28` |
| U23 | "Sermaye sağlamıyoruz / dış müşteri yok" yalnız `/studio`'da, kapalı | `messages/tr.json:759`; `src/server/studio-surface.ts:8-10`; `M§1.5 s9`; `M§1.2 s9` |
| U24 | Tüm ürün sayfaları aynı bölüm dizisi | `M§3 #1`; `PP:102-283` |
| U25 | Ostinato erişim: bağlantı yok, "Çıkınca haber ver" | `src/data/projects/ostinato.ts:88`; `PP:261-268`; `M§1.1 s1` |
| U26 | Claim durumu (`claimState`) main'de yok, #44'te | `A§4`; `M§1.4 s9`; DECISIONS ADR-001 (PR #46) |
| U29 | 3D sahne, animasyon, marka, renk, tipografi korunur | `A§Korunacaklar`; `M§4`; `A§2` |
| U30 | Doğrulama kapıları (`verify:claims`, yasaklı kalıplar) | `A§4`; `scripts/forbidden-patterns.mjs:13-25` |
| U31 | Kitle matrisi: her kitlenin farklı ilk sonucu | `M§1.1–1.5` soru 1 ve 3 |
| U32 | İletişim adresleri (`yula@`, `support@`) | `src/data/company.ts:66-67`; `M§5 #14` |
| U33 | Reduced-motion ve düşük katman yedeği | `A§3` (reduced-motion); `src/app/globals.css:495-529`; `quality.ts:99-140` |
| U34 | Ürünler tek dashboard'a zorlanmaz; ürün başına kimlik | `M§3 #8`; talimat §6.3 |
| U35 | 320px / klavye / odak tuzağı E2E | `A§6`; `A§7` (menü, `Header.tsx:143-172`) |
| U36 | "KANIT DEFTERİ" ifadesi ana sayfa ikinci yarıda | `messages/tr.json:615-618`; `M§1.4 s3` |

Not: `U27`, `U28` numaraları kullanılmadı (boş bırakıldı). Kullanılan atıf sayısı 34 satır; `PP` = `src/components/projects/ProductPage.tsx`. UNKNOWN: harita/panel erişilebilirlik kabulü, yolculuk öncesi/sonrası blok eklemenin storyboard/`useExperienceProgress` etkisi, ADR'lerin kamuya açılması, defter içerik sürekliliği, demo kanıt kaydı.
