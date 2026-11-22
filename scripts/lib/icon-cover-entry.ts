// Tarayıcıda çalışan giriş: render-icon-covers.mts bunu esbuild ile paketleyip sayfaya yükler.
import { makeBrightIconPresentation } from "../../src/components/experience/icon-presentation";
import type { PresentationImage } from "../../src/components/experience/presentation-canvas";
import type { ExperienceProduct } from "../../src/components/experience/types";

type Input = { slug: string; primary: string; iconUrl: string };
type Win = Window & {
  renderIconCover: (input: Input) => Promise<string>;
  verifyIconCover: (webpBase64: string) => Promise<{ worst: number; bad: number }>;
  __lastCover?: HTMLCanvasElement;
};
const win = window as unknown as Win;

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

/** three'nin doku yüklemesi gibi (premultiply kapalı) bir kaynağı WebGL'e yükleyip baytlarını geri okur. */
function glRead(gl: WebGL2RenderingContext, source: TexImageSource, size: number): Uint8Array {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const out = new Uint8Array(size * size * 4);
  gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, out);
  return out;
}

win.renderIconCover = async (input) => {
  const image = await loadImage(input.iconUrl);
  const product = { slug: input.slug, colors: { primary: input.primary } } as unknown as ExperienceProduct;
  const texture = makeBrightIconPresentation(product, image as unknown as PresentationImage);
  const canvas = texture.image as HTMLCanvasElement;
  win.__lastCover = canvas;
  return canvas.toDataURL("image/png");
};

/** Çalışma zamanı canvas'ı ile statik dosyanın WebGL yüklemesi arasındaki kanal başına en büyük fark. */
win.verifyIconCover = async (webpBase64) => {
  const canvas = win.__lastCover;
  if (!canvas) return { worst: -1, bad: -1 };
  const size = canvas.width;
  const gl = document.createElement("canvas").getContext("webgl2", { premultipliedAlpha: false });
  if (!gl) return { worst: -1, bad: -1 };
  const a = glRead(gl, canvas, size);
  const b = glRead(gl, await loadImage(`data:image/webp;base64,${webpBase64}`), size);
  let worst = 0;
  let bad = 0;
  for (let p = 0; p < a.length; p += 4) {
    let d = 0;
    for (let k = 0; k < 4; k++) d = Math.max(d, Math.abs(a[p + k] - b[p + k]));
    if (d > worst) worst = d;
    if (d > 1) bad++;
  }
  return { worst, bad };
};
