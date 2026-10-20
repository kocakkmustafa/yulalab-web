import { localized, text } from "@/lib/localized";
/* eslint-disable @next/next/no-img-element -- preserve the complete, dated development capture. */
import { developmentPreviews } from "@/data/product-presentations";
import type { Locale } from "@/lib/types";

export function DevelopmentPreviewSection({ slug, locale }: { slug: string; locale: Locale }) {
  const previews = developmentPreviews[slug];
  if (!previews?.length) return null;

  return (
    <section className="py-16 border-t border-white/10" data-development-previews={slug}>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
        {text(locale, "Tarihli geliştirme görünümü", "Dated development preview")}
      </p>
      <h2 className="mt-3 mb-5 text-3xl font-light">
        {text(locale, "Uygulamanın içinden", "Inside the app")}
      </h2>
      <p className="max-w-2xl text-ink-300 mb-8">
        {text(locale, "16 Ekim 2026 tarihli geliştirme sürümü. Bu görüntüler güncel mağaza sürümü, satışa hazır olma veya sonuç doğruluğu kanıtı değildir.", "Development build captured on 16 October 2026. These images do not establish the current store version, sales readiness or result accuracy.")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {previews.map((preview) => (
          <figure key={preview.path} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <img src={preview.path} alt={localized(preview.alt, locale)} loading="lazy" decoding="async" className="w-full h-[min(70vh,680px)] object-contain" />
            <figcaption className="mt-4 text-sm text-ink-300">
              <p className="font-mono text-xs mb-2">{preview.captureKind === "onboarding" ? (text(locale, "İlk başlangıç görünümü", "First-start view")) : (text(locale, "Uygulama içi görünüm", "In-app view"))}</p>
              <p>{localized(preview.alt, locale)}</p>
              <time dateTime={preview.capturedAt}>{preview.capturedAt}</time>
              <details className="mt-2 text-xs">
                <summary>{text(locale, "Kaynak sürüm", "Source build")}</summary>
                <code className="break-all">{preview.sourceBuild}</code>
              </details>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
