"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type Texture,
  Vector2,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";

/**
 * W1D-F H1-d: desktop mouse fluid. A small stable-fluids solver of our own (velocity only), run on the
 * measured settings of the reference (REA section 5): 256 grid, 4 pressure iterations, curl 0.02, velocity
 * dissipation 0.99. The result is read by the room ground (tile drift and colour shift) and by the glass Y.
 * Written from the parameter table with the textbook scheme; no code taken from the reference.
 */
export const FLUID_PARAMS = {
  grid: 256,
  iterations: 4,
  curl: 0.02,
  dissipation: 0.99,
  pressure: 0,
  splatRadius: 0.02,
  splatForce: 32000,
  /** Velocity (texels per second) that reads as 1.0 in the ground and glass shaders. */
  displayScale: 4, // W7 C tur 3: x4 power (peak was 5.4 grey, reference 45-67)
} as const;

/** Shared read side: the newest velocity texture and how strongly it should show (0 when idle or unsupported). */
export const fluidShared: { texture: Texture | null; mix: number } = { texture: null, mix: 0 };

const FULLSCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const HEAD = /* glsl */ `
  varying vec2 vUv;
  uniform vec2 uTexel;
`;

const SPLAT = /* glsl */ `${HEAD}
  uniform sampler2D uTarget; uniform vec2 uPoint; uniform vec2 uForce; uniform float uAspect; uniform float uRadius;
  void main() {
    // W7 F4: reference brush, w = smoothstep(0.01 + 0.1 * min(0.5, pv), 0.0, |d|); radius 0.01-0.06 of the height.
    vec2 d = vUv - uPoint; d.x *= uAspect;
    float g = smoothstep(uRadius, 0.0, length(d));
    gl_FragColor = vec4(texture2D(uTarget, vUv).xy + uForce * g, 0.0, 1.0);
  }
`;

const ADVECT = /* glsl */ `${HEAD}
  uniform sampler2D uVelocity; uniform float uDt; uniform float uDissipation;
  void main() {
    vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexel;
    gl_FragColor = vec4(uDissipation * texture2D(uVelocity, coord).xy, 0.0, 1.0);
  }
`;

const CURL = /* glsl */ `${HEAD}
  uniform sampler2D uVelocity;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
    gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
  }
`;

const VORTICITY = /* glsl */ `${HEAD}
  uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float uCurlStrength; uniform float uDt;
  void main() {
    float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
    float C = texture2D(uCurl, vUv).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    force /= length(force) + 0.0001;
    force *= uCurlStrength * C;
    force.y *= -1.0;
    vec2 velocity = texture2D(uVelocity, vUv).xy + force * uDt;
    gl_FragColor = vec4(clamp(velocity, -4.0, 4.0), 0.0, 1.0);
  }
`;

const DIVERGENCE = /* glsl */ `${HEAD}
  uniform sampler2D uVelocity;
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
    gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
  }
`;

const PRESSURE = /* glsl */ `${HEAD}
  uniform sampler2D uPressure; uniform sampler2D uDivergence; uniform float uDecay;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float D = texture2D(uDivergence, vUv).x;
    gl_FragColor = vec4((L + R + B + T - D) * 0.25 * uDecay, 0.0, 0.0, 1.0);
  }
`;

const GRADIENT = /* glsl */ `${HEAD}
  uniform sampler2D uPressure; uniform sampler2D uVelocity;
  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    gl_FragColor = vec4(texture2D(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
  }
`;

function makeTarget(width: number, height: number): WebGLRenderTarget {
  return new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

class Pair {
  read: WebGLRenderTarget;
  write: WebGLRenderTarget;
  constructor(width: number, height: number) { this.read = makeTarget(width, height); this.write = makeTarget(width, height); }
  swap() { const t = this.read; this.read = this.write; this.write = t; }
  dispose() { this.read.dispose(); this.write.dispose(); }
}

export class FluidSim {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: Mesh;
  private readonly velocity: Pair;
  private readonly pressure: Pair;
  private readonly curl: WebGLRenderTarget;
  private readonly divergence: WebGLRenderTarget;
  private readonly programs: Record<"splat" | "advect" | "curl" | "vorticity" | "divergence" | "pressure" | "gradient", ShaderMaterial>;

  constructor(aspect = 1) {
    const width = FLUID_PARAMS.grid;
    const height = Math.max(32, Math.floor(FLUID_PARAMS.grid / Math.max(0.5, aspect)));
    const texel = new Vector2(1 / width, 1 / height);
    const make = (fragmentShader: string, uniforms: Record<string, { value: unknown }>) =>
      new ShaderMaterial({ vertexShader: FULLSCREEN_VERTEX, fragmentShader, uniforms: { uTexel: { value: texel }, ...uniforms }, depthTest: false, depthWrite: false });
    this.programs = {
      splat: make(SPLAT, { uTarget: { value: null }, uPoint: { value: new Vector2() }, uForce: { value: new Vector2() }, uAspect: { value: 1 }, uRadius: { value: FLUID_PARAMS.splatRadius } }),
      advect: make(ADVECT, { uVelocity: { value: null }, uDt: { value: 0 }, uDissipation: { value: 1 } }),
      curl: make(CURL, { uVelocity: { value: null } }),
      vorticity: make(VORTICITY, { uVelocity: { value: null }, uCurl: { value: null }, uCurlStrength: { value: 0 }, uDt: { value: 0 } }),
      divergence: make(DIVERGENCE, { uVelocity: { value: null } }),
      pressure: make(PRESSURE, { uPressure: { value: null }, uDivergence: { value: null }, uDecay: { value: 1 } }),
      gradient: make(GRADIENT, { uPressure: { value: null }, uVelocity: { value: null } }),
    };
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.programs.splat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.velocity = new Pair(width, height);
    this.pressure = new Pair(width, height);
    this.curl = makeTarget(width, height);
    this.divergence = makeTarget(width, height);
  }

  get texture(): Texture { return this.velocity.read.texture; }

  private pass(renderer: WebGLRenderer, program: ShaderMaterial, target: WebGLRenderTarget) {
    this.quad.material = program;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  /** One solver step; `splat` is the pointer position (uv) and its velocity in texels per second. */
  step(renderer: WebGLRenderer, dt: number, aspect: number, splat: { x: number; y: number; vx: number; vy: number; radius: number } | null) {
    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousShadow = renderer.shadowMap.autoUpdate;
    renderer.autoClear = false;
    renderer.shadowMap.autoUpdate = false;
    const p = this.programs;

    if (splat) {
      p.splat.uniforms.uTarget.value = this.velocity.read.texture;
      p.splat.uniforms.uPoint.value.set(splat.x, splat.y);
      p.splat.uniforms.uForce.value.set(splat.vx, splat.vy);
      p.splat.uniforms.uAspect.value = aspect;
      p.splat.uniforms.uRadius.value = splat.radius;
      this.pass(renderer, p.splat, this.velocity.write);
      this.velocity.swap();
    }

    p.curl.uniforms.uVelocity.value = this.velocity.read.texture;
    this.pass(renderer, p.curl, this.curl);

    p.vorticity.uniforms.uVelocity.value = this.velocity.read.texture;
    p.vorticity.uniforms.uCurl.value = this.curl.texture;
    // The reference curl value (0.02) is in its own units; this scale keeps the swirl visible at our force.
    p.vorticity.uniforms.uCurlStrength.value = FLUID_PARAMS.curl;
    p.vorticity.uniforms.uDt.value = dt * 60;
    this.pass(renderer, p.vorticity, this.velocity.write);
    this.velocity.swap();

    p.divergence.uniforms.uVelocity.value = this.velocity.read.texture;
    this.pass(renderer, p.divergence, this.divergence);

    p.pressure.uniforms.uDivergence.value = this.divergence.texture;
    p.pressure.uniforms.uDecay.value = 1;
    for (let i = 0; i < FLUID_PARAMS.iterations; i++) {
      p.pressure.uniforms.uPressure.value = this.pressure.read.texture;
      p.pressure.uniforms.uDecay.value = i === 0 ? FLUID_PARAMS.pressure : 1;
      this.pass(renderer, p.pressure, this.pressure.write);
      this.pressure.swap();
    }

    p.gradient.uniforms.uPressure.value = this.pressure.read.texture;
    p.gradient.uniforms.uVelocity.value = this.velocity.read.texture;
    this.pass(renderer, p.gradient, this.velocity.write);
    this.velocity.swap();

    p.advect.uniforms.uVelocity.value = this.velocity.read.texture;
    p.advect.uniforms.uDt.value = dt * 60;
    p.advect.uniforms.uDissipation.value = Math.pow(FLUID_PARAMS.dissipation, dt * 60);
    this.pass(renderer, p.advect, this.velocity.write);
    this.velocity.swap();

    renderer.setRenderTarget(previousTarget);
    renderer.autoClear = previousAutoClear;
    renderer.shadowMap.autoUpdate = previousShadow;
  }

  dispose() {
    this.velocity.dispose(); this.pressure.dispose(); this.curl.dispose(); this.divergence.dispose();
    this.quad.geometry.dispose();
    Object.values(this.programs).forEach((program) => program.dispose());
  }
}

/**
 * Drives the solver from the pointer while the hero is on screen. `active` is false on mobile, in
 * reduced motion, past the opening, or when the GPU cannot render to half-float targets: then nothing is
 * allocated and the shared mix stays 0.
 */
export function MouseFluid({ active }: { active: boolean }) {
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);
  const sim = useRef<FluidSim | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, lastX: 0.5, lastY: 0.5, moved: false, lastMove: -10, cx: 0.5, cy: 0.5, ax: 0, ay: 0 });
  const supported = useMemo(() => {
    const context = gl.getContext();
    return Boolean(gl.capabilities.isWebGL2 && (context.getExtension("EXT_color_buffer_float") || context.getExtension("EXT_color_buffer_half_float")));
  }, [gl]);

  useEffect(() => {
    if (!active || !supported) return undefined;
    const onMove = (event: PointerEvent | MouseEvent) => {
      const state = pointer.current;
      state.x = event.clientX / Math.max(1, window.innerWidth);
      state.y = 1 - event.clientY / Math.max(1, window.innerHeight);
      if (state.lastMove < 0) { state.lastX = state.x; state.lastY = state.y; }
      state.moved = true;
      state.lastMove = performance.now() / 1000;
      invalidate();
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [active, supported, invalidate]);

  useEffect(() => {
    if (active && supported) return undefined;
    fluidShared.mix = 0;
    return undefined;
  }, [active, supported]);

  useEffect(() => () => {
    sim.current?.dispose();
    sim.current = null;
    fluidShared.texture = null;
    fluidShared.mix = 0;
  }, []);

  useFrame((state, delta) => {
    if (!active || !supported) return;
    if (!sim.current) {
      sim.current = new FluidSim(size.width / Math.max(1, size.height));
      fluidShared.texture = sim.current.texture;
    }
    const dt = Math.min(0.05, Math.max(1 / 240, delta));
    const pointerState = pointer.current;
    let splat: { x: number; y: number; vx: number; vy: number; radius: number } | null = null;
    // W7 F5: the brush follows an eased pointer; its velocity (signed power 1.6) accumulates, halves each frame,
    // is clamped to +-1 and scaled by 30 (force clamped to +-2 texels per frame).
    const aspect = size.width / Math.max(1, size.height);
    const follow = Math.min(1, dt * 10);
    const vx = pointerState.x - pointerState.cx;
    const vy = pointerState.y - pointerState.cy;
    pointerState.cx += vx * follow;
    pointerState.cy += vy * follow;
    const power = (v: number) => Math.sign(v) * Math.pow(Math.abs(v * 100), 1.6);
    pointerState.ax = Math.max(-1, Math.min(1, (pointerState.ax + power(vx)) * 0.5));
    pointerState.ay = Math.max(-1, Math.min(1, (pointerState.ay + power(vy)) * 0.5));
    const speed = Math.hypot(pointerState.ax, pointerState.ay);
    if (speed > 1e-4) {
      const pv = Math.min(1, Math.max(0, (speed - 0.01) / 0.99));
      const eased = pv * pv * (3 - 2 * pv);
      splat = {
        x: pointerState.cx,
        y: pointerState.cy,
        vx: Math.max(-2, Math.min(2, pointerState.ax * 30)),
        vy: Math.max(-2, Math.min(2, pointerState.ay * 30)) * aspect,
        radius: (0.01 + 0.1 * Math.min(0.5, eased)) * 1.85, // W7 F4: FWHM 31 -> about 57 px
      };
    }
    pointerState.moved = false;
    sim.current.step(state.gl, dt, aspect, splat);
    fluidShared.texture = sim.current.texture;
    fluidShared.mix = 1;
    // Keep drawing until the swirl has died down after the last movement.
    if (performance.now() / 1000 - pointerState.lastMove < 4) invalidate();
  }, -60);

  return null;
}
