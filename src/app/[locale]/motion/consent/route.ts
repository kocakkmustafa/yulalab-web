import { randomBytes } from "node:crypto";
import { isLocale, SUPPORTED_LOCALES } from "@/i18n/locales";
import { MOTION_CONSENT_COPY } from "@/data/motion-consent-copy";
import { motionConsentEndpoint } from "@/data/motion-consent-config";
import { THEME_BOOTSTRAP, THEME_COLORS } from "@/lib/theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Capability page for Motion parent/guardian approval. Like the data-request
// verification page it is independent of the main layout: one per-response
// nonce authorizes its script and CSS, and the only allowed connection is the
// configured Motion Core function. The link token lives in the URL fragment,
// is removed from the address bar before any request, and is only ever sent
// in a POST body to that function.
const STYLES = `
  :root { color-scheme: dark; --bg:#09060e; --panel:#15101d; --ink:#f7f4ff; --muted:#d1c9dc; --border:#625370; --link:#e3d9ff; --focus:#c4b5fd; --danger:#ffb4a8; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  :root[data-theme="light"] { color-scheme:light; --bg:#f5f3ee; --panel:#fffefa; --ink:#17141e; --muted:#4b4455; --border:#756a81; --link:#4f3181; --focus:#6035a0; --danger:#9d1c0c; }
  @media (prefers-color-scheme:light) { :root:not([data-theme="dark"]) { color-scheme:light; --bg:#f5f3ee; --panel:#fffefa; --ink:#17141e; --muted:#4b4455; --border:#756a81; --link:#4f3181; --focus:#6035a0; --danger:#9d1c0c; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 24px; background: var(--bg); color: var(--ink); }
  main { width: 100%; max-width: 560px; padding: clamp(24px, 5vw, 48px); border: 1px solid var(--border); border-radius: 24px; background: var(--panel); overflow-wrap: anywhere; }
  .brand { margin: 0 0 24px; color: var(--muted); font-size: .75rem; letter-spacing: .18em; }
  h1 { margin: 0; font-size: clamp(1.75rem, 6vw, 2.5rem); line-height: 1.15; letter-spacing: -.035em; }
  :lang(hi) h1,:lang(ar) h1 { line-height:1.4; letter-spacing:normal; }
  :lang(ko) { word-break:keep-all; overflow-wrap:anywhere; }
  :lang(zh-Hans),:lang(ja) { line-break:strict; }
  p { line-height: 1.65; color: var(--muted); }
  .request p { margin: 8px 0; color: var(--ink); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
  button { min-height: 48px; max-width: 100%; padding: 12px 24px; border: 1px solid var(--ink); border-radius: 999px; background: var(--ink); color: var(--panel); font: inherit; font-weight: 650; cursor: pointer; }
  button.secondary { background: transparent; color: var(--ink); }
  button.danger { border-color: var(--danger); background: transparent; color: var(--danger); }
  button:disabled { cursor: wait; opacity: .75; }
  button:focus-visible, a:focus-visible { outline: 3px solid var(--focus); outline-offset: 5px; }
  #warning { color: var(--danger); }
  #status { margin: 0; }
  #status:not(:empty), noscript p { margin-top: 24px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; }
  a { display: inline-flex; align-items: center; min-height: 44px; margin-top: 20px; color: var(--link); text-underline-offset: 4px; }
  [hidden] { display: none !important; }
`;

function htmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Translations and configuration stay data even if they contain HTML delimiters.
function scriptData(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

function script(locale: string, endpoint: string | null): string {
  return `(() => {
  const COPY = ${scriptData(MOTION_CONSENT_COPY)};
  const LOCALES = ${scriptData(SUPPORTED_LOCALES)};
  const ALIASES = { es: "es-419", pt: "pt-BR", zh: "zh-Hans" };
  const ENDPOINT = ${scriptData(endpoint)};
  const raw = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  history.replaceState(null, "", location.pathname + location.search);
  const token = new URLSearchParams(raw).get("token") || "";
  const el = (id) => document.getElementById(id);
  const status = el("status"), request = el("request"), actions = el("actions"), confirm = el("confirm");
  const approve = el("approve"), deny = el("deny"), denyConfirm = el("deny-confirm"), cancel = el("cancel"), retry = el("retry");
  let locale = ${scriptData(locale)};
  let copy = COPY[locale];
  let summary = null;
  function resolveLocale(value) {
    if (typeof value !== "string") return null;
    const exact = LOCALES.find((item) => item.toLowerCase() === value.toLowerCase());
    if (exact) return exact;
    const base = ALIASES[value.toLowerCase().split("-")[0]] || value.toLowerCase().split("-")[0];
    return LOCALES.includes(base) ? base : null;
  }
  function fill(template, key, value) { return template.split("{" + key + "}").join(value); }
  function formatDate(value) {
    try { return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(value)); }
    catch { return String(value).slice(0, 10); }
  }
  function paint() {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.title = copy.title;
    el("heading").textContent = copy.heading;
    el("intro").textContent = copy.intro;
    approve.textContent = copy.approve;
    deny.textContent = copy.deny;
    denyConfirm.textContent = copy.denyConfirm;
    cancel.textContent = copy.cancel;
    retry.textContent = copy.retry;
    el("warning").textContent = copy.denyWarning;
    el("email").textContent = copy.email;
    if (summary) {
      el("teen").textContent = fill(copy.pending, "email", summary.teenEmail);
      el("expiry").textContent = fill(copy.expires, "date", formatDate(summary.expiresAt));
    }
  }
  function show(message, alert) {
    status.textContent = message;
    status.setAttribute("role", alert ? "alert" : "status");
  }
  function settle(message, alert) {
    actions.hidden = true;
    confirm.hidden = true;
    retry.hidden = true;
    show(message, alert);
  }
  async function call(body) {
    const controller = new AbortController();
    let timeout;
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => { reject(new Error("timeout")); controller.abort(); }, 15000);
    });
    try {
      // text/plain keeps this a CORS simple request (no preflight); the
      // function parses the JSON body regardless of the declared type.
      const result = (async () => {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "text/plain;charset=UTF-8" },
          body: JSON.stringify(body),
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: controller.signal
        });
        let data = null;
        try { data = await response.json(); } catch {}
        return { code: response.status, data: data && typeof data === "object" && !Array.isArray(data) ? data : {} };
      })();
      return await Promise.race([result, deadline]);
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }
  function busy(on) {
    for (const button of [approve, deny, denyConfirm, cancel, retry]) button.disabled = on;
    status.setAttribute("aria-busy", on ? "true" : "false");
  }
  async function view() {
    retry.hidden = true;
    busy(true);
    show(copy.loading, false);
    let result;
    try { result = await call({ action: "view", token }); }
    catch { busy(false); retry.hidden = false; show(copy.serverError, true); return; }
    busy(false);
    if (result.code === 200 && result.data.status === "pending" && typeof result.data.teenEmail === "string" && typeof result.data.expiresAt === "string") {
      summary = { teenEmail: result.data.teenEmail, expiresAt: result.data.expiresAt };
      const preferred = resolveLocale(result.data.locale);
      if (preferred) { locale = preferred; copy = COPY[locale]; }
      paint();
      request.hidden = false;
      actions.hidden = false;
      show("", false);
      return;
    }
    if (result.code === 404) return settle(copy.invalid, true);
    if (result.code === 410) return settle(copy.expired, true);
    retry.hidden = false;
    show(copy.serverError, true);
  }
  async function decide(decision) {
    busy(true);
    show(copy.working, false);
    let result;
    try { result = await call({ action: "decide", token, decision }); }
    catch { busy(false); return settle(copy.uncertain, true); }
    busy(false);
    if (result.code === 200 && result.data.status === "approved" && decision === "approve") return settle(copy.approved, false);
    if (result.code === 200 && result.data.status === "denied" && decision === "deny") return settle(copy.denied, false);
    if (result.code === 404) return settle(copy.invalid, true);
    if (result.code === 410) return settle(copy.expired, true);
    show(copy.serverError, true);
  }
  approve.addEventListener("click", () => decide("approve"));
  deny.addEventListener("click", () => { actions.hidden = true; confirm.hidden = false; denyConfirm.focus(); });
  cancel.addEventListener("click", () => { confirm.hidden = true; actions.hidden = false; deny.focus(); });
  denyConfirm.addEventListener("click", () => decide("deny"));
  retry.addEventListener("click", () => view());
  paint();
  if (!ENDPOINT) return settle(copy.unavailable, true);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return settle(copy.invalid, true);
  view();
})();`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
): Promise<Response> {
  const { locale: requestedLocale } = await params;
  // Route handlers do not inherit the layout's locale guard; dotted aliases
  // must not render this document under the general config CSP.
  if (!isLocale(requestedLocale)) {
    return new Response(null, { status: 404 });
  }
  const locale = requestedLocale;
  const copy = MOTION_CONSENT_COPY[locale];
  const endpoint = motionConsentEndpoint();
  const nonce = randomBytes(18).toString("base64");
  const body = `<!doctype html>
<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>${htmlText(copy.title)}</title>
  <meta name="theme-color" content="${THEME_COLORS.dark}">
  <script nonce="${nonce}">${THEME_BOOTSTRAP}</script>
  <style nonce="${nonce}">${STYLES}</style>
</head>
<body>
  <main data-motion-consent>
    <p class="brand" dir="ltr">YULA LAB · MOTION</p>
    <h1 id="heading">${htmlText(copy.heading)}</h1>
    <p id="intro">${htmlText(copy.intro)}</p>
    <div id="request" class="request" hidden>
      <p id="teen"></p>
      <p id="expiry"></p>
    </div>
    <div id="actions" class="actions" hidden>
      <button id="approve" type="button">${htmlText(copy.approve)}</button>
      <button id="deny" type="button" class="danger">${htmlText(copy.deny)}</button>
    </div>
    <div id="confirm" hidden>
      <p id="warning">${htmlText(copy.denyWarning)}</p>
      <div class="actions">
        <button id="deny-confirm" type="button" class="danger">${htmlText(copy.denyConfirm)}</button>
        <button id="cancel" type="button" class="secondary">${htmlText(copy.cancel)}</button>
      </div>
    </div>
    <p id="status" role="status" aria-live="polite" aria-atomic="true"></p>
    <button id="retry" type="button" class="secondary" hidden>${htmlText(copy.retry)}</button>
    <noscript><p>${htmlText(copy.noScript)}</p></noscript>
    <a id="email" href="mailto:support@yulalab.com">${htmlText(copy.email)}</a>
  </main>
  <script nonce="${nonce}">${script(locale, endpoint)}</script>
</body>
</html>`;

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
      expires: "0",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow, noarchive",
      "x-content-type-options": "nosniff",
      "cross-origin-resource-policy": "same-origin",
      "content-security-policy": [
        "default-src 'none'",
        `script-src 'nonce-${nonce}'`,
        `style-src 'nonce-${nonce}'`,
        `connect-src ${endpoint ?? "'none'"}`,
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "object-src 'none'",
      ].join("; "),
    },
  });
}
