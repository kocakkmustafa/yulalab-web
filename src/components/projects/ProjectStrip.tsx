import { Link } from "@/i18n/navigation";
import { ProjectMonogram } from "@/components/common/ProjectMonogram";
import type { ProjectConfig } from "@/lib/types";

/**
 * LK0 — the horizontal project strip at the top of a product page, drawn after
 * the reference site's "Works" rail: a row of cards (icon, name) the
 * visitor scrolls sideways; a card opens that project's page. The current
 * project is marked with aria-current and a ring, never removed, so the strip
 * keeps one order on every page.
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
  return (
    <nav aria-label={label} data-testid="project-strip">
      <ul
        role="list"
        className="m-0 flex list-none gap-5 overflow-x-auto pb-4 lg:gap-7"
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
                className="group block w-[148px] focusable lg:w-[184px]"
              >
                <span
                  className={`block rounded-[22px] p-1.5 transition-opacity ${
                    current ? "ring-1 ring-white/50" : "opacity-80 group-hover:opacity-100"
                  }`}
                >
                  <ProjectMonogram project={o} size={136} radius={18} />
                </span>
                <span className="mt-3 block font-mono text-[12px] tracking-[0.08em] text-ink-50">{o.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
