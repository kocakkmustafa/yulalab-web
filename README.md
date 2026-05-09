# YULA Lab — Umbrella Site

Pure marketing / showcase site for YULA Lab and its ventures (Braavolabs, Burun Farkı, LifeOS …).

This site is **not interactive** — visitors learn, get inspired, and follow links to the live products. Each project has its own brand-themed showcase page; the umbrella stays minimal and premium.

## Stack

- Next.js 15 · React 19 · TypeScript 5.7
- TailwindCSS 3 · Framer Motion · Lucide
- App Router with dynamic project routes
- Per-project theme tokens (CSS variables overridden per page)

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm build
```

## Adding a new project

1. Create `src/data/projects/<slug>.ts` and export a `ProjectConfig` (see `src/lib/types.ts`).
2. Register it in `src/data/projects/index.ts`.
3. Drop visual assets into `public/projects/<slug>/`.

The route `/projects/<slug>` is generated automatically.

## Structure

```
src/
├── app/                    # Routes
│   ├── page.tsx            # Landing
│   ├── manifesto/          # Vision / mission
│   ├── projects/           # Projects index + dynamic [slug]
│   └── contact/
├── components/
│   ├── layout/             # Header, Footer
│   ├── landing/            # Sections used on the home page
│   └── projects/           # Reusable showcase blocks
├── data/
│   ├── company.ts          # YULA Lab identity (vision, mission, socials)
│   └── projects/           # One file per project
└── lib/
    ├── types.ts            # ProjectConfig schema
    └── utils.ts            # cn() and helpers
```
