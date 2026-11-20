import { localized, text } from "@/lib/localized";
/* eslint-disable @next/next/no-img-element -- intrinsic width/height reserve the box; lazy + async decode. */
import { designPreviews } from "@/data/product-presentations";
import { IMAGE_DIMENSIONS } from "@/data/image-dimensions";
import type { Locale } from "@/lib/types";

/** English design previews. Never a screenshot of a built app; the copy says so. */
export function DesignPreviewSection({ slug, locale }: { slug: string; locale: Locale }) {
  const previews = designPreviews[slug];
  if (!previews?.length) return null;
  const portrait = slug === "lifeos";

  return (
    <section className="mb-12" data-design-previews={slug} aria-labelledby={`design-previews-${slug}`}>
      <p id={`design-previews-${slug}`} className="font-mono text-xs uppercase tracking-widest text-ink-400">
        {text(locale, "Tasarım önizlemesi", "Design preview")}
      </p>
      <p className="mt-3 mb-6 max-w-2xl text-sm leading-[1.7] text-ink-300">
        {text(
          locale,
          "Bu görseller uygulama arayüzünün İngilizce tasarım önizlemeleridir. Yayınlanmış bir sürümün ekran görüntüsü, satışa hazır olma ya da sonuç kanıtı değildir.",
          "These images are English design previews of the app interface. They are not a capture of a published version, and not evidence of sales readiness or results.",
        )}
      </p>
      <ul role="list" className={`m-0 grid list-none gap-4 p-0 ${portrait ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {previews.map((preview) => {
          const size = IMAGE_DIMENSIONS[preview.path];
          return (
            <li key={preview.path}>
              <figure className="m-0 rounded-xl border border-white/10 bg-black/20 p-3">
                <img
                  src={preview.path}
                  alt={localized(preview.alt, locale)}
                  width={size?.width}
                  height={size?.height}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full rounded-lg"
                  style={size ? { aspectRatio: `${size.width} / ${size.height}` } : undefined}
                />
                <figcaption className="mt-3 text-xs leading-[1.6] text-ink-300">
                  <p className="font-mono">{text(locale, "Tasarım yönü", "Design direction")}: {localized(preview.designDirection, locale)}</p>
                  <p className="font-mono break-all">{text(locale, "Pano dosyası", "Board file")}: {preview.boardFile}</p>
                  <time className="font-mono" dateTime={preview.designedAt}>{preview.designedAt}</time>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
