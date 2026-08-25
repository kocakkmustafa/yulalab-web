import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COPY = {
  tr: {
    title: "Veri talebini doğrula · YULA Lab",
    heading: "Veri talebini doğrula",
    intro: "Bu işlem, talebin e-posta adresinin size ait olduğunu doğrular.",
    button: "Talebi doğrula",
    sending: "Doğrulanıyor…",
    verified: "E-posta adresi doğrulandı. Talebiniz işleme alınabilir.",
    failed: "Bu talep doğrulanamadı. Bağlantı geçersiz, süresi dolmuş veya daha önce kullanılmış olabilir.",
  },
  en: {
    title: "Verify data request · YULA Lab",
    heading: "Verify your data request",
    intro: "This action confirms that the request email address belongs to you.",
    button: "Verify request",
    sending: "Verifying…",
    verified: "The email address was verified. Your request can now be processed.",
    failed: "This request could not be verified. The link may be invalid, expired, or already used.",
  },
} as const;

function script(copy: (typeof COPY)[keyof typeof COPY]): string {
  return `(() => {
  const raw = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  history.replaceState(null, "", location.pathname + location.search);
  const token = new URLSearchParams(raw).get("token") || "";
  const valid = /^[0-9a-f]{64}$/.test(token);
  const button = document.getElementById("verify");
  const status = document.getElementById("status");
  if (!valid) {
    button.hidden = true;
    status.textContent = ${JSON.stringify(copy.failed)};
    status.setAttribute("role", "alert");
    return;
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = ${JSON.stringify(copy.sending)};
    try {
      const response = await fetch("/api/data-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });
      const body = await response.json();
      const verified = response.ok && body && body.verified === true;
      status.textContent = verified ? ${JSON.stringify(copy.verified)} : ${JSON.stringify(copy.failed)};
      status.setAttribute("role", verified ? "status" : "alert");
    } catch {
      status.textContent = ${JSON.stringify(copy.failed)};
      status.setAttribute("role", "alert");
    } finally {
      button.hidden = true;
    }
  }, { once: true });
})();`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
): Promise<Response> {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "en" ? "en" : "tr";
  const copy = COPY[locale];
  const nonce = randomBytes(18).toString("base64");
  const body = `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>${copy.title}</title>
</head>
<body>
  <main>
    <h1>${copy.heading}</h1>
    <p>${copy.intro}</p>
    <button id="verify" type="button">${copy.button}</button>
    <p id="status" aria-live="polite"></p>
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
        "connect-src 'self'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "object-src 'none'",
      ].join("; "),
    },
  });
}
