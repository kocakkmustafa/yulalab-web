/**
 * Shared motion vocabulary. Every entering element uses ease-out (arrives
 * eagerly, settles gently); every exiting element uses ease-in and roughly
 * half the duration — the outgoing element is never the focus.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN = [0.7, 0, 1, 1] as const;
/** W1 BK3 ortak etkilesim egrisi (globals.css --ease-ui ile ayni). */
export const EASE_UI = [0.25, 0.46, 0.45, 0.94] as const;

export const DURATION = {
  /** Hover/press micro-feedback on cards, pills, buttons. */
  micro: 0.2,
  /** Route-level exit. The reference takes ~1.0s out and ~1.1s in; we run
   *  0.45s out + 0.55s in (page-enter in globals.css) for INP/Lighthouse. */
  pageExit: 0.45,
} as const;

/** Sharp, non-bouncy spring for card/pill hover-lift — a "cool" but restrained lift. */
export const HOVER_SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
