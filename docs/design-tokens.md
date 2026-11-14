# Ortak token eşleme tablosu — yulalab.com

Kaynak sözleşme: vault `40 Referanslar/📑 CORE-P1-01 — Ortak tasarım tokenları (2026-11-08)` §2(a) (ortak 8) ve §3 (ortak kural adları). Bilet: CORE-WEB-01.
Bu belge yalnız eşlemedir; hiçbir renk veya değer burada tanımlanmaz, `src/app/globals.css` ve `tailwind.config.ts` kaynak kalır. Sitede karşılığı olmayan satırlar açıkça "karşılığı yok" yazılır.

## 1. Ortak 8 token → sitedeki sembol

| # | Ortak kural adı | Sitedeki karşılığı | Not |
|---|---|---|---|
| 1 | `space.1..8` | karşılığı yok (adlandırılmış ölçek yok) | Tailwind varsayılan 4 px adımı kullanılır; `tailwind.config.ts` `spacing`'i geçersiz kılmaz. |
| 2 | `radius.sm/md/lg/xl/pill` | karşılığı yok (adlandırılmış ölçek yok) | Tailwind varsayılan `borderRadius`; yerel yarıçap sembolü tanımlı değil. |
| 3 | `motion.ease.soft` | `--ease-soft` (`globals.css` `:root`) · `ease-soft` (`tailwind.config.ts` `transitionTimingFunction.soft`) | Değer `cubic-bezier(0.16, 1, 0.3, 1)`; iki yerde aynı. |
| 4 | `motion.fast/base/slow` | karşılığı yok (süre sembolü yok) | Süreler `globals.css` içinde literal ms (örn. 250/300/350/700/900 ms). |
| 5 | `motion.reduced` | `@media (prefers-reduced-motion: reduce)` blokları (`globals.css`) | Animasyonlar `none`, geçişler düz bitiş durumuna iner. |
| 6 | `a11y.contrast.text` (4.5:1) · `a11y.contrast.ui` (3:1) | `MIN_RATIO` · `MIN_NON_TEXT_RATIO` (`scripts/contrast-audit.ts`); `tests/theme.test.tsx` "ortak kural adlarıyla kontrast eşikleri" bloğu | Eşikler sözleşmeyle aynı. |
| 7 | `color.role.*` | bkz. §2 | `danger` var, `info` yok. |
| 8 | açık/koyu çift palet | `:root` (koyu) · `:root[data-theme="light"]` · `@media (prefers-color-scheme: light) { :root:not([data-theme]) }` (`globals.css`) | Açık blok ile medya yedeği birebir aynıdır (`tests/brand-tokens.test.ts`). |

## 2. `color.role.*` ayrıntısı (7. satır)

| Ortak rol | Sitedeki karşılığı |
|---|---|
| `color.role.success` | `--yula-success`, `--yula-success-strong` (Tailwind `emerald-300/400`) |
| `color.role.warning` | `--yula-warning`, `--yula-warning-strong` (Tailwind `amber-300/400`) |
| `color.role.danger` | `--yula-danger` |
| `color.role.info` | karşılığı yok |
| `color.role.focus` | `--yula-focus` |
| `color.role.on-primary` | karşılığı yok (sitede birincil dolgu rolü yok) |
| `color.role.surface` | `--yula-surface`, `--yula-surface-raised`, `--yula-surface-inset` (Tailwind `surface`, `surface-raised`, `surface-inset`); zemin: `--yula-ink-900/850/800` |
| `color.role.text-muted` | `--yula-ink-400` (Tailwind `ink-400`) |

## 3. Kapsam dışı

Marka-özel renkler (vitrin ürün renkleri, zemin tonları, logolar) ortaklaştırılmaz; bu belge onları eşlemez.
