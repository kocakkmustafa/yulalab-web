/**
 * data-reveal: scroll-triggered reveal as progressive enhancement.
 *
 * Without JS, with prefers-reduced-motion, or without IntersectionObserver the
 * element is never touched and stays visible. Only elements that start below the
 * first screen get `data-reveal-state="pending"` (opacity 0, translateY 24px);
 * when they enter the viewport the state becomes "in" and CSS eases them in
 * (800ms, --ease-ui). Elements already on screen are marked "in" at once, so
 * nothing flashes and the LCP element is never hidden.
 */
const SELECTOR = "[data-reveal]:not([data-reveal-state])";

export function motionAllowed(win: Window): boolean {
  return !win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function startReveal(win: Window = window): () => void {
  const doc = win.document;
  if (!motionAllowed(win) || typeof IntersectionObserver === "undefined") return () => {};

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealState = "in";
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
  );

  const scan = () => {
    for (const node of doc.querySelectorAll<HTMLElement>(SELECTOR)) {
      if (node.getBoundingClientRect().top < win.innerHeight) {
        node.dataset.revealState = "in";
      } else {
        node.dataset.revealState = "pending";
        io.observe(node);
      }
    }
  };

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      scan();
    });
  };

  scan();
  const mo = new MutationObserver(schedule);
  mo.observe(doc.body, { childList: true, subtree: true });

  return () => {
    mo.disconnect();
    io.disconnect();
    if (frame) win.cancelAnimationFrame(frame);
  };
}
