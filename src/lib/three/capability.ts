/**
 * Whether this device/user should get the WebGL scene at all.
 *
 * The 3D layer is progressive enhancement, never a requirement: the DOM
 * underneath carries the full content, so failing ANY of these checks
 * means "render the static premium version", not "render nothing".
 *
 * - prefers-reduced-motion: a stated user preference, honored absolutely.
 *   The a11y suite (reduced-motion e2e) runs against the static branch.
 * - saveData: a heavy always-animating canvas on a metered connection is
 *   hostile; the static version is visually complete.
 * - WebGL context: probed, not assumed — some corporate/locked-down
 *   browsers report a canvas but refuse a GL context.
 */
export function canRunScene(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
