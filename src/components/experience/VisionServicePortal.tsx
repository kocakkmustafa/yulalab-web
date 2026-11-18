"use client";

import { useFBO } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  Color,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from "three";
import type { QualityTier, TimelineFrame, Vec3 } from "./types";
import { YulaGlyph } from "./YulaGlyph";

export type VisionServicePortalProps = {
  frame: TimelineFrame;
  glyphRotation?: Vec3;
  tier: QualityTier;
  mediaTextures?: readonly Texture[];
};

const PORTAL_RESOLUTION: Record<QualityTier, number> = {
  high: 768,
  medium: 512,
  low: 256,
};

/**
 * W1D-D K4-a: the side screen seen through the Y is a clean colour band, never source media (screenshots
 * carried small text and line fragments into the letter). Full-screen quad, so the glyph's screen-space
 * lookup reads smooth diagonal bands that drift slowly with the journey.
 */
const BAND_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;
const BAND_FRAGMENT = `
  varying vec2 vUv;
  uniform float uShift;
  void main() {
    float axis = vUv.x * 0.72 + vUv.y * 0.55 + uShift;
    vec3 cyan = vec3(0.16, 0.86, 1.0);
    vec3 violet = vec3(0.52, 0.32, 1.0);
    vec3 magenta = vec3(1.0, 0.26, 0.78);
    vec3 amber = vec3(1.0, 0.72, 0.28);
    float t = fract(axis);
    vec3 c = mix(cyan, violet, smoothstep(0.0, 0.34, t));
    c = mix(c, magenta, smoothstep(0.34, 0.68, t));
    c = mix(c, amber, smoothstep(0.68, 1.0, t));
    gl_FragColor = vec4(c, 1.0);
  }
`;

function ColorBandScreen({ shift }: { shift: number }) {
  const material = useMemo(
    () => new ShaderMaterial({
      vertexShader: BAND_VERTEX,
      fragmentShader: BAND_FRAGMENT,
      uniforms: { uShift: { value: 0 } },
      depthTest: false,
      depthWrite: false,
    }),
    [],
  );
  material.uniforms.uShift.value = shift;
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

function fitRenderTarget(width: number, height: number, limit: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = limit / Math.max(safeWidth, safeHeight);
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

/**
 * Renders only the lightweight SERVICE media surfaces into a capped target.
 * The texture is composited by YulaGlyph, so the real extruded Y is the mask.
 */
export function VisionServicePortal({ frame, tier, glyphRotation }: VisionServicePortalProps) {
  const renderer = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const portalScene = useMemo(() => new Scene(), []);
  const savedClearColor = useMemo(() => new Color(), []);
  const targetSize = fitRenderTarget(size.width, size.height, PORTAL_RESOLUTION[tier]);
  const target = useFBO(targetSize.width, targetSize.height, {
    depthBuffer: true,
    samples: 0,
    stencilBuffer: false,
    type: UnsignedByteType,
  });
  const portalActive = frame.world.servicePortalOpacity > 0.001;

  useEffect(() => {
    target.texture.colorSpace = SRGBColorSpace;
    target.texture.needsUpdate = true;
  }, [target]);

  useFrame(() => {
    if (!portalActive) return;

    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousXr = renderer.xr.enabled;
    const previousClearAlpha = renderer.getClearAlpha();
    renderer.getClearColor(savedClearColor);

    try {
      renderer.xr.enabled = false;
      renderer.autoClear = true;
      renderer.setRenderTarget(target);
      renderer.setClearColor("#07050a", 0);
      renderer.clear(true, true, true);
      renderer.render(portalScene, camera);
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.setClearColor(savedClearColor, previousClearAlpha);
      renderer.autoClear = previousAutoClear;
      renderer.xr.enabled = previousXr;
    }
  }, -40);

  return (
    <>
      {portalActive
        ? createPortal(
          <>
            <ColorBandScreen shift={frame.progress * 1.6} />
          </>,
          portalScene,
        )
        : null}
      <YulaGlyph
        interactionRotation={glyphRotation}
        frame={frame}
        portalTexture={portalActive ? target.texture : null}
        tier={tier}
      />
    </>
  );
}

export default VisionServicePortal;
