/**
 * W1D K8: 3D is the default on phones too (the "Open the 3D experience" button is gone).
 * Reduced motion and WebGL failure still fall back to the static document.
 * History: ADR-003 (c), WEB-P0-03a2: at <= 767 px the home page opened the linear
 * (static) document and loads the R3F/three journey only when the visitor
 * taps "Open the 3D experience". Desktop keeps 3D as the default.
 * Set to false to restore the previous behaviour on every viewport.
 */
export const MOBILE_STATIC_DEFAULT = false;
export const MOBILE_STATIC_QUERY = "(max-width: 767px)";
