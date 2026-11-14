# Test kanıtı

## QA-ALL-03d: Geri alma provası (yerel)

Tarih: 2026-11-14. Kapsam: yalnız yerel; Netlify'a bağlanılmadı, canlıya dokunulmadı.

**Önceki sürüm (dönüş noktası):** `0cd3cea` (WEB-P0-K9, #85). Kaynak: `scratch/2026-11-13-yulalab-yayin/DONUS-NOKTASI.txt` (kaydeden Yulalab.com, 2026-11-13 16:40 TRT): canlı etag `W/"14u641353695t7a"` = main `0cd3cea`. Bu deploy'un Netlify listesinde durduğu doğrulanmadı. Depoda sürüm etiketi yok (`git tag` boş). `release/2026-11-13` yalnız yerel dal (`5f5014d`), `0cd3cea` onun atası değil. Karşılaştırılan güncel main: `5c9a7e9` (`0cd3cea`'dan 124 commit ileride).

### Komutlar ve süreler
| Adım | Komut | Sonuç |
|---|---|---|
| Worktree | `git worktree add ../wt-web-rollback-0cd3cea 0cd3cea` (ve main için ayrı taze worktree) | tamam |
| Bağımlılık | `node_modules` ana siteden symlink | yeterli |
| Soğuk derleme (`0cd3cea`) | `/usr/bin/time -p pnpm build` | `.next` başta YOK; exit 0, real 16.29 s (user 38.70, sys 3.83) |
| Soğuk derleme (main `5c9a7e9`) | aynı komut, taze worktree | `.next` başta YOK; exit 0, real 16.94 s (user 39.08, sys 3.83) |
| Sunucu | `next start -p 3918`, sonra durduruldu | port boşaldı |

İlk ölçümler (16.99 / 16.79 s) `.next` durumu kayda geçmediği için kanıt sayılmaz; yukarıdaki soğuk ölçümler geçerlidir ve birbirine yakındır.
`pnpm build` = `verify:translations && verify:claims && verify:claims:local && next build`; süre bu doğrulamaları da içerir.
Yük ortalaması (1/5/15 dk): soğuk ölçüm öncesi 2.06 / 1.99 / 1.94, sonrası 4.19 / 2.46 / 2.11.

### Bağımlılık farkı
`git diff --stat 0cd3cea origin/main -- pnpm-lock.yaml package.json` çıktısı boş: iki commit arasında lockfile ve `package.json` farkı yok. Ana sitenin `node_modules` klasörü (güncel main ile kurulu) bu yüzden eski commit için de eşdeğerdir; "eski commit güncel bağımlılıklarla derlendi" riski bu ölçüde kapalıdır. Ayrı `pnpm install --frozen-lockfile` yapılmadı.

### Rota sonuçları (`0cd3cea`, `next start`)
| Rota | Kod | Location |
|---|---|---|
| `/tr` | 307 | `/` |
| `/tr/projects` | 307 | `/projects` |
| `/tr/consulting` | 307 | `/consulting` |
| `/en` | 200 | - |
| `/tr/transparency` | 307 | `/transparency` |

Yönlendirme hedefleri `curl -sI` ile okundu (varsayılan dil öneksiz yola gider); hedef sayfaların içeriği ve son durum kodu ayrıca denetlenmedi.

### Geri alma adımları (YALNIZ BELGE; çalıştırılmadı)
1. Netlify Deploys listesinde `0cd3cea` commit'inin deploy'unu bul, "Publish deploy" de (kurucu/yayın yetkisi gerekir). Bu, kaynağı değiştirmeden canlıyı önceki deploy'a çevirir; o sırada otomatik yayın kilitlenir.
2. Kalıcı çözüm için main'e `git revert <hatalı-commit>` ile PR aç; main'de birleşme (merge) commit'i varsa `git revert -m 1 <merge-commit>` kullanılır; CI yeşilse normal merge. Force push yok.
3. Otomatik yayını yeniden aç ("Start auto publishing"), canlı etag ve rotaları vault skill'i `web-yayin-dogrulama` (yulalab-os) ile oku.

### Bilinen sınırlar
- Canlı Netlify geri alma çalıştırılmadı; "Publish deploy" kurucu/yayın yetkisindedir.
- Yerel derleme canlı Netlify derlemesinin birebiri değildir (ortam, Node sürümü, önbellek farklı); süreler yaklaşıktır, her commit için tek soğuk ölçüm.
- Rota denetimi yalnız durum kodudur; içerik karşılaştırması yapılmadı.
