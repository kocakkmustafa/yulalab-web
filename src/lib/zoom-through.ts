import type { MouseEvent } from "react";

const DURATION_MS = 900;

/**
 * Card → page "zoom-through": a detached copy of the card's media grows from
 * the card to the full viewport and dissolves while the router swaps the page
 * underneath, so the work image carries the visitor into its own page.
 *
 * The copy lives on <body> outside React (it must survive the route change),
 * is aria-hidden and pointer-transparent, and always removes itself. Modified
 * clicks (new tab/window), reduced motion and browsers without the Web
 * Animations API keep the plain navigation.
 */
export function zoomThrough(event: MouseEvent<HTMLElement>, media: HTMLElement | null): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (!media || typeof media.animate !== "function") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  const rect = media.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  const clone = media.cloneNode(true) as HTMLElement;
  clone.classList.remove("media-in");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-zoom-through", "true");
  clone.querySelectorAll("a, button, [tabindex]").forEach((node) => node.setAttribute("tabindex", "-1"));
  Object.assign(clone.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    zIndex: "70",
    overflow: "hidden",
    pointerEvents: "none",
    animation: "none",
    borderRadius: window.getComputedStyle(media).borderRadius,
  });
  document.body.appendChild(clone);

  const full = { left: "0px", top: "0px", width: `${window.innerWidth}px`, height: `${window.innerHeight}px` };
  const start = { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` };
  const remove = () => clone.remove();
  const animation = clone.animate(
    [
      { ...start, opacity: 1, filter: "none", borderRadius: clone.style.borderRadius },
      { ...full, offset: 0.62, opacity: 1, filter: "saturate(1.25) blur(1px)", borderRadius: "0px" },
      { ...full, opacity: 0, filter: "saturate(1.25) blur(14px)", borderRadius: "0px" },
    ],
    { duration: DURATION_MS, easing: "cubic-bezier(0.7, 0, 0.2, 1)", fill: "forwards" },
  );
  animation.onfinish = remove;
  animation.oncancel = remove;
  window.setTimeout(remove, DURATION_MS + 600);
  return true;
}
