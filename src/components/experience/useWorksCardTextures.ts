"use client";

import { useEffect, useRef, useState } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from "three";

import { presentationImageUrl } from "./useShowcaseTextures";
import type { ExperienceProduct } from "./types";

/** W7 Z09: the picture a works card shows (first screenshot, else the app icon) paints the ground behind it. */
export function worksCardPath(product: ExperienceProduct): string | undefined {
  return product.screenshots[0]?.path ?? product.icon;
}

// W7 Z09 t2: the ground only shows a very blurred colour patch, never the picture itself: the card picture is cut to a square and
// stepped down to a 24 px canvas (half resolution each step, like the reference's half-resolution gaussian); the bilinear lookup
// and the shader taps blur it further.
const SIZE = 24;

function cardTexture(image: HTMLImageElement): Texture | null {
  if (image.width <= 0 || image.height <= 0) return null;
  const side = Math.min(image.width, image.height);
  let source: CanvasImageSource = image;
  let sx = (image.width - side) / 2;
  let sy = (image.height - side) / 2;
  let sSize = side;
  for (const size of [128, 64, 32, SIZE]) {
    const step = document.createElement("canvas");
    step.width = size;
    step.height = size;
    const stepContext = step.getContext("2d");
    if (!stepContext) return null;
    stepContext.imageSmoothingQuality = "high";
    stepContext.drawImage(source, sx, sy, sSize, sSize, 0, 0, size, size);
    source = step;
    sx = 0;
    sy = 0;
    sSize = size;
  }
  const canvas = source as HTMLCanvasElement;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

/** One small texture per product (null while loading or when the picture fails). Loads only once enabled. */
export function useWorksCardTextures(products: readonly ExperienceProduct[], enabled: boolean): readonly (Texture | null)[] {
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState<readonly (Texture | null)[]>([]);
  // The product list may be a new array on every render; only a change of the card pictures reloads.
  const key = products.map((product) => worksCardPath(product) ?? "").join("|");
  const productsRef = useRef(products);
  productsRef.current = products;
  useEffect(() => { if (enabled) setRequested(true); }, [enabled]);
  useEffect(() => {
    if (!requested) return;
    let active = true;
    let owned: (Texture | null)[] = [];
    const requests = productsRef.current.map((product) => new Promise<HTMLImageElement | null>((resolve) => {
      const path = worksCardPath(product);
      if (!path) { resolve(null); return; }
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = presentationImageUrl(path);
    }));
    void Promise.all(requests).then((images) => {
      if (!active) return;
      owned = images.map((image) => (image ? cardTexture(image) : null));
      setLoaded(owned);
    });
    return () => { active = false; owned.forEach((texture) => texture?.dispose()); };
  }, [requested, key]);
  return loaded;
}
