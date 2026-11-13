# WEB-P0-03b: Sahne 1 ölçüm notu

Tarih: 2026-11-08. Yerel Lighthouse, `next start` üretim derlemesi, `/tr`, 3 koşu medyanı, tek-seri.

| | Taban (03a ucu) | Sahne 1 sonrası |
|---|---|---|
| Mobil performans | 57 | 54 |
| Mobil LCP | 5179 ms | 5285 ms |
| Masaüstü performans | 92 | 91 |
| Masaüstü LCP | 1118 ms | 1079 ms |
| CLS / erişilebilirlik | 0 / 100 | 0 / 100 |

Ham JSON'lar (repo dışı): `scratch/2026-11-08-web-p0-03b/lh-base/` (taban) ve `scratch/2026-11-08-web-p0-03b/lh/` (sonrası).

## Sınırlar

- Ölçüm sırasında makine yük ortalaması yaklaşık 180 idi. Taban ve sonrası aynı yük altında ama ayrı zamanlarda ölçüldü.
- 03a ölçümüyle (mobil A 74, B 82; LCP ~4,9 sn) KIYASLANAMAZ: o ölçüm sakin makinede ve farklı koşulda alındı. Bu tablo yalnız kendi içinde okunur.
- Mobil sonrası değerler tabandan biraz düşük (perf 57 → 54, LCP +106 ms). "Gürültü sınırında" bir yorumdur, kanıt değildir.
- TBT, JS KB ve ayrı A (3D) / B (reduced-motion) koşuları toplanmadı: UNKNOWN.

## Öneri

Merge öncesi sakin bir makinede aynı betikle taban ve sonrasını art arda yeniden ölç; A ve B ayrı koşulsun, TBT ve JS KB toplansın.
