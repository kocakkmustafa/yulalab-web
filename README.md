<div align="center">

# YULA Lab — Umbrella Site

**[yulalab.com](https://yulalab.com)** · The public marketing and showcase site for YULA Lab — a venture studio designing AI-native, data-driven products that simplify everyday life.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey)](./LICENSE)

</div>

---

## What this is

A **non-interactive marketing site**. Visitors learn, get inspired, and follow links to the live products. Each venture has its own brand-themed showcase route; the umbrella stays minimal and premium.

The site is fully **server-rendered, statically generated** for every project route, and **internationalized** (TR / EN) via `next-intl` with `as-needed` locale prefixes (Turkish at the root, English at `/en`).

## The ventures we showcase

| Slug          | Project                    | Status   | Highlight                                            |
| ------------- | -------------------------- | -------- | ---------------------------------------------------- |
| `braavolabs`  | Autonomous AI Company OS   | Beta     | 9 primitives, 12 LLM providers, transparent cost     |
| `burunfarki`  | Transparent racing AI      | Live     | 13,587 races, %40.8 Top‑1, SHAP explainability       |
| `lifeos`     | Personal life OS (mobile)  | Soon     | Offline‑first, AES‑256 on‑device, 5 life domains     |

Each project is configured in [`src/data/projects/<slug>.ts`](./src/data/projects/) and rendered through the shared [`<ProjectShowcase>`](./src/components/projects/ProjectShowcase.tsx) component, which adapts colors, gradients and typography from per-project brand tokens.

## Tech stack

| Layer        | Choice                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| Framework    | **Next.js 15** App Router · React 19 · TypeScript 5.7                     |
| Styling      | TailwindCSS 3 · `@tailwindcss/typography` · per-project CSS variables     |
| Motion       | Framer Motion · CSS-only reveal hook for accessibility                    |
| Icons        | Lucide                                                                    |
| i18n         | `next-intl` 4 — TR (default) and EN                                       |
| SEO          | Dynamic [`sitemap.ts`](./src/app/sitemap.ts) + [`robots.ts`](./src/app/robots.ts) + OpenGraph + Twitter |
| Hosting      | Vercel (preview + production)                                             |
| Package mgr  | pnpm 9                                                                    |

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm build
```

Optional environment variables:

```bash
# .env.local — only needed if you want to override the canonical origin
NEXT_PUBLIC_SITE_URL=https://yulalab.com
```

> On Vercel, `VERCEL_URL` is injected automatically; the metadata and
> sitemap fall back to it when `NEXT_PUBLIC_SITE_URL` is not set.

## Adding a new venture

1. Create `src/data/projects/<slug>.ts` and export a `ProjectConfig` (typed via [`src/lib/types.ts`](./src/lib/types.ts)).
2. Register it in [`src/data/projects/index.ts`](./src/data/projects/index.ts).
3. Drop visual assets into `public/projects/<slug>/`.

The route `/projects/<slug>` (and its `/en/projects/<slug>` mirror) is generated automatically, and the dynamic sitemap picks it up on the next build.

## Project structure

```
src/
├── app/[locale]/                # All routes are locale-scoped
│   ├── page.tsx                 # Landing
│   ├── manifesto/page.tsx       # Vision · mission · values
│   ├── projects/page.tsx        # Index
│   ├── projects/[slug]/page.tsx # Showcase (generateStaticParams)
│   ├── contact/page.tsx
│   ├── not-found.tsx
│   └── layout.tsx               # Fonts, metadata, IntlProvider
├── app/sitemap.ts               # Dynamic sitemap.xml
├── app/robots.ts                # Dynamic robots.txt
├── components/
│   ├── layout/                  # Header, Footer, LocaleSwitcher
│   ├── landing/                 # Sections used on the home page
│   ├── projects/                # Reusable showcase blocks
│   ├── manifesto/, contact/     # Page-specific bits
│   └── common/                  # Atoms (icons, monogram, marks, banner)
├── data/
│   ├── company.ts               # YULA Lab identity (vision, mission, socials)
│   └── projects/                # One file per venture
├── i18n/                        # next-intl routing, navigation, request config
├── lib/                         # types.ts, utils.ts
└── middleware.ts                # next-intl locale routing
messages/
├── tr.json                      # Turkish copy
└── en.json                      # English copy
public/
├── brand/                       # YULA Lab logo / banner
├── projects/<slug>/             # Per-project brand assets
├── icon.svg, apple-icon.svg
└── manifest.webmanifest
```

## Accessibility & performance budgets

- Server-render everything that does not need client interactivity.
- All interactive elements have a `focusable` outline and keyboard-reachable
  behavior; `aria-label`s on icon-only buttons.
- Critical fonts use `display: swap` and `optimizePackageImports` is set for
  Lucide and Framer Motion to keep client bundles tight.
- Honors `prefers-reduced-motion` via the CSS-only reveal hook in
  [`src/components/common/useReveal.ts`](./src/components/common/useReveal.ts).

## Deployment

Pushed to `main` → automatic Vercel production deploy. PR branches get a
preview URL per push. The full ops checklist (DNS, email forwarding,
Search Console submission) lives in [`DEPLOY.md`](./DEPLOY.md).

## License

Proprietary. See [`LICENSE`](./LICENSE) for permitted use and trademark notice.

## Contact

- **General:** [merhaba@yulalab.com](mailto:merhaba@yulalab.com)
- **Press:** [press@yulalab.com](mailto:press@yulalab.com)
- **Founder:** [Mustafa Kaan Koçak](https://www.linkedin.com/in/mkkocak)
