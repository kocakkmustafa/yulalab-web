# Test kanıtı

## QA-ALL-03d: Geri alma provası (yerel)

Tarih: 2026-11-14. Kapsam: yalnız yerel; Netlify'a bağlanılmadı, canlıya dokunulmadı.

**Önceki sürüm (dönüş noktası):** `0cd3cea` (WEB-P0-K9, #85). Kaynak: 2026-11-13 16:40 TRT kaydı; canlı etag `W/"14u641353695t7a"` bu commit'e bağlı. Depoda sürüm etiketi yok (`git tag` boş). `release/2026-11-13` yalnız yerel dal (`5f5014d`), `0cd3cea` onun atası değil. Karşılaştırılan güncel main: `5c9a7e9` (`0cd3cea`'dan 124 commit ileride).

### Komutlar ve süreler
| Adım | Komut | Sonuç |
|---|---|---|
| Worktree | `git worktree add ../wt-web-rollback-0cd3cea 0cd3cea` | tamam |
| Bağımlılık | `node_modules` ana siteden symlink | yeterli, kurulum gerekmedi |
| Derleme (`0cd3cea`) | `/usr/bin/time -p pnpm build` | exit 0, real 16.99 s (user 38.88, sys 4.15) |
| Derleme (main `5c9a7e9`) | `/usr/bin/time -p pnpm build` | exit 0, real 16.79 s (user 38.95, sys 3.67) |
| Sunucu | `next start -p 3917`, ardından süreç durduruldu | port boşaldı |

`pnpm build` = `verify:translations && verify:claims && verify:claims:local && next build`; süre bu doğrulamaları da içerir.
Yük ortalaması (1/5/15 dk): derleme öncesi 4.21 / 1.94 / 1.91 (ilk), 4.04 / 2.08 / 1.96 (ikinci).

### Rota sonuçları (`0cd3cea`, `next start`)
| Rota | Kod |
|---|---|
| `/tr` | 307 |
| `/tr/projects` | 307 |
| `/tr/consulting` | 307 |
| `/en` | 200 |
| `/tr/transparency` | 307 |

307 yönlendirme beklenen aralıkta; hedef adresi bu provada ayrıca doğrulanmadı.

### Geri alma adımları (YALNIZ BELGE; çalıştırılmadı)
1. Netlify Deploys listesinde `0cd3cea` commit'inin deploy'unu bul, "Publish deploy" de (kurucu/yayın yetkisi gerekir). Bu, kaynağı değiştirmeden canlıyı önceki deploy'a çevirir; o sırada otomatik yayın kilitlenir.
2. Kalıcı çözüm için main'e `git revert <hatalı-commit>` (veya birleşme commit'i için `-m 1`) ile PR aç; CI yeşilse normal merge. Force push yok.
3. Otomatik yayını yeniden aç ("Start auto publishing"), canlı etag ve rotaları `web-yayin-dogrulama` ile oku.

### Bilinen sınırlar
- Canlı Netlify geri alma çalıştırılmadı; "Publish deploy" kurucu/yayın yetkisindedir.
- Yerel derleme canlı Netlify derlemesinin birebiri değildir (ortam, Node sürümü, önbellek farklı); süreler yaklaşıktır, tek ölçüm.
- Rota denetimi yalnız durum kodudur; içerik karşılaştırması yapılmadı.
