import type { ExperienceProduct } from "./types";
import { canvasTexture, type PresentationImage } from "./presentation-canvas";

/** Per-product overrides: a body colour that keeps the glyph readable, and the key-out range. */
const BODY_OVERRIDE: Record<string, string> = { jablab: "#FF8A3B" };
/** Braavolabs: a 256 px render of a grey metal figure on a navy, vignetted disc. Its ground is blue or near black,
 * the figure is neutral grey, so it is keyed by chroma (not by distance to the corner) and cropped to the figure. */
const CHROMA_KEYED = new Set(["braavolabs"]);
const FIGURE_BOX = { x0: 150, x1: 640, y0: 100, y1: 584 } as const;

/** Separable square max (grow) or min (shrink) filter over a binary mask. */
function morph(mask: Uint8Array, size: number, radius: number, grow: boolean): Uint8Array {
  const pass = (source: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let value = grow ? 0 : 1;
      for (let k = -radius; k <= radius; k++) {
        const xx = horizontal ? x + k : x;
        const yy = horizontal ? y : y + k;
        const v = xx < 0 || yy < 0 || xx >= size || yy >= size ? (grow ? 0 : 1) : source[yy * size + xx];
        if (grow ? v : !v) { value = grow ? 1 : 0; break; }
      }
      out[y * size + x] = value;
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

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
        if (CHROMA_KEYED.has(product.slug)) {
          // Only the vignetted Braavolabs render needs a connectivity key; the figure's inner spaces are never removed.
          // W1D-F H1-e: the ground is removed by a flood fill from the border (a connected region of
          // ground-like pixels), not by a global colour threshold: dark spots inside the artwork stay
          // solid instead of speckling. The mask edge is feathered with a small box blur.
          const near = new Uint8Array(SIZE * SIZE);
          for (let p = 0; p < SIZE * SIZE; p++) {
            const i = p * 4;
            const d = Math.hypot(px[i] - ref[0], px[i + 1] - ref[1], px[i + 2] - ref[2]) / 441;
            if (CHROMA_KEYED.has(product.slug)) {
              const blue = px[i + 2] > px[i] + 10 && px[i + 2] > px[i + 1] + 5;
              near[p] = blue || Math.max(px[i], px[i + 1], px[i + 2]) < 9 ? 1 : 0;
            } else near[p] = smooth(lo, hi, d * 2.2) < 0.5 ? 1 : 0;
          }
          const ground = new Uint8Array(SIZE * SIZE);
          const stack: number[] = [];
          const push = (p: number) => { if (near[p] && !ground[p]) { ground[p] = 1; stack.push(p); } };
          for (let k = 0; k < SIZE; k++) { push(k); push((SIZE - 1) * SIZE + k); push(k * SIZE); push(k * SIZE + SIZE - 1); }
          while (stack.length) {
            const p = stack.pop() as number;
            const x = p % SIZE;
            if (x > 0) push(p - 1);
            if (x < SIZE - 1) push(p + 1);
            if (p >= SIZE) push(p - SIZE);
            if (p < SIZE * (SIZE - 1)) push(p + SIZE);
          }
          // Small detached islands (dust of the ground texture) are ground too.
          const seen = new Uint8Array(SIZE * SIZE);
          for (let start = 0; start < SIZE * SIZE; start++) {
            if (ground[start] || seen[start]) continue;
            const island = [start];
            seen[start] = 1;
            for (let k = 0; k < island.length; k++) {
              const p = island[k];
              const x = p % SIZE;
              const around = [x > 0 ? p - 1 : -1, x < SIZE - 1 ? p + 1 : -1, p >= SIZE ? p - SIZE : -1, p < SIZE * (SIZE - 1) ? p + SIZE : -1];
              for (const q of around) if (q >= 0 && !ground[q] && !seen[q]) { seen[q] = 1; island.push(q); }
            }
            if (island.length < 4000) for (const p of island) ground[p] = 1;
          }
          if (CHROMA_KEYED.has(product.slug)) {
            // Close pin holes in the figure, then keep only the figure's own box (no disc rim, no rock).
            const figure = morph(morph(Uint8Array.from(ground, (g) => 1 - g), SIZE, 6, true), SIZE, 6, false);
            for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
              const inside = x >= FIGURE_BOX.x0 && x <= FIGURE_BOX.x1 && y >= FIGURE_BOX.y0 && y <= FIGURE_BOX.y1;
              ground[y * SIZE + x] = figure[y * SIZE + x] && inside ? 0 : 1;
            }
          }
          let mask = Float32Array.from(ground, (g) => 1 - g);
          for (let pass = 0; pass < 2; pass++) {
            const next = new Float32Array(SIZE * SIZE);
            for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
              let sum = 0; let n = 0;
              for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx; const yy = y + dy;
                if (xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE) continue;
                sum += mask[yy * SIZE + xx]; n++;
              }
              next[y * SIZE + x] = sum / n;
            }
            mask = next;
          }
          for (let p = 0; p < SIZE * SIZE; p++) px[p * 4 + 3] = Math.round(px[p * 4 + 3] * mask[p]);
        } else {
          // Flat-ground icons: the ground colour is keyed out everywhere (inner counters of the glyph show the brand body).
          for (let i = 0; i < px.length; i += 4) {
            const d = Math.hypot(px[i] - ref[0], px[i + 1] - ref[1], px[i + 2] - ref[2]) / 441;
            px[i + 3] = Math.round(px[i + 3] * smooth(lo, hi, d * 2.2));
          }
        }
        lc.putImageData(data, 0, 0);
        c.drawImage(layer, 0, 0);
      }
    }
    c.restore();
  }
  return canvasTexture(canvas);
}
