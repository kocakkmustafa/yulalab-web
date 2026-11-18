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
export function makeIdentityPresentation(product: ExperienceProduct, icon: PresentationImage | undefined) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280; canvas.height = 720;
  const c = canvas.getContext("2d");
  if (c) {
    c.fillStyle = product.colors.background; c.fillRect(0, 0, 1280, 720);
    if (icon) drawContained(c, icon, 364, 60, 552, 552);
    c.fillStyle = "#c7c0ce"; c.font = "500 18px monospace";
    c.fillText(product.lifecycleLabel, 50, 665);
  }
  return canvasTexture(canvas);
}
