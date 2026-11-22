/**
 * W7 BT12: ana sahnedeki parlak ikon kapağını (makeBrightIconPresentation) bir kez üretip statik görsele çevirir.
 *
 * Neden: 768² piksel hattı (maske, taşma doldurma, morf, bulanıklık) tarayıcıda 280–430 ms ana iş parçacığı görevi
 * olarak çalışıyordu. Çıktı yalnız ürün rengine ve `icon.png`ye bağlı olduğundan derleme öncesi hazırlanır, çalışma
 * zamanı maliyeti 0 olur. Girdi, canlı hattın kullandığı `/_next/image?w=640&q=75` yanıtıdır; görünüm aynıdır.
 *
 * Kullanım (önce `next start` ile çalışan bir derleme gerekir; `cwebp` kurulu olmalı):
 *   npx tsx scripts/render-icon-covers.mts http://localhost:3000
 * `cwebp` (libwebp) is not an npm dependency: macOS `brew install webp`, Debian/Ubuntu `apt install webp`.
 * Çıktı: public/projects/<slug>/icon-cover-768.webp (kayıpsız). Her dosya, çalışma zamanı canvas'ı ile WebGL
 * yüklemesinde kanal başına en çok 1 farkla eşleşmiyorsa betik hata verir.
 * icon.png, ürün rengi ya da icon-presentation.ts değişirse yeniden üret (çalışma zamanı hattı yedek olarak kalır).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";
import { projects } from "../src/data/projects";
import { SCENE_PRODUCT_ORDER } from "../src/lib/product-index";
import { presentationImageUrl } from "../src/components/experience/useShowcaseTextures";

type Win = {
  renderIconCover: (input: { slug: string; primary: string; iconUrl: string }) => Promise<string>;
  verifyIconCover: (webpBase64: string) => Promise<{ worst: number; bad: number }>;
};

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const root = path.resolve(import.meta.dirname, "..");
const work = mkdtempSync(path.join(tmpdir(), "icon-covers-"));
const bundle = path.join(work, "entry.js");
execFileSync("npx", ["esbuild", path.join(root, "scripts/lib/icon-cover-entry.ts"), "--bundle", "--format=iife", `--outfile=${bundle}`, "--log-level=error"], { cwd: root, stdio: "inherit" });

// macOS: the installed Chrome on Metal (the same GPU path visitors get). Elsewhere: Playwright's own Chromium on
// SwiftShader, so the script also runs on Linux/CI; the per-channel WebGL upload check below still guards the result.
const browser = process.platform === "darwin"
  ? await chromium.launch({ channel: "chrome", args: ["--use-angle=metal", "--enable-gpu"] })
  : await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${base}/robots.txt`);
await page.addScriptTag({ content: readFileSync(bundle, "utf8") });

let failed = false;
for (const slug of SCENE_PRODUCT_ORDER) {
  const project = projects.find((p) => p.slug === slug);
  if (!project?.visuals.icon) continue;
  const png = await page.evaluate(
    (input) => (window as unknown as Win).renderIconCover(input),
    { slug, primary: project.brand.primary, iconUrl: presentationImageUrl(project.visuals.icon) },
  );
  const pngFile = path.join(work, `${slug}.png`);
  const target = path.join(root, "public/projects", slug, "icon-cover-768.webp");
  writeFileSync(pngFile, Buffer.from(png.split(",")[1], "base64"));
  execFileSync("cwebp", ["-quiet", "-lossless", "-z", "9", "-exact", pngFile, "-o", target]);
  const webp = readFileSync(target).toString("base64");
  const check = await page.evaluate((b64) => (window as unknown as Win).verifyIconCover(b64), webp);
  const ok = check.worst >= 0 && check.worst <= 1;
  if (!ok) failed = true;
  console.log(slug, readFileSync(target).length, "bayt", "en büyük fark", check.worst, ok ? "TAMAM" : "UYUMSUZ");
}
await browser.close();
if (failed) process.exit(1);
