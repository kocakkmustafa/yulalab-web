# Deploy — yulalab.com

The site is production-ready. The remaining steps require human auth at
external services and can each be done in a few minutes.

## 1) Vercel — GitHub integration (recommended, one-time)

1. Open https://vercel.com/new
2. Click **Import Git Repository**.
3. If GitHub isn't connected yet, click "Add GitHub Account" and authorise
   Vercel for the `kocakkmustafa/YULA-Lab` repository (private repos need
   explicit selection).
4. Pick the repo. Framework will auto-detect as **Next.js**.
   - Build command: `pnpm build` (default)
   - Install command: `pnpm install`
   - Output: handled automatically
5. Click **Deploy**. First build takes 60–90s.

> **Why Git integration over CLI:** every push to `main` redeploys
> automatically; every PR gets its own preview URL.

### Alternative — Vercel CLI

After running `pnpm vercel login` once locally:

```bash
pnpm deploy:preview   # preview URL
pnpm deploy           # production
```

## 2) Custom domain — yulalab.com

In the Vercel dashboard for the project:

1. Settings → **Domains** → Add `yulalab.com` (apex).
2. Add `www.yulalab.com` (subdomain).
3. Set the apex as primary, with `www` redirecting to apex.

Vercel will show the exact DNS records you need to add at GoDaddy. The
canonical pair is:

| Type  | Name | Value                    |
| ----- | ---- | ------------------------ |
| A     | @    | `76.76.21.21`            |
| CNAME | www  | `cname.vercel-dns.com`   |

## 3) DNS at GoDaddy

The domain is registered with GoDaddy (registrar lock active). Domain
nameservers are still GoDaddy defaults (`ns47/48.domaincontrol.com`),
which means DNS is managed inside GoDaddy.

1. https://dcc.godaddy.com → My Products → `yulalab.com` → **DNS**.
2. Remove any existing `A` record for `@` or parking placeholders.
3. Add the records from step 2 above.
4. Save and wait. Propagation is usually 5–15 minutes; Vercel will
   provision the SSL certificate automatically.

> **Check status:** `dig yulalab.com +short` should return `76.76.21.21`
> once DNS has propagated.

## 4) Email forwarding (optional, but contact links break otherwise)

The site links `merhaba@yulalab.com` and `press@yulalab.com`. To make
those addresses receive mail, set up forwarding:

### Option A — ImprovMX (free, fastest)

1. Sign up at https://improvmx.com → Add `yulalab.com`.
2. Add the two MX records ImprovMX shows at GoDaddy DNS.
3. Add aliases:
   - `merhaba@yulalab.com` → `kocakmkaan@gmail.com`
   - `press@yulalab.com`   → `kocakmkaan@gmail.com`

### Option B — Cloudflare Email Routing (free, requires Cloudflare DNS)

This requires moving DNS to Cloudflare (changing GoDaddy nameservers).
Same end result, slightly more setup. Worth it only if you want a
proper DNS dashboard with proxying / WAF.

## 5) Production env vars (optional)

Vercel auto-injects `VERCEL_URL` so SSR works without config. If you want
to pin canonical URLs:

- Vercel project → Settings → Environment Variables →
  `NEXT_PUBLIC_SITE_URL=https://yulalab.com` (Production scope).

After saving, redeploy from the Vercel dashboard.

## 6) After everything is live

- Submit the sitemap: https://search.google.com/search-console (add the
  property, submit `https://yulalab.com/sitemap.xml`).
- Optional: enable Vercel Analytics (project → Analytics → Enable).
- Optional: enable Vercel Speed Insights for Core Web Vitals.

## Smoke test checklist

After DNS is live and SSL is issued, verify:

- `curl -sI https://yulalab.com/` → `200`
- `curl -sI https://yulalab.com/en/projects/braavolabs` → `200`
- `curl -s https://yulalab.com/sitemap.xml | head -3` → starts with `<?xml`
- `curl -sI https://yulalab.com/icon.svg` → `200 image/svg+xml`
- Header logo + nav clickable; locale switcher swaps TR ↔ EN.
