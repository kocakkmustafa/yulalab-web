import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { STATUS_PILL_KEY } from "@/components/common/StatusPill";
import { localized } from "@/lib/localized";
import type { Locale, ProjectConfig } from "@/lib/types";

/** Apps whose real iOS icon ships as a lossless 512 px WebP (>= 2x the 200 px card); others fall back to icon.png. */
const STRIP_ICON_SLUGS: ReadonlySet<string> = new Set(["ostinato", "lissom", "gravita", "jablab", "choreia", "lifeos", "braavolabs"]);

/**
 * LK0 — the horizontal project strip at the top of a product page, drawn after the reference site's "Works"
 * rail. Founder decision W8 "b: gerçek simge": every card is the app's real icon, unaltered (icon-512.webp,
 * a lossless 512 px of the iOS 1024 px master), squircle-masked, about 200 px on desktop with 40 px gaps and
 * about 120 px on mobile, then the reference's two text lines: mono 11 px "status · category" and the 14 px
 * name. The rail slides sideways and bleeds to both viewport edges; the current project is highlighted, never
 * removed, so the strip keeps one order on every page. Status is plain text here, not a pill: the product's own
 * pill stays the one place that states its publication status.
 */
export function ProjectStrip({
  projects,
  currentSlug,
  label,
}: {
  projects: readonly ProjectConfig[];
  currentSlug: string;
  label: string;
}) {
  const locale = useLocale() as Locale;
  const tStatus = useTranslations("status");
  return (
    <nav aria-label={label} data-testid="project-strip">
      <ul
        role="list"
        className="m-0 flex list-none gap-8 overflow-x-auto pb-4 lg:gap-10"
        // The list bleeds to both viewport edges while its first card stays on the content edge: negative margin and equal padding.
        style={{ scrollbarWidth: "none", marginInline: "calc(50% - 50vw)", paddingInline: "calc(50vw - 50%)" }}
      >
        {projects.map((o) => {
          const current = o.slug === currentSlug;
          return (
            <li key={o.slug} className="shrink-0">
              <Link
                href={`/projects/${o.slug}`}
                aria-current={current ? "page" : undefined}
                data-strip-card={o.slug}
                className="group block w-[120px] focusable lg:w-[200px]"
              >
                <span
                  className={`block overflow-hidden rounded-[22.37%] transition-[opacity,box-shadow] ${
                    current ? "shadow-[0_0_0_2px_rgba(255,255,255,0.85)]" : "opacity-70 group-hover:opacity-100"
                  }`}
                >
                  <Image
                    src={STRIP_ICON_SLUGS.has(o.slug) ? `/projects/${o.slug}/icon-512.webp` : `/projects/${o.slug}/icon.png`}
                    unoptimized
                    alt=""
                    width={200}
                    height={200}
                    sizes="(min-width: 1024px) 200px, 120px"
                    className="block h-auto w-full"
                  />
                </span>
                <small className="mt-4 block font-mono text-[11px] uppercase tracking-[0.08em] text-ink-300">
                  {tStatus(STATUS_PILL_KEY[o.status])} · {localized(o.category, locale)}
                </small>
                <span className="mt-1.5 block font-grotesk text-[14px] text-ink-50">{o.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
