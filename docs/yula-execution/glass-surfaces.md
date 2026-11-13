# Cam yüzeyler ve G5 yedeği (WEB-UX-05g)

Kaynak: `src/app/globals.css`. Tasarım kuralları G1-G5 (04-design §6).

## Neden iki `.glass` tanımı var

| Tanım | Yer | Değerler | Rol |
|---|---|---|---|
| 1. `.glass` | ilk blok ("Glass surface") | koyu taban `rgba(10,10,11,.66)` + parıltı gradyanı, `blur(22px) saturate(150%)`, yarıçap 16px, gölge | Özgün cam; `::before` işaretçi parıltısı ve `:hover` kenarı da burada |
| 2. `.glass` | tasarım-yüzü katmanı ("ambient" sonrası) | `rgb(var(--yula-page-rgb) / .58)` + hafif gradyan, `blur(12px)`, yarıçap 3px | Site görünümü; aynı özgüllükte ve sonra geldiği için arka plan, blur, yarıçap, kutu gölgesinde kazanır |
| 3. `.glass { border-color }` | token katmanı | `--yula-hairline` | Kenarı temaya bağlar |

İki tanım birbirini silmez, kaskadla birleşir: sonuçta etkin olan 2. tanımın blur(12px) ve 3px yarıçapıdır; 1. tanımdan `position`, `isolation`, `border` genişliği, `::before` parıltısı ve hover kalır. İkisi de DEĞİŞTİRİLMEDİ (G4 yarıçap bütçesi: blur değerleri 10-22px, yeni değer yok).
`.glass-accent` yalnız ürün sayfasının odak yüzeyinde `.glass` ile birlikte kullanılır ve sadece `background`ı ürün vurgusuyla (`--accent`) karıştırır.

## G5 yedeği

Dosyanın sonunda, yalnız ekleme olarak:
- `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`
- `@media (prefers-reduced-transparency: reduce)`

İkisinde de `.glass` düz, opak `rgb(var(--yula-ink-850))` (tema duyarlı mevcut belirteç) olur, `backdrop-filter: none`. `.glass-accent` aynı belirteçle `--accent`i %11 karıştırır. Yeni renk yok. Destekleyen tarayıcıda ve varsayılan ayarda görünüm değişmez.

Kapsam dışı (bu yedekte değil): rota perdesi, mobil menü paneli, `.mm-overlay` (yarı saydam ama blur'suz da okunur; ayrı karar).

## Ölçüm (PERF-01)

`e2e/glass-budget.spec.ts` her temel ekranda aynı anda görünür `backdrop-filter` taşıyan öğeleri sayar; sınır testte gerekçesiyle yazılıdır.
