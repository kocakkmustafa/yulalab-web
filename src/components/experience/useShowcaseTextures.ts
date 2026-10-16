"use client";

import { useEffect, useState } from "react";
import type { Texture } from "three";
import { canvasTexture } from "./presentation-canvas";

export function presentationImageUrl(path: string): string {
  return path.endsWith("/icon.png") ? `/_next/image?url=${encodeURIComponent(path)}&w=640&q=75` : path;
}

/** Real, dated source frames. Each surface moves independently; no painted UI or collage. */
export const serviceMediaPaths = [
  "/projects/braavolabs/screenshot-audit-trail.png",
  "/projects/gravita/preview-native-20261016.png",
  "/projects/lissom/preview-native-20261016.png",
  "/projects/jablab/preview-native-20261016.png",
  "/projects/ostinato/preview-native-20261016.png",
  "/projects/choreia/preview-native-20261016.png",
  "/projects/lifeos/preview-onboarding-20261016.png",
  "/projects/braavolabs/screenshot-builder.png",
  "/projects/burunfarki/screenshot-honest-stats.png",
  "/projects/burunfarki/screenshot-daily-history.png",
] as const;

function sourceTexture(image: HTMLImageElement, path: string, resolution: number) {
  const scale = Math.min(1, resolution / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const c = canvas.getContext("2d");
  if (!c) return null;
  c.drawImage(image, 0, 0, canvas.width, canvas.height);
  const texture = canvasTexture(canvas);
  texture.userData = { sourcePath: path, fullSourceFrame: true };
  return texture;
}

/** One lifetime owns the bounded source textures shared by room, portal and foreground. */
export function useShowcaseTextures(english: boolean, enabled: boolean, resolution: number): readonly Texture[] {
  const [requested, setRequested] = useState(false);
  const key = `${english}:${resolution}`;
  const [loaded, setLoaded] = useState<{ key: string; textures: readonly Texture[] } | null>(null);
  useEffect(() => { if (enabled) setRequested(true); }, [enabled]);
  useEffect(() => {
    if (!requested) return;
    let active = true;
    let owned: Texture[] = [];
    const requests = serviceMediaPaths.map((path) => new Promise<[string, HTMLImageElement | null]>((resolve) => {
      const image = new window.Image();
      image.onload = () => resolve([path, image]);
      image.onerror = () => resolve([path, null]);
      image.src = path;
    }));
    void Promise.all(requests).then((entries) => {
      if (!active) return;
      owned = entries.flatMap(([path, image]) => {
        const texture = image ? sourceTexture(image, path, resolution) : null;
        return texture ? [texture] : [];
      });
      setLoaded({ key, textures: owned });
    });
    return () => { active = false; owned.forEach((texture) => texture.dispose()); };
  }, [requested, english, resolution, key]);
  return loaded?.key === key ? loaded.textures : [];
}
