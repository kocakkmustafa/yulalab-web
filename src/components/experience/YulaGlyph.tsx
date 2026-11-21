"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  type Group,
  DataTexture,
  Euler,
  ExtrudeGeometry,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  ShaderMaterial,
  Shape,
  Quaternion,
  Texture,
  Vector2,
  Vector3,
} from "three";
import { glyphReadingVisibility, smoothstep, segmentProgress, STAGES } from "./timeline";
import { timelineProgressForScroll } from "./storyboard";
import { composeGlyphRotation } from "./instruments";
import { RefractGlass } from "./RefractGlass";
import { holoRibbonState } from "./HoloRibbon";
import { glyphViewportPose, heroSlotMix, viewportMobileMix } from "./layout";
import { HERO_PLANE_HEIGHT, HERO_PLANE_Z, heroSlot } from "./hero-slot";
import type { QualityTier, TimelineFrame, Vec3 } from "./types";

// W7 BT8: reference storyboard boundaries (114 px works_intro, 1032 px works of a 6422 px works_outro) laid on our
// desktop scroll budget (about 21750 px of travel, works_outro 7400 px): the turn starts about 131 px in and runs
// on the weaker works return force from about 1190 px.
const WORKS_INTRO_START = timelineProgressForScroll(131 / 21750);
const WORKS_MAIN_START = timelineProgressForScroll(1189 / 21750);

export type YulaGlyphProps = {
  frame: TimelineFrame;
  interactionRotation?: Vec3;
  tier: QualityTier;
  portalTexture?: Texture | null;
};

const CAUSTIC_VERTEX_SHADER = `
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  void main() {
    vLocalPosition = position;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CAUSTIC_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uGlassMix;
  uniform float uHeroMix;
  uniform float uPortal;
  varying vec3 vLocalPosition;
  varying vec3 vViewNormal;

  float spectralShift(vec3 point) {
    return point.y * 0.18 - point.x * 0.11;
  }

  void main() {
    float diagonal = 0.5 + 0.5 * sin(
      vLocalPosition.x * 5.6 + vLocalPosition.y * 7.8 - vLocalPosition.z * 10.0 + uTime * 0.62
    );
    diagonal = pow(diagonal, 12.0);

    float sweepAxis = vLocalPosition.x * 0.82 - vLocalPosition.y * 0.58;
    float sweepCenter = sin(uTime * 0.27) * 0.42;
    float sweep = exp(-pow((sweepAxis - sweepCenter) * 3.4, 2.0));
    float facet = pow(0.5 + 0.5 * sin(vLocalPosition.y * 12.0 - uTime * 0.34), 18.0);
    float rim = pow(1.0 - abs(vViewNormal.z), 2.4);

    float chroma = 0.5 + 0.5 * sin(
      vLocalPosition.x * 4.2 - vLocalPosition.y * 2.6 + uTime * 0.18
    );
    vec3 cyan = vec3(0.38, 0.7, 1.0);
    vec3 magenta = vec3(0.86, 0.35, 1.0);
    // Neutral glass: colour appears only as a thin spectrum along the rims
    // and facet glints, the way dispersion splits a white edge highlight.
    vec3 spectrum = 0.5 + 0.5 * cos(6.2832 * (chroma + spectralShift(vLocalPosition) + vec3(0.0, 0.33, 0.67)));
    vec3 color = mix(vec3(0.92), spectrum, clamp(rim * 0.9 + facet * 0.35, 0.0, 1.0));
    float heroWhite = uHeroMix * clamp(sweep * 0.82 + rim * 0.42 + diagonal * 0.24, 0.0, 1.0);
    color = mix(color, vec3(1.0), heroWhite);

    float portalAxis = vLocalPosition.y * 0.56 + 0.5;
    float portalNoise = 0.08 * sin(vLocalPosition.x * 13.0 + vLocalPosition.z * 17.0 + uTime * 0.2);
    float portal = smoothstep(0.92 - uPortal, 1.04 - uPortal, portalAxis + portalNoise) * uPortal;
    color = mix(color, mix(cyan, magenta, chroma), portal * 0.72);

    // W7 CY8: the four white glints (diagonal, sweep, facet, rim) are gone; only the VISION band is left.
    float energy = portal * 0.16;
    
    gl_FragColor = vec4(color * (1.1 + diagonal * 1.6), energy * uGlassMix);
  }
`;

const PORTAL_FRAGMENT_SHADER = `
  uniform sampler2D uPortalTexture;
  uniform vec2 uViewport;
  uniform float uReveal;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vLocalPosition;

  float portalNoise(vec3 point) {
    return 0.5 + 0.5 * sin(
      point.x * 11.0 + sin(point.y * 8.0 - uTime * 0.17) * 2.1 + point.z * 17.0
    );
  }

  void main() {
    vec2 screenUv = gl_FragCoord.xy / max(uViewport, vec2(1.0));
    vec4 portal = texture2D(uPortalTexture, screenUv);
    float coordinate = vLocalPosition.y * 0.5 + 0.5;
    float noise = (portalNoise(vLocalPosition) - 0.5) * 0.2;
    float threshold = 1.08 - uReveal * 1.34;
    float wipe = smoothstep(threshold - 0.075, threshold + 0.075, coordinate + noise);
    wipe *= smoothstep(0.005, 0.08, uReveal);
    vec2 edgeDistance = min(screenUv, vec2(1.0) - screenUv);
    float targetFeather = smoothstep(0.0, 0.065, min(edgeDistance.x, edgeDistance.y));
    float scan = 0.96 + 0.04 * sin(screenUv.y * 420.0 + uTime * 0.38);
    gl_FragColor = vec4(portal.rgb * scan, portal.a * wipe * targetFeather * uOpacity);
    #include <colorspace_fragment>
  }
`;

const VISION_LIGHT_FRAGMENT_SHADER = `
  uniform float uOpacity;
  uniform float uPhase;
  varying vec3 vLocalPosition;

  vec3 spectrum(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
  }
  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // The light lives on the glyph's own surface, so the Y is the mask: a
    // diagonal band in glyph space that never leaves the letter.
    float axis = vLocalPosition.x * 0.8 + vLocalPosition.y * 0.6;
    float center = (uPhase - 0.5) * 1.5;
    float across = (axis - center) / (0.15 * mix(0.97, 0.72, smoothstep(0.15, 0.7, uPhase))); // W7 CY16: thinner in the second half
    float band = smoothstep(1.0, 0.55, abs(across));
    float t = across * 0.5 + 0.5 + vLocalPosition.y * 0.35;
    vec3 colour = mix(spectrum(t), vec3(1.0), 0.22);
    colour -= grain(gl_FragCoord.xy) * 0.08;
    gl_FragColor = vec4(colour, band * uOpacity);
  }
`;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function makeYShape(): Shape {
  const shape = new Shape();
  shape.moveTo(-0.95, 0.9);
  shape.lineTo(-0.43, 0.9);
  shape.lineTo(0, 0.27);
  shape.lineTo(0.43, 0.9);
  shape.lineTo(0.95, 0.9);
  shape.lineTo(0.27, -0.08);
  shape.lineTo(0.27, -0.9);
  shape.lineTo(-0.27, -0.9);
  shape.lineTo(-0.27, -0.08);
  shape.closePath();
  return shape;
}

export function YulaGlyph({ frame, tier, portalTexture = null, interactionRotation = [0, 0, 0] }: YulaGlyphProps) {
  const viewportSize = useThree((state) => state.size);
  const renderer = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const glyphGroup = useRef<Group>(null);
  // W7 CY1 / F9: pointer tilt (reference): velocity of the eased pointer pushes pitch/yaw, then decays. Desktop only.
  const tilt = useRef({ tx: 0, ty: 0, cx: 0, cy: 0, ex: 0, ey: 0 });
  // W7 CY4: scroll-velocity spin (reference): rotY -= clamp(scroll px per frame, 30) * 0.001, plus a slow drift
  // once the works section opens; it relaxes back at 2 /s in the opening and 0.1 /s once works rotates.
  const spin = useRef({ y: 0, lastScroll: -1, value: 0 });
  // W7 BT5: reference rotation model. Quaternion q, angular velocity e (Euler x,y), smoothed pointer
  // velocity v and smoothed scroll velocity s; second order, so the settle lag and the return arc come from it.
  const rig = useRef({ q: new Quaternion(), e: new Euler(0, 0, 0), euler: new Euler(), base: new Quaternion(), step: new Quaternion(), identity: new Quaternion(), px: 0, py: 0, vx: 0, vy: 0, s: 0, wrP: 0, rf: 2, scrollE: new Euler(), scrollQ: new Quaternion(), init: false });
  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches) return undefined;
    const onMove = (event: MouseEvent) => {
      tilt.current.tx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      tilt.current.ty = -((event.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  const causticMaterial = useRef<ShaderMaterial | null>(null);
  const portalMaterial = useRef<ShaderMaterial | null>(null);
  const geometry = useMemo(() => {
    const high = tier === "high";
    const medium = tier === "medium";
    const result = new ExtrudeGeometry(makeYShape(), {
      depth: 0.28,
      steps: 1,
      curveSegments: high ? 12 : medium ? 8 : 4,
      bevelEnabled: true,
      bevelThickness: 0.075,
      bevelSize: 0.065,
      bevelOffset: 0,
      bevelSegments: high ? 6 : medium ? 4 : 2,
    });
    result.center();
    result.computeVertexNormals();
    return result;
  }, [tier]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Trace the two faces of our own Y, rather than every bevel seam. Nine
  // vertices per face remain legible in the light room at every quality tier.
  const contour = useMemo(() => new BufferGeometry().setFromPoints(
    makeYShape().getPoints().slice(0, -1).map((point) => new Vector3(point.x, point.y, 0)),
  ), []);
  useEffect(() => () => contour.dispose(), [contour]);

  // Own deterministic polish variation: a tiny repeating height field bends
  // broad studio reflections without changing the Y silhouette or its mesh.
  const chromeBump = useMemo(() => {
    const size = 128;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size * Math.PI * 2;
        const v = y / size * Math.PI * 2;
        const height = 0.5 + 0.18 * Math.sin(u * 2 + Math.sin(v * 3))
          + 0.1 * Math.sin(v * 4 + u);
        const value = Math.round(height * 255);
        const offset = (y * size + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
        pixels[offset + 3] = 255;
      }
    }
    const texture = new DataTexture(pixels, size, size, RGBAFormat);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.minFilter = texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }, []);
  useEffect(() => () => chromeBump.dispose(), [chromeBump]);

  const rotation = composeGlyphRotation(frame, interactionRotation);
  const whiteMix = frame.glyph.outlineMix;
  const outlineColor = useMemo(
    () => new Color("#ffffff").lerp(new Color("#16171a"), smoothstep(segmentProgress(frame.world.whiteMix, 0.12, 0.38))),
    [frame.world.whiteMix],
  );
  const readingVisibility = glyphReadingVisibility(frame);
  // Hand the portal to the readable SERVICE media, then keep the emblem
  // retired through the closing wordmark/contact.
  const closingHandoff = 1 - smoothstep(segmentProgress(frame.world.closingDraw, 0, 0.58));
  // W1D-F H1-e: once the first portfolio card arrives the glass Y leaves the stage (it would sit over the
  // product icon); it returns shortly before the proof stage, where the glyph is part of the story again.
  // W7 CY6 (founder decision "a"): the Y stays visible behind the portfolio cards (cards draw in front).
  const portfolioHide = 0;
  const closingVisibility = closingHandoff
    * (1 - frame.world.serviceIn) * readingVisibility * (1 - portfolioHide);
  const bodyColor = useMemo(
    () => new Color("#ffffff").lerp(new Color("#f8f7f2"), whiteMix),
    [whiteMix],
  );
  const bodyOpacity = (1 - whiteMix * 0.94) * closingVisibility;
  // The constrained tier uses alpha, not an extra transmission render pass.
  // This is a light transparent approximation; physical refraction stays in
  // the existing medium/high material.
  // W7 CY9: the glass shows the bent background copy, so the opaque fallback body steps aside as the glass comes in.
  const fallbackOpacity = bodyOpacity * (1 - frame.glyph.glassMix);
  const glassVisible = frame.glyph.glassMix > 0.015 && closingVisibility > 0.01;
  const fringeOpacity =
    frame.glyph.glassMix * (tier === "low" ? 0.006 : 0.004) * closingVisibility;
  const outlineOpacity = (0.025 + Math.max(whiteMix, frame.world.whiteMix) * 0.625) * closingVisibility;
  const viewportPose = glyphViewportPose(
    frame.progress,
    viewportSize.width / Math.max(1, viewportSize.height),
    viewportSize.width,
  );
  // W1D: in the opening the glass Y is the first letter of the word: same cap height, same slot.
  const slotMix = heroSlotMix(frame.progress);
  const slotPose = useMemo(() => {
    const planeWidth = 14.2 * (1 - viewportMobileMix(viewportSize.width) * 0.56);
    // W7 CY5: the slot is a fixed screen position. Its direction is taken in the hero camera's frame and carried
    // into the current camera's frame, so the Y keeps the same screen spot and height while the camera moves.
    const planeX = heroSlot.x * planeWidth;
    const planeY = 0.1 + viewportPose.offset[1] * frame.overlay.hero + heroSlot.y * HERO_PLANE_HEIGHT;
    const gz = frame.glyph.position[2];
    const basis = (pos: readonly number[], target: readonly number[]) => {
      const f = new Vector3(target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]).normalize();
      const r = new Vector3().crossVectors(f, new Vector3(0, 1, 0)).normalize();
      const u = new Vector3().crossVectors(r, f).normalize();
      return { f, r, u };
    };
    const heroPos = [0, 0.25, 11.5] as const;
    const hb = basis(heroPos, [0, 0.1, 0]);
    const d = new Vector3(planeX - heroPos[0], planeY - heroPos[1], HERO_PLANE_Z - heroPos[2]);
    const dr = d.dot(hb.r);
    const du = d.dot(hb.u);
    const df = d.dot(hb.f);
    const heroS = (gz - heroPos[2]) / d.z;
    const heroDepth = heroS * df;
    const heroScale = (0.95 * heroSlot.cap * HERO_PLANE_HEIGHT * ((heroPos[2] - gz) / (heroPos[2] - HERO_PLANE_Z))) / 1.8;
    const cb = basis(frame.camera.position, frame.camera.target);
    // W7 CY5 (BT t2): the screen position is fov dependent (the camera narrows 39 to 35), so the lateral parts and the
    // size carry tan(fov / 2) / tan(heroFov / 2) to keep the same screen spot and height.
    const heroFov = lerp(39, 52, viewportMobileMix(viewportSize.width));
    const fovK = Math.tan((frame.camera.fov * Math.PI) / 360) / Math.tan((heroFov * Math.PI) / 360);
    const dir = new Vector3().addScaledVector(cb.r, dr * fovK).addScaledVector(cb.u, du * fovK).addScaledVector(cb.f, df);
    const cpz = frame.camera.position[2];
    const sCur = Math.abs(dir.z) > 1e-4 ? (gz - cpz) / dir.z : heroS;
    return {
      x: frame.camera.position[0] + dir.x * sCur,
      y: frame.camera.position[1] + dir.y * sCur,
      scale: heroScale * ((sCur * df) / heroDepth) * fovK,
    };
  }, [frame.camera.position, frame.camera.target, frame.camera.fov, frame.glyph.position, frame.overlay.hero, viewportPose.offset, viewportSize.width]);
  const position = useMemo(
    () => [
      lerp(frame.glyph.position[0] + viewportPose.offset[0], slotPose.x, slotMix),
      lerp(frame.glyph.position[1] + viewportPose.offset[1], slotPose.y, slotMix),
      frame.glyph.position[2] + viewportPose.offset[2],
    ] as const,
    [frame.glyph.position, viewportPose.offset, slotPose, slotMix],
  );
  // The wordmark plane squeezes the letters on narrow viewports (plane narrower than the 2:1 texture):
  // the Y takes the same horizontal squeeze while it stands in for the first letter.
  const slotSqueeze = Math.min(1, (14.2 * (1 - viewportMobileMix(viewportSize.width) * 0.56)) / 10.4);
  // W1D-D H1-a: once free of the slot the glass Y grows in the middle of the screen while it turns, then settles
  // back to the portfolio hand-off scale.
  // W7 CY5: no growth in the middle of the screen (founder decision "a").
  const heroGrow = 1;
  const glyphScale = lerp(frame.glyph.scale * viewportPose.scaleMultiplier * heroGrow, slotPose.scale, slotMix);
  const glyphScaleXYZ = [glyphScale * lerp(1, slotSqueeze, slotMix), glyphScale, glyphScale] as const;
  const causticUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGlassMix: { value: 1 },
      uHeroMix: { value: 0 },
      uPortal: { value: 0 },
    }),
    [],
  );
  const visionLightUniforms = useMemo(() => ({ uOpacity: { value: 0 }, uPhase: { value: 0 } }), []);
  const visionLightMaterial = useRef<ShaderMaterial>(null);
  const portalUniforms = useMemo(
    () => ({
      uPortalTexture: { value: null },
      uViewport: { value: new Vector2(1, 1) },
      uReveal: { value: 0 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );
  const drawingBufferSize = useMemo(() => new Vector2(), []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta || 1 / 60, 0.1);
    const t = tilt.current;
    const r = rig.current;
    if (!r.init) { r.px = t.tx; r.py = t.ty; r.init = true; }
    // 1-3: smoothed pointer velocity drives the angular velocity, strongest near the screen centre.
    const follow = Math.min(1, dt * 10);
    r.vx += (t.tx - r.px - r.vx) * follow;
    r.vy += (t.ty - r.py - r.vy) * follow;
    r.px = t.tx;
    r.py = t.ty;
    const m = 0.0595 * Math.max(0, 1 - Math.hypot(t.tx, t.ty) * 1.5); // BT6: the reference applies the hover velocity per event
    // W7 BT8 worksRotate: 0 in the key visual, eases to 1 over 1 s (sigmoid 6) while the works section is on screen.
    // Tied to the works stage bounds (works_intro = WORKS_INTRO_START, works_outro = STAGES.portfolio end), not to the
    // backdrop mix: the reference starts the turn 114 px into the page and ends it at the portfolio / proof hand-off.
    const inWorks = frame.progress >= WORKS_INTRO_START && frame.progress < STAGES.portfolio[1];
    r.wrP = Math.min(1, Math.max(0, r.wrP + (inWorks ? dt : -dt)));
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-6 * (x * 2 - 1)));
    const worksRotate = r.wrP <= 0 ? 0 : (sigmoid(r.wrP) - sigmoid(0)) / (sigmoid(1) - sigmoid(0));
    // BT8: the reference's returnToOriginForce follows the stage (key visual / after works 2, works_intro 0.4, works 0.1);
    // it eases between those values over about 1 s like wr, so the turn can run on instead of locking at an equilibrium.
    const returnForce = frame.progress >= STAGES.portfolio[1] ? 2 : frame.progress >= WORKS_MAIN_START ? 0.1 : inWorks ? 0.4 : 2;
    // BT9: eases over about a quarter second (not the 1 s of wr): at 1600 px/s the works stage is entered within 0.1 s, and a
    // slow ease left the strong key-visual pull on for the first 1500 px (yaw speed half of the reference).
    r.rf += Math.max(-8 * dt, Math.min(8 * dt, returnForce - r.rf));
    r.e.x -= r.vy * m * (1 - worksRotate * 0.7);
    r.e.y += r.vx * m;
    // 4: scroll velocity (px per 60 Hz frame, scaled to the reference's units) adds to the yaw velocity.
    const scrollNow = typeof window === "undefined" ? 0 : window.scrollY;
    const sp = spin.current;
    const scrolled = sp.lastScroll < 0 ? 0 : scrollNow - sp.lastScroll;
    sp.lastScroll = scrollNow;
    // BT6: the scroll turn is applied to q directly (scale 1.0, smoothing min(1, 5 dt)); it stays out of e.
    const lenisVelocity = (scrolled * (1 / 60)) / dt;
    r.s += (Math.max(-30, Math.min(30, lenisVelocity)) - r.s) * Math.min(1, dt * 5);
    if (Math.abs(r.s) < 0.02) r.s = 0;
    // The constant works turn (0.5 rad/s) goes straight to q like the scroll term; in e it piled up.
    r.scrollE.set(0, -r.s * 0.001 - dt * 0.5 * worksRotate, 0);
    r.scrollQ.setFromEuler(r.scrollE);
    r.q.premultiply(r.scrollQ);
    // 5-7: damp the velocity, integrate it into q, and pull q back to identity by the short way.
    const damp = 1 - dt;
    r.e.x *= damp;
    r.e.y *= damp;
    r.step.setFromEuler(r.e);
    r.q.premultiply(r.step);
    r.q.slerp(r.identity, Math.min(1, dt * r.rf * (1 - worksRotate * 0.8)));
    // BT6: demand rendering must keep drawing until q is back on the identity and the motion has died.
    if (r.q.angleTo(r.identity) > 0.0017 || Math.abs(r.e.x) + Math.abs(r.e.y) > 1e-5 || Math.abs(r.s) > 0.05) invalidate();
    // W7 CY2: no idle sway; the hero pose and the single-letter placement stay as the base rotation under q.
    r.euler.set(rotation[0], rotation[1], rotation[2]);
    r.base.setFromEuler(r.euler);
    if (glyphGroup.current) glyphGroup.current.quaternion.copy(r.q).multiply(r.base);
    // Measurement hook (no effect unless a test page installs the array): per-frame rotation terms for the BT9 comparison.
    const rigLog = typeof window === "undefined" ? undefined : (window as unknown as { __yulaRigLog?: number[][] }).__yulaRigLog;
    if (rigLog && glyphGroup.current) {
      const q = glyphGroup.current.quaternion;
      rigLog.push([time, window.scrollY, frame.progress, r.wrP, r.rf, r.s, Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x))]);
    }
    chromeBump.offset.set(Math.sin(time * 0.17) * 0.08, time * 0.012);
    if (causticMaterial.current) {
      causticMaterial.current.uniforms.uTime.value = frame.progress * 18 + time * 0.72;
      causticMaterial.current.uniforms.uGlassMix.value =
        frame.glyph.glassMix * closingVisibility * (0.65 + frame.world.visionPortal * 0.35)
        * (tier === "low" ? 0.48 : 1);
      causticMaterial.current.uniforms.uHeroMix.value = frame.overlay.hero;
      causticMaterial.current.uniforms.uPortal.value = frame.world.visionPortal;
    }

    if (visionLightMaterial.current) {
      const ribbon = holoRibbonState(frame);
      visionLightMaterial.current.uniforms.uOpacity.value = ribbon.opacity * 0.9;
      visionLightMaterial.current.uniforms.uPhase.value = Math.min(1, Math.max(0, ribbon.sweep));
    }

    if (portalMaterial.current) {
      renderer.getDrawingBufferSize(drawingBufferSize);
      portalMaterial.current.uniforms.uPortalTexture.value = portalTexture;
      portalMaterial.current.uniforms.uViewport.value.copy(drawingBufferSize);
      portalMaterial.current.uniforms.uReveal.value = frame.world.visionPortal;
      portalMaterial.current.uniforms.uOpacity.value = frame.world.servicePortalOpacity;
      portalMaterial.current.uniforms.uTime.value = frame.progress * 18 + time * 0.72;
    }
  });

  return (
    <group
      ref={glyphGroup}
      position={position}
      rotation={rotation}
      scale={glyphScaleXYZ}
      visible={closingVisibility > 0.001}
    >
      <mesh
        castShadow={tier !== "low"}
        geometry={geometry}
        receiveShadow
        visible={tier === "low" || !glassVisible}
      >
        <meshPhysicalMaterial
          attenuationColor="#ffffff"
          bumpMap={chromeBump}
          bumpScale={0.012}
          attenuationDistance={1.6}
          clearcoat={0.92}
          clearcoatRoughness={0.15}
          color={bodyColor}
          depthWrite={fallbackOpacity > 0.55}
          envMapIntensity={1.25}
          ior={1.35}
          metalness={0.04}
          opacity={fallbackOpacity}
          roughness={tier === "low" ? 0.2 : 0.15}
          thickness={0}
          transmission={0}
          transparent
        />
      </mesh>

      {tier !== "low" ? (
        <RefractGlass geometry={geometry} opacity={bodyOpacity * frame.glyph.glassMix} visible={glassVisible} />
      ) : null}

      <lineLoop geometry={contour} position={[0, 0, 0.216]} renderOrder={5}>
        <lineBasicMaterial
          color={outlineColor}
          depthTest={false}
          depthWrite={false}
          opacity={outlineOpacity}
          toneMapped={false}
          transparent
        />
      </lineLoop>
      <lineLoop geometry={contour} position={[0, 0, -0.216]} renderOrder={5}>
        <lineBasicMaterial
          color={outlineColor}
          depthTest={false}
          depthWrite={false}
          opacity={outlineOpacity * 0.28}
          toneMapped={false}
          transparent
        />
      </lineLoop>

      <mesh
        geometry={geometry}
        position={[0, 0, 0.012]}
        renderOrder={3}
        scale={0.986}
        visible={glassVisible}
      >
        <shaderMaterial
          ref={causticMaterial}
          blending={AdditiveBlending}
          depthTest
          depthWrite={false}
          fragmentShader={CAUSTIC_FRAGMENT_SHADER}
          toneMapped={false}
          transparent
          uniforms={causticUniforms}
          vertexShader={CAUSTIC_VERTEX_SHADER}
        />
      </mesh>

      <mesh geometry={geometry} position={[0, 0, 0.03]} renderOrder={4} scale={0.96}>
        <shaderMaterial
          ref={visionLightMaterial}
          depthTest={false}
          depthWrite={false}
          fragmentShader={VISION_LIGHT_FRAGMENT_SHADER}
          toneMapped={false}
          transparent
          uniforms={visionLightUniforms}
          vertexShader={CAUSTIC_VERTEX_SHADER}
        />
      </mesh>

      {portalTexture && frame.world.servicePortalOpacity > 0.001 ? (
        <mesh
          geometry={geometry}
          position={[0, 0, 0.02]}
          renderOrder={4}
          scale={0.992}
        >
          <shaderMaterial
            ref={portalMaterial}
            depthTest={false}
            depthWrite={false}
            fragmentShader={PORTAL_FRAGMENT_SHADER}
            toneMapped={false}
            transparent
            uniforms={portalUniforms}
            vertexShader={CAUSTIC_VERTEX_SHADER}
          />
        </mesh>
      ) : null}

      <mesh
        geometry={geometry}
        position={[-0.014, 0, -0.008]}
        scale={1.018}
        visible={glassVisible}
      >
        <meshBasicMaterial
          color="#cad3df"
          depthWrite={false}
          opacity={fringeOpacity}
          toneMapped={false}
          transparent
          wireframe
        />
      </mesh>
      <mesh
        geometry={geometry}
        position={[0.014, 0, 0.008]}
        scale={1.026}
        visible={glassVisible}
      >
        <meshBasicMaterial
          color="#dcdde0"
          depthWrite={false}
          opacity={fringeOpacity * 0.82}
          toneMapped={false}
          transparent
          wireframe
        />
      </mesh>
    </group>
  );
}
