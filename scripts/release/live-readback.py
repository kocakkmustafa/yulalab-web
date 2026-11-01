"""Live readback for yulalab.com after a production deploy.

Fetches every route in all 14 locales from the live site and from a local `next start` of the
same merged tree, and requires identical visible text. It also checks 404s, the no-store routes
(cache, referrer, robots, CSP nonce), the contact page, registry CORS and links.yulalab.com.
Usage: python3 -I scripts/release/live-readback.py <out.json> [local-base]
"""
import concurrent.futures as cf
import hashlib, html, json, re, sys, urllib.error, urllib.request
from datetime import datetime, timezone

LIVE = "https://yulalab.com"
LOCAL = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:3020"
LOCALES = ["tr", "en", "es-419", "pt-BR", "de", "fr", "ja", "ar", "it", "ko", "id", "pl", "hi", "zh-Hans"]
SLUGS = ["braavolabs", "burunfarki", "lifeos", "gravita", "lissom", "jablab", "ostinato", "choreia"]
ROUTES = ["", "/projects"] + [f"/projects/{s}" for s in SLUGS] + [
    "/privacy", "/privacy/lifeos", "/privacy/motion", "/privacy/braavolabs", "/privacy/burunfarki",
    "/terms", "/contact", "/support", "/transparency",
]
NO_STORE = ["/motion/consent", "/data-request/verify"]
UA = {"User-Agent": "yulalab-live-readback/1.0"}


def prefix(locale):
    return "" if locale == "tr" else f"/{locale}"


def get(url, headers=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, dict(r.headers), r.read().decode("utf-8", "replace"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace"), url


def visible_text(body):
    body = re.sub(r"(?is)<(script|style|noscript|template)\b.*?</\1>", " ", body)
    body = re.sub(r"(?s)<[^>]+>", " ", body)
    return re.sub(r"\s+", " ", html.unescape(body)).strip()


checks = []


def add(name, ok, **extra):
    checks.append({"check": name, "pass": bool(ok), **extra})


# 1. Every route in 14 locales: live 200, html lang, and visible text equal to the local build.
pairs = [(loc, route) for loc in LOCALES for route in ROUTES]


def compare(pair):
    loc, route = pair
    path = prefix(loc) + route or "/"
    ls, lh, lb, _ = get(LIVE + path)
    cs, _, cb, _ = get(LOCAL + path)
    lt, ct = visible_text(lb), visible_text(cb)
    lang = re.search(r'<html[^>]*\blang="([^"]+)"', lb)
    diff = None
    if lt != ct:
        i = next((k for k, (a, b) in enumerate(zip(lt, ct)) if a != b), min(len(lt), len(ct)))
        diff = {"live": lt[max(0, i - 80): i + 120], "local": ct[max(0, i - 80): i + 120]}
    return {"loc": loc, "path": path, "status": ls, "local_status": cs, "lang": lang and lang.group(1),
            "text_sha256": hashlib.sha256(lt.encode()).hexdigest()[:16], "equal": lt == ct, "diff": diff,
            "server": lh.get("Server") or lh.get("server"), "text": lt, "raw": lb}


with cf.ThreadPoolExecutor(8) as pool:
    pages = list(pool.map(compare, pairs))
by = {(p["loc"], p["path"][len(prefix(p["loc"])):] or ""): p for p in pages}
if ("tr", "/") in by:
    by[("tr", "")] = by[("tr", "/")]
for p in pages:
    add(f"page {p['path']} 200 + lang + text == local build",
        p["status"] == 200 and p["local_status"] == 200 and p["lang"] == p["loc"] and p["equal"],
        status=p["status"], lang=p["lang"], text_sha256=p["text_sha256"], diff=p["diff"])

# 2. Shipped content: no internal paths (K9) and the current Ostinato and Braavolabs copy.
INTERNAL = re.compile(r"\b(scratch|ventures|knowledge|holding)/[\w.-]+|\b[\w-]+\.md\b")
for p in pages:
    if p["path"] in (prefix(p["loc"]) or "/", f"{prefix(p['loc'])}/projects"):
        hit = INTERNAL.search(p["text"])
        add(f"K9 no internal path {p['path']}", hit is None, hit=hit and hit.group(0))
    if "/projects/ostinato" in p["path"] or p["path"] in (prefix(p["loc"]) or "/",):
        stale = re.search(r"\b155\b", p["text"])
        add(f"Ostinato no stale 155 {p['path']}", stale is None, hit=stale and p["text"][max(0, stale.start() - 60): stale.end() + 40])
o_tr, o_en = by[("tr", "/projects/ostinato")]["text"], by[("en", "/projects/ostinato")]["text"]
add("Ostinato tr: 690 ders + mic text", "690" in o_tr and "oturum sonunda silinir" in o_tr and "kaydedilmez" not in o_tr)
add("Ostinato en: 690 lessons + mic text", "690" in o_en and "deleted when the session ends" in o_en and "not recorded" not in o_en.lower())
for title in ["Metronom, akan tab ve döngü.", "Kurulum sihirbazı.", "Akort listesi.", "Seri ve haftalık hedef.", "MIDI, referans ses ve daha fazlası."]:
    add(f"Ostinato tr card: {title}", title in o_tr)
b_en = by[("en", "/projects/braavolabs")]["text"]
add("Braavolabs en: multi-model chat + coding agent roadmap", "Multi-model chat." in b_en and "A coding agent." in b_en)

# 3. 404s and root.
s, h, _, final = get(LIVE + "/")
add("site root 200", s == 200, status=s, final=final, server=h.get("Server") or h.get("server"))
for path in ["/xx", "/xx-YY/projects", "/tr/this-page-does-not-exist", "/en/nope-404-check"]:
    s, *_ = get(LIVE + path)
    add(f"site 404 {path}", s == 404, status=s)

# 4. no-store routes: headers + nonce.
nonces = []
for route in NO_STORE:
    for loc in ["tr", "en", "ar"]:
        s, h, b, _ = get(LIVE + prefix(loc) + route)
        h = {k.lower(): v for k, v in h.items()}
        csp = h.get("content-security-policy", "")
        n = re.search(r"'nonce-([^']+)'", csp)
        nonces.append(n and n.group(1))
        add(f"{route} GET {loc}", s == 200 and h.get("cache-control") == "private,no-store,max-age=0"
            and h.get("referrer-policy") == "no-referrer" and "noindex" in h.get("x-robots-tag", "")
            and n is not None and f'nonce="{n.group(1)}"' in b,
            status=s, cache_control=h.get("cache-control"), x_robots=h.get("x-robots-tag"))
add("nonces unique per response", len(set(nonces)) == len(nonces) and None not in nonces)

# 5. Contact: mailto, no form.
for loc in LOCALES:
    b = by[(loc, "/contact")]["raw"]
    add(f"contact {loc} mailto + no form", "mailto:" in b and "<form" not in b)

# 6. Registry CORS and the separate links site.
s, h, b, _ = get(LIVE + "/portfolio-registry.json", {"Origin": "https://links.yulalab.com"})
h = {k.lower(): v for k, v in h.items()}
try:
    json.loads(b); is_json = True
except ValueError:
    is_json = False
add("registry CORS links origin", s == 200 and h.get("access-control-allow-origin") == "https://links.yulalab.com" and is_json,
    status=s, acao=h.get("access-control-allow-origin"))
for path in ["/", "/robots.txt", "/sitemap.xml"]:
    s, *_ = get("https://links.yulalab.com" + path)
    add(f"links {path} 200", s == 200, status=s)

fails = [c for c in checks if not c["pass"]]
out = {"read_at_utc": datetime.now(timezone.utc).isoformat(), "base": LIVE, "local": LOCAL,
       "verdict": "PASS" if not fails else "FAIL", "total": len(checks), "fails": fails, "checks": checks}
json.dump(out, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
print(out["verdict"], len(checks), "checks;", len(fails), "fails")
for f in fails[:25]:
    print(" FAIL", f["check"], {k: v for k, v in f.items() if k not in ("check", "pass")})
