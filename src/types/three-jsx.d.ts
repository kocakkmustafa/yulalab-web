import type { ThreeElements } from "@react-three/fiber";

/**
 * @react-three/fiber v9 no longer injects its elements into the global
 * JSX namespace automatically (React 19 moved JSX types under the react
 * module). This augmentation is the documented v9 migration step — without
 * it every <mesh>/<color>/<fog> fails typecheck.
 */
declare module "react" {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation, not a standalone type
    interface IntrinsicElements extends ThreeElements {}
  }
}
