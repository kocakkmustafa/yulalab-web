import type { ExperienceProduct } from "./types";
import { canvasTexture, type PresentationImage } from "./presentation-canvas";

/** Per-product overrides: a body colour that keeps the glyph readable, and the key-out range. */
const BODY_OVERRIDE: Record<string, string> = { jablab: "#FF8A3B" };
const MASK_RANGE: Record<string, [number, number]> = { braavolabs: [0.24, 0.4] };

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const sat = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, sat, l];
}

/** A bright, saturated brand body for the glyph: never the icon's own dark ground. */
function brandBody(product: ExperienceProduct): [string, string] {
  const [h, s0, l0] = hexToHsl(BODY_OVERRIDE[product.slug] ?? product.colors.primary);
  const s = Math.max(0.62, s0) * 100;
  const l = Math.min(0.62, Math.max(0.5, l0));
  return [`hsl(${h} ${s}% ${Math.min(0.72, l + 0.12) * 100}%)`, `hsl(${h} ${s}% ${Math.max(0.4, l - 0.08) * 100}%)`];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The product glyph alone on a bright brand-coloured squircle (iOS-style 22.4%
 * radius) over a transparent canvas. The icon's dark ground is keyed out by its
 * distance from the corner colour, so only the glyph keeps its own colours.
 */
export function makeBrightIconPresentation(product: ExperienceProduct, icon: PresentationImage | undefined) {
  const SIZE = 768;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const c = canvas.getContext("2d");
  if (c) {
    c.clearRect(0, 0, SIZE, SIZE);
    c.save();
    c.beginPath();
    c.roundRect(0, 0, SIZE, SIZE, 172);
    c.clip();
    const [light, base] = brandBody(product);
    const body = c.createLinearGradient(0, 0, SIZE, SIZE);
    body.addColorStop(0, light);
    body.addColorStop(1, base);
    c.fillStyle = body;
    c.fillRect(0, 0, SIZE, SIZE);
    if (icon) {
      const layer = document.createElement("canvas");
      layer.width = SIZE;
      layer.height = SIZE;
      const lc = layer.getContext("2d", { willReadFrequently: true });
      if (lc) {
        lc.drawImage(icon, 0, 0, SIZE, SIZE);
        const data = lc.getImageData(0, 0, SIZE, SIZE);
        const px = data.data;
        const corner = (offset: number, ch: number) => px[offset * 4 + ch];
        const last = SIZE * SIZE - 1;
        const ref = [0, 1, 2].map(
          (ch) => (corner(0, ch) + corner(SIZE - 1, ch) + corner(SIZE * (SIZE - 1), ch) + corner(last, ch)) / 4,
        );
        const [lo, hi] = MASK_RANGE[product.slug] ?? [0.14, 0.3];
        for (let i = 0; i < px.length; i += 4) {
          const d = Math.hypot(px[i] - ref[0], px[i + 1] - ref[1], px[i + 2] - ref[2]) / 441;
          px[i + 3] = Math.round(px[i + 3] * smooth(lo, hi, d * 2.2));
        }
        lc.putImageData(data, 0, 0);
        c.drawImage(layer, 0, 0);
      }
    }
    c.restore();
  }
  return canvasTexture(canvas);
}
