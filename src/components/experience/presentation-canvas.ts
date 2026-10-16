import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";
import type { ExperienceProduct } from "./types";

export type PresentationImage = CanvasImageSource & { width: number; height: number };

export function drawContained(context: CanvasRenderingContext2D, image: PresentationImage, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  context.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
}

export function drawLines(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) {
  const words = text.split(/\s+/);
  let line = "";
  let row = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > maxWidth) {
      context.fillText(line, x, y + row * lineHeight);
      row += 1;
      if (row >= maxLines) return;
      line = word;
    } else line = next;
  }
  if (line && row < maxLines) context.fillText(line, x, y + row * lineHeight);
}

export function canvasTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** A brand/development presentation, never a fabricated application screen. */
export function makeIdentityPresentation(product: ExperienceProduct, icon: PresentationImage | undefined, previews: readonly PresentationImage[]) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const c = canvas.getContext("2d");
  if (c) {
    const gradient = c.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, product.colors.background);
    gradient.addColorStop(1, "#15111b");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 1280, 720);
    c.strokeStyle = "rgba(255,255,255,.14)";
    c.strokeRect(24, 24, 1232, 672);
    const english = product.href.startsWith("/en/");
    const hasPreview = previews.length > 0;
    if (icon) drawContained(c, icon, hasPreview ? 62 : 682, hasPreview ? 92 : 84, hasPreview ? 224 : 552, hasPreview ? 224 : 552);
    c.fillStyle = "#f5f1f8";
    c.font = "500 74px system-ui, sans-serif";
    c.fillText(product.name, 62, hasPreview && icon ? 412 : 190, 560);
    c.font = "400 28px system-ui, sans-serif";
    c.fillStyle = "#ccc7d4";
    drawLines(c, product.tagline, 64, hasPreview && icon ? 474 : 268, 535, 40, 3);
    c.font = "500 17px monospace";
    c.fillStyle = "#b8b0c5";
    c.fillText(hasPreview ? (english ? "DEVELOPMENT PREVIEW / 2026-10-16" : "GELİŞTİRME ÖNİZLEMESİ / 2026-10-16") : (english ? "PRODUCT IDENTITY" : "ÜRÜN KİMLİĞİ"), 64, 622);
    c.fillText(product.lifecycleLabel.toLocaleUpperCase(english ? "en-US" : "tr-TR"), 64, 655);
    if (hasPreview) {
      const width = previews.length > 1 ? 270 : 438;
      previews.slice(0, 2).forEach((image, index) => drawContained(c, image, 654 + index * 290, 64 + index * 45, width, 590 - index * 70));
    }
  }
  return canvasTexture(canvas);
}
