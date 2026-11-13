# drafts/

Yayınlanmayan taslaklar. Bu dizin yalnız repo kökündedir; `src/` ya da `public/` altında değildir ve hiçbir yerden import edilmez, bu yüzden siteye girmez.

## Sürüm notu taslağı

```bash
pnpm notes:draft --since 2026-11-01              # gh gerekir
pnpm notes:draft --input prs.json --out /tmp/x.md  # çevrimdışı; dizi: {number,title,mergedAt,url}
```

Çıktı `drafts/release-notes/<tarih>.md`. Birleşen PR başlıklarını conventional-commit önekine göre ayırır: `feat`/`fix`/`perf` aday, `ci`/`chore`/`test`/`docs`/`refactor`/`build`/`style` iç değişiklik.

## Onay akışı

1. Taslak `status: draft`, `approval: kurucu-onayi-bekliyor` ile çıkar. Araç metin yazmaz ve çevirmez; tr/en alanları `TODO(kurucu)` ile boştur.
2. Kurucu hangi adayların yayınlanacağını ve metni onaylar.
3. Onaydan sonra giriş `src/data/notes.ts`'e elle kopyalanır; İngilizce metin için 12 dilde `messages/content-<dil>.json` anahtarı eklenir (`pnpm verify:translations`).

Araç `src/data/notes.ts`'e ya da `messages/*`'e hiçbir koşulda yazmaz.
