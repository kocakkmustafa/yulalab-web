import { randomBytes } from "node:crypto";
import { isLocale, localePath } from "@/i18n/locales";
import { VERIFICATION_COPY, type VerificationCopy } from "@/data/verification-copy";
import { THEME_BOOTSTRAP, THEME_COLORS, THEME_STORAGE_KEY } from "@/lib/theme";
import { themeCopy } from "@/components/theme/theme-copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Keep this capability page independent of the main layout's analytics and
// remote assets. Its per-response nonce authorizes both the script and CSS.
const STYLES = `
  :root { color-scheme: dark; --bg:#09060e; --panel:#15101d; --ink:#f7f4ff; --muted:#d1c9dc; --border:#625370; --link:#e3d9ff; --focus:#c4b5fd; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  :root[data-theme="light"] { color-scheme:light; --bg:#f5f3ee; --panel:#fffefa; --ink:#17141e; --muted:#4b4455; --border:#756a81; --link:#4f3181; --focus:#6035a0; }
  @media (prefers-color-scheme:light) { :root:not([data-theme="dark"]) { color-scheme:light; --bg:#f5f3ee; --panel:#fffefa; --ink:#17141e; --muted:#4b4455; --border:#756a81; --link:#4f3181; --focus:#6035a0; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 24px; background: var(--bg); color: var(--ink); }
  main { width: 100%; max-width: 560px; padding: clamp(24px, 5vw, 48px); border: 1px solid var(--border); border-radius: 24px; background: var(--panel); overflow-wrap: anywhere; }
  .brand { margin: 0 0 24px; color: var(--muted); font-size: .75rem; letter-spacing: .18em; }
  .appearance { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:28px; color:var(--muted); }
  select { min-height:44px; max-width:100%; padding:8px 12px; border:1px solid var(--border); border-radius:8px; font:inherit; background:var(--bg); color:var(--ink); }
  h1 { margin: 0; font-size: clamp(1.75rem, 6vw, 2.5rem); line-height: 1.15; letter-spacing: -.035em; }
  :lang(hi) h1,:lang(ar) h1 { line-height:1.4; letter-spacing:normal; }
  :lang(ko) { word-break:keep-all; overflow-wrap:anywhere; }
  :lang(zh-Hans),:lang(ja) { line-break:strict; }
  p { line-height: 1.65; color: var(--muted); }
  button { min-height: 48px; max-width: 100%; margin-top: 12px; padding: 12px 24px; border: 1px solid var(--ink); border-radius: 999px; background: var(--ink); color: var(--panel); font: inherit; font-weight: 650; cursor: pointer; }
  button:disabled { cursor: wait; opacity: .75; }
  button:focus-visible, a:focus-visible,select:focus-visible { outline: 3px solid var(--focus); outline-offset: 5px; }
  #status { margin: 0; }
  #status:not(:empty), noscript p { margin-top: 24px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; }
  a { display: inline-flex; align-items: center; min-height: 44px; margin-top: 20px; color: var(--link); text-underline-offset: 4px; }
  [hidden] { display: none !important; }
`;

function htmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// A translation stays text even if an editor later includes HTML delimiters.
function scriptText(value: string): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

function script(copy: VerificationCopy): string {
  return `(() => {
  const raw = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  history.replaceState(null, "", location.pathname + location.search);
  // Appearance is origin-local public preference only. It never reads or
  // persists the capability, makes a request, or changes verification state.
  const appearance = document.getElementById("appearance");
  const sessionNotice = document.getElementById("appearance-session");
  appearance.disabled = false;
  let systemQuery;
  try { systemQuery = matchMedia("(prefers-color-scheme: dark)"); } catch {}
  function applyAppearance(preference) {
    const root = document.documentElement;
    const resolved = preference === "system" ? (systemQuery ? (systemQuery.matches ? "dark" : "light") : "dark") : preference;
    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    root.classList.toggle("dark", resolved === "dark");
    document.querySelector('meta[name="theme-color"]').content = resolved === "dark" ? ${JSON.stringify(THEME_COLORS.dark)} : ${JSON.stringify(THEME_COLORS.light)};
    appearance.value = preference;
  }
  applyAppearance(document.documentElement.dataset.themePreference || "system");
  appearance.addEventListener("change", () => {
    const preference = appearance.value;
    if (!["light", "dark", "system"].includes(preference)) return;
    applyAppearance(preference);
    try { localStorage.setItem(${JSON.stringify(THEME_STORAGE_KEY)}, preference); sessionNotice.hidden = true; }
    catch { sessionNotice.hidden = false; }
  });
  function systemChange() {
    if (document.documentElement.dataset.themePreference === "system") applyAppearance("system");
  }
  if (systemQuery && systemQuery.addEventListener) systemQuery.addEventListener("change", systemChange);
  else if (systemQuery && systemQuery.addListener) systemQuery.addListener(systemChange);
  window.addEventListener("storage", (event) => {
    try { if (event.storageArea && event.storageArea !== localStorage) return; } catch { return; }
    if (event.key !== ${JSON.stringify(THEME_STORAGE_KEY)} && event.key !== null) return;
    applyAppearance(["light", "dark", "system"].includes(event.newValue) ? event.newValue : "system");
    sessionNotice.hidden = true;
  });
  const token = new URLSearchParams(raw).get("token") || "";
  const valid = /^[0-9a-f]{64}$/.test(token);
  const button = document.getElementById("verify");
  const status = document.getElementById("status");
  if (!valid) {
    button.hidden = true;
    status.textContent = ${scriptText(copy.failed)};
    status.setAttribute("role", "alert");
    return;
  }
  button.hidden = false;
  button.addEventListener("click", async () => {
    if (button.disabled || button.hidden) return;
    button.disabled = true;
    button.textContent = ${scriptText(copy.sending)};
    status.textContent = ${scriptText(copy.sending)};
    status.setAttribute("role", "status");
    status.setAttribute("aria-busy", "true");
    const controller = new AbortController();
    let timeout;
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error("Verification response timed out"));
        controller.abort();
      }, 15000);
    });
    try {
      // One deadline covers both headers and the body. Aborting the browser
      // request cannot prove whether the server already consumed the token.
      const result = (async () => {
        const response = await fetch("/api/data-request", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
          signal: controller.signal
        });
        if (response.status !== 200) throw new Error("Unexpected verification status");
        const body = await response.json();
        if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.verified !== "boolean") {
          throw new Error("Unexpected verification response");
        }
        return body.verified;
      })();
      const verified = await Promise.race([result, deadline]);
      status.textContent = verified ? ${scriptText(copy.verified)} : ${scriptText(copy.failed)};
      status.setAttribute("role", verified ? "status" : "alert");
      button.hidden = verified;
    } catch {
      status.textContent = ${scriptText(copy.uncertain)};
      status.setAttribute("role", "alert");
    } finally {
      clearTimeout(timeout);
      controller.abort();
      status.removeAttribute("aria-busy");
      button.disabled = false;
      button.textContent = ${scriptText(copy.retry)};
    }
  });
})();`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
): Promise<Response> {
  const { locale: requestedLocale } = await params;
  // Route handlers do not inherit the layout's locale guard. In particular,
  // dotted locale aliases skip middleware and must not render this document
  // under the general config CSP.
  if (!isLocale(requestedLocale)) {
    return new Response(null, { status: 404 });
  }
  const locale = requestedLocale;
  const copy = VERIFICATION_COPY[locale];
  const appearance = themeCopy(locale);
  const contactPath = localePath(locale, "/contact");
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
  <main>
    <p class="brand" dir="ltr">YULA LAB</p>
    <label class="appearance">${htmlText(appearance.label)}
      <select id="appearance" disabled>
        <option value="light">${htmlText(appearance.light)}</option>
        <option value="dark">${htmlText(appearance.dark)}</option>
        <option value="system" selected>${htmlText(appearance.system)}</option>
      </select>
    </label>
    <p id="appearance-session" role="status" hidden>${htmlText(appearance.sessionOnly)}</p>
    <h1>${htmlText(copy.heading)}</h1>
    <p>${htmlText(copy.intro)}</p>
    <button id="verify" type="button" hidden>${htmlText(copy.button)}</button>
    <p id="status" role="status" aria-live="polite" aria-atomic="true"></p>
    <noscript><p>${htmlText(copy.noScript)}</p></noscript>
    <a href="${contactPath}">${htmlText(copy.contact)}</a>
    <br>
    <a href="mailto:support@yulalab.com">${htmlText(copy.email)}</a>
  </main>
  <script nonce="${nonce}">${script(copy)}</script>
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
        "connect-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "object-src 'none'",
      ].join("; "),
    },
  });
}
