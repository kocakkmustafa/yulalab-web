"use client";

import { useEffect, useState } from "react";
import type { Texture } from "three";
import { approvedIdentityPaths, showcaseImagePaths } from "@/data/product-presentations";
import { canvasTexture, drawContained, drawLines, type PresentationImage } from "./presentation-canvas";

export function presentationImageUrl(path: string): string {
  return path.endsWith("/icon.png")
    ? `/_next/image?url=${encodeURIComponent(path)}&w=640&q=75`
    : path;
}

function paintStory(index: number, english: boolean, images: Map<string, HTMLImageElement>, resolution: number) {
  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = Math.round(resolution * 9 / 16);
  const c = canvas.getContext("2d");
  if (!c) return canvasTexture(canvas);
  c.scale(resolution / 1280, resolution / 1280);
  const palettes = [["#10101a", "#363455"], ["#151019", "#442837"], ["#171020", "#322442"], ["#12110e", "#42351b"]];
  const gradient = c.createLinearGradient(0, 0, 1280, 720);
  gradient.addColorStop(0, palettes[index][0]);
  gradient.addColorStop(1, palettes[index][1]);
  c.fillStyle = gradient;
  c.fillRect(0, 0, 1280, 720);
  const image = (path: string, x: number, y: number, w: number, h: number) => {
    const found = images.get(path);
    if (found) drawContained(c, found as PresentationImage, x, y, w, h);
  };
  const title = [
    english ? "Traceable work" : "İzlenebilir çalışma",
    english ? "A product family" : "Bir ürün ailesi",
    english ? "Starting on the device" : "Cihazda başlayan tasarım",
    english ? "Claims and limits" : "İddia ve sınır",
  ][index];
  c.fillStyle = "#f5f1f8";
  c.font = "500 62px system-ui, sans-serif";
  drawLines(c, title, 60, 118, index === 2 ? 660 : 1100, 72, 2);
  if (index === 0) {
    image("/projects/braavolabs/screenshot-audit-trail.png", 62, 172, 720, 440);
    image("/projects/braavolabs/screenshot-builder.png", 820, 214, 385, 350);
  } else if (index === 1) {
    const names = ["Gravita", "Lissom", "JabLab", "Ostinato", "Choreia"];
    approvedIdentityPaths.forEach((path, i) => {
      const x = 58 + i * 235;
      const slug = path.split("/")[2];
      image(path, x, 165, 62, 62);
      c.font = "500 20px system-ui, sans-serif";
      c.fillStyle = "#f5f1f8";
      c.fillText(names[i], x + 72, 205);
      image(`/projects/${slug}/preview-native-20261016.png`, x, 242, 215, 390);
    });
  } else if (index === 2) {
    c.font = "500 96px system-ui, sans-serif";
    c.fillText("LifeOS", 70, 370);
    image("/projects/lifeos/preview-onboarding-20261016.png", 800, 60, 362, 586);
    c.font = "400 27px system-ui, sans-serif";
    c.fillStyle = "#d3cbdc";
    drawLines(c, english ? "First-start development view. The insight text is an example." : "İlk başlangıcın geliştirme görünümü. İçgörü metni örnektir.", 70, 570, 620, 38, 2);
  } else {
    image("/projects/burunfarki/screenshot-honest-stats.png", 68, 188, 1120, 265);
    image("/projects/burunfarki/screenshot-daily-history.png", 490, 438, 680, 210);
  }
  c.font = "500 17px monospace";
  c.fillStyle = "#c2bacd";
  const note = index === 0 || index === 3
    ? (english ? "DATED PRODUCT CAPTURES / 2026-07-11" : "TARİHLİ ÜRÜN GÖRÜNÜMLERİ / 2026-07-11")
    : (english ? "IDENTITY + DEVELOPMENT PREVIEW / 2026-10-16" : "KİMLİK + GELİŞTİRME ÖNİZLEMESİ / 2026-10-16");
  c.fillText(note, 64, 682);
  c.strokeStyle = "rgba(255,255,255,.16)";
  c.strokeRect(24, 24, 1232, 672);
  return canvasTexture(canvas);
}

/** One scene owner supplies both the portal pass and the visible corridor. */
export function useShowcaseTextures(english: boolean, enabled: boolean, resolution: number): readonly Texture[] {
  const [requested, setRequested] = useState(false);
  const key = `${english}:${resolution}`;
  const [loaded, setLoaded] = useState<{ key: string; textures: readonly Texture[] } | null>(null);
  useEffect(() => { if (enabled) setRequested(true); }, [enabled]);
  useEffect(() => {
    if (!requested) return;
    let active = true;
    let owned: Texture[] = [];
    const requests = [...new Set(showcaseImagePaths)].map((path) => new Promise<[string, HTMLImageElement | null]>((resolve) => {
      const image = new window.Image();
      image.onload = () => resolve([path, image]);
      image.onerror = () => resolve([path, null]);
      image.src = presentationImageUrl(path);
    }));
    void Promise.all(requests).then((entries) => {
      if (!active) return;
      const images = new Map(entries.filter((entry): entry is [string, HTMLImageElement] => entry[1] !== null));
      owned = [0, 1, 2, 3].map((index) => paintStory(index, english, images, resolution));
      setLoaded({ key, textures: owned });
    });
    return () => {
      active = false;
      owned.forEach((texture) => texture.dispose());
    };
  }, [requested, english, resolution, key]);
  return loaded?.key === key ? loaded.textures : [];
}
