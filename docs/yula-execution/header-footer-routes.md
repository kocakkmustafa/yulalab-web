# WEB-P0-02b — Header, footer ve mobil menü: rota eşleme tablosu

Kaynak: `src/components/layout/nav-config.ts`. Rota silinmedi, yeniden adlandırılmadı; yalnız etiket → mevcut rota eşlemesi var. `tests/header-footer-routes.test.ts` tüm `src/app/[locale]/**/page.tsx` rotalarını bu kümeyle karşılaştırır.

## Giriş etiketi → rota

| Etiket (TR / EN) | Rota | Header (masaüstü) | Mobil menü | Footer | Neden |
|---|---|---|---|---|---|
| YULA Lab (marka) | `/` | evet | (panel başlığı) | evet | Marka "YULA Lab" kalır |
| Ürünler / Products | `/projects` | evet | öne çıkan | evet (ürün listesi + Projeler) | Üç temel girişten biri |
| Laboratuvar / Lab | `/notes` | evet | öne çıkan | evet (Notlar) | Üç temel girişten biri |
| Yaklaşımımız / Our approach | `/manifesto` | evet | ikincil | evet (Manifesto) | Ana ekranda yer tutmaz |
| İş Birliği / Collaboration | `/consulting` | evet | öne çıkan | evet (AI danışmanlığı) | Üç temel girişten biri; `/contact` CTA'da ve ikincilde |
| Ana Sayfa | `/` | marka bağlantısı | ikincil | — | |
| İletişim | `/contact` | — | ikincil | evet | |
| Projeleri Keşfet (CTA) | `/projects` | evet | alt eylem | — | Mevcut e2e sözleşmesi (son eylem) korundu |
| Şeffaflık, Vaka çalışmaları, Nasıl çalışıyoruz | `/transparency`, `/case-studies`, `/operating-system` | — | — | evet | Header sadeleşti; footer'dan erişilir |
| Stüdyo | `/studio` | — (kaldırıldı) | — | yalnız `STUDIO_ENABLED=true` | Anahtar yalnız footer'ı yönetir |
| Gizlilik, Kullanım Şartları, Destek | `/privacy`, `/terms`, `/support` | — | — | evet | |
| E-posta + X/Instagram | `mailto:support@yulalab.com`, `company.socials` | — | — | evet | Yalnız `company.ts`'teki gerçek kayıtlar; LinkedIn 404 olduğu için yok (DEFTER Y-004) |

Header'dan çıkarılanlar (Ana Sayfa metni, Manifesto adı, Şeffaflık, Stüdyo, İletişim) kaybolmadı: footer/mobil ikincil listede durur.

## Test istisnaları (beyaz liste, gerekçeli)

- `/[...rest]`: 404 yakalayıcı, hedef değil.
- `/privacy/{braavolabs,burunfarki,lifeos,motion}`: `/privacy` merkezinden listelenir.
- `/delete-account/lifeos`: mağaza veri silme URL'si; `/support` bağlar.
- `/delete-account/motion`: mağaza veri silme URL'si; **site içinde bağlayan yok** (yalnız sitemap). UNKNOWN: `/support` veya `/privacy/motion`'a bağlanması ayrı bilet.
- `/projects/[slug]`, `/case-studies/[slug]`: liste sayfası yeterli; ürünler footer'da ayrıca listelenir.

## Mağaza bağlantısı kararı

Footer'da mağaza (App Store/Google Play) bağlantısı YOK. Footer'ın hiçbir girdisi `public-registry` doğrulanmışlığına dayanmadığından mağaza rozeti eklenmedi; mağaza bağlantıları ürün sayfalarında kayıt (`public-registry.ts`) kurallarıyla gösterilmeye devam eder. Test (`never links an unverified store from the footer`) Footer/nav-config/sosyal kayıtlarında mağaza ana makinesi arar.

## Geri alma

`git revert` bu PR: `nav-config.ts` silinir, Header/Footer önceki 8 öğeli listeye döner; 14 dilde `header.{products,lab,approach,collaboration}` anahtarları artık kullanılmaz ama zararsızdır. Rotalar etkilenmez.
