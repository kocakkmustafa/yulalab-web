# Reference-Faithful 3D Homepage Design

**Date:** 2026-08-21
**Status:** Approved by founder
**Target:** `yulalab.com` localized home routes (`/` and `/en`)
**Reference:** Alche Studio reel/live-site choreography, adapted to YULA's real portfolio and truth registry

## 1. Product outcome

The homepage becomes a continuous, cinematic product journey rather than a stack of independently animated sections. It must communicate three things without weakening the existing truth contract:

1. YULA is an independent product lab that ships and operates real products.
2. Live/beta work and research directions are visibly different.
3. Every measurable claim remains tied to its source, scope, verification date, and freshness.

The result should match the reference's spatial rhythm—architectural loader, curved grid room, refractive monogram, camera-led portfolio, physical light/dark crossing, calm white manifesto, product dioramas, and technical closing—without copying Alche's branding or claiming unbuilt YULA interfaces.

## 2. Binding constraints

- Build from clean `origin/main`; do not read from or merge the Claude 3D prototype.
- Preserve every non-home route and the existing registry/claim/analytics contracts.
- Use only real screenshots already declared in `publicRegistry`.
- A research product never receives a fabricated product screen or shipped-style CTA.
- Canvas is decorative. All names, statuses, claims, links, and headings remain semantic DOM.
- `prefers-reduced-motion` and WebGL failure produce a complete static journey, not an empty fallback.
- Desktop and mobile use separate camera tracks; mobile is not a scaled desktop scene.
- No fake telemetry. HUD values are derived from actual renderer, scroll, material, and active-product state.
- Production is accepted only after unit, type, lint, claim, build, Playwright, accessibility, responsive, visual, and live-deploy checks.

## 3. Journey and timing

The scroll document is approximately `2520vh`. A fixed viewport contains one persistent WebGL canvas and one fixed semantic overlay. Normalized progress is the single source of motion truth.

| Progress | Beat | Spatial behavior | Semantic overlay |
|---|---|---|---|
| preload | Architectural loader | black field; axes, circles, thin Y construction; wireframe to glass | decoded system microcopy only; no marketing gate |
| 0.00–0.085 | Hero | camera enters curved violet grid room; giant YULA wordmark sits behind refractive Y | one H1, lab identity, current product notice, scroll cue |
| 0.085–0.505 | Portfolio | camera advances through eight physical card positions; side cards yaw away; active card is frontal; Y sits behind it | one project at a time; lifecycle, category, honest CTA, actual proof metadata |
| 0.505–0.575 | Proof morph | the same card meshes shrink/reflow into a proof ledger; Y crosses the card plane only during this handoff | source, scope, verified-at, expiry/freshness |
| 0.575–0.690 | White crossing | a white blade prism rises from below and the camera crosses it; environment, grid, text, and Y interpolate from one timeline | minimal crossing label, no section jump |
| 0.690–0.765 | Mission | sparse white blueprint chamber; outlined white Y | “Ship few products, and measure what they claim.” |
| 0.765–0.835 | Vision | color refracts along the outline edge | “The default for personal software should be the device, not the cloud.” |
| 0.835–0.955 | Values | four calm physical dioramas; camera orbits each | Transparency, Craft, Privacy, Science in canonical order |
| 0.955–1.000 | Closing | giant YULA collapses to a left-side Y; grid, axes, and circle draw in | trust links, contact, legal links, large copyright |

The loader runs automatically for roughly four seconds on the first home load in a browser session. Capture mode and reduced-motion skip it. Sound is opt-in and starts only after a user gesture.

## 4. Architecture

### 4.1 Server composition

`src/app/[locale]/page.tsx` remains a server component. It resolves locale copy, `ProjectConfig`, and `ProductPublicRecord` into a serializable `ExperienceProduct[]`. The client never invents lifecycle, screenshot, CTA, claim, or status data.

### 4.2 Client experience shell

`YulaExperience` owns:

- loader lifecycle;
- scroll/capture progress;
- quality tier and WebGL capability;
- optional procedural sound;
- semantic fixed overlay;
- static reduced-motion/error fallback;
- readiness markers used by browser QA.

It does not own Three.js scene details. The canvas is dynamically imported and isolated by an error boundary.

### 4.3 One progress pipeline

`useExperienceProgress` reads document scroll once per animation frame and exposes a normalized target. One critically damped interpolation produces the rendered progress. No component adds a second spring or wall-clock transition to scroll-owned properties.

Capture mode uses `?capture=1&progress=<0..1>&tier=<high|medium|low>` and returns the exact requested progress with the loader disabled. Loader QA can opt into `loader=1&loaderProgress=<0..1>` to freeze its own construction timeline. That makes both journey and loader screenshots deterministic.

### 4.4 Pure timeline

`evaluateTimeline(progress, mode)` is a pure function. It returns:

- active stage and local stage progress;
- active product index and product-local progress;
- desktop/mobile camera position and target;
- Y position, rotation, scale, and material mix;
- dark/white environment mix;
- proof and values indices;
- overlay visibility values.

Camera motion uses Catmull-Rom position tracks and separately interpolated look targets. The camera travels through the scene; the world is not translated wholesale past a fixed camera.

## 5. WebGL world

### 5.1 Curved room

A partial cylinder provides the grid room. Its shader draws major/minor lines with distance fade and interpolates purple-black to white-gray across the crossing. Layered halftone planes add depth without becoming fake interfaces. The large YULA wordmark is rendered behind the monogram so depth testing provides real occlusion.

### 5.2 YULA glyph

The central Y is built from beveled/extruded geometry and uses a tier-aware physical material:

- high: transmission, thickness, IOR 1.35, clearcoat, low-frequency roughness variation, environment refraction;
- medium: reduced samples/segments and transmission resolution;
- low: deterministic chrome/frost material with a Fresnel-like colored edge and no transmission pass.

Small cyan/magenta edge shells create controlled chromatic fringe. They are structural geometry, not a full-screen blur.

### 5.3 Portfolio field

Eight persistent card meshes share stable identities. During the portfolio beat they occupy an arc around the camera path. During proof they interpolate into a compact ledger grid; no second set of “proof cards” appears.

- Braavolabs and Burun Farkı planes load their registry-declared screenshots at natural aspect ratio.
- LifeOS uses an encrypted-core procedural object because the registry has no screenshot.
- Motion-family research cards use open wireframes and `NO PUBLIC BUILD` semantics.
- Texture failure affects only that card and falls back to a branded procedural surface.

### 5.4 Values dioramas

- Transparency: measured Burun Farkı surface and explicit source axis.
- Craft: Braavolabs audit/builder layers arranged as a physical build table.
- Privacy: LifeOS encrypted local core; never a fabricated app screen.
- Science: calibrated rings, samples, and confidence geometry for research.

### 5.5 Physical crossing and closing

The light transition is a real prism in the world plus a synchronized clear-color/theme interpolation. The camera crosses its plane over a long interval, so the white section is spatially earned. At closing, the Y moves left while technical axes and footer grid draw on; the semantic footer occupies the same composition.

## 6. Semantic overlay and interaction

- Exactly one visible H1 per locale.
- Project copy remains readable without WebGL.
- Active project links use existing internal routes and existing analytics semantics.
- Live/beta actions say “Explore”; research actions say “Read research brief”.
- Research visibly says `PUBLIC BUILD YOK` / `NO PUBLIC BUILD`.
- Proof copy shows `source`, `scope`, `verifiedAt`, `expiresAt`, and a client-calculated freshness state.
- Header includes Projects, Manifesto, Transparency, locale switch, and opt-in sound.
- Canvas is `aria-hidden`; interactive DOM is never placed inside the canvas.
- Focus order follows the journey's semantic order even when visual stages overlap.

Global Header/Footer render normally on every non-home route. On `/` and `/en`, the immersive experience supplies its own accessible header and closing footer so chrome is not duplicated.

## 7. Quality, performance, and failure policy

Initial quality uses DPR, viewport, WebGL capability, hardware concurrency, and device memory when available. Runtime frame monitoring may only downgrade:

`high → medium → low`

It never oscillates upward during the same visit. Capture mode pins the requested tier. Low tier removes expensive transmission and reduces geometry; it does not remove semantic content.

Failure boundaries:

- no WebGL: static journey;
- context lost: switch to static journey and announce no error to assistive tech;
- texture failure: per-card procedural fallback;
- slow asset load: DOM remains usable while the canvas suspends;
- JavaScript disabled: server-rendered essential identity and project links remain in the page markup.

## 8. Acceptance criteria

- Loader, hero, works, crossing, mission, vision, values, and closing each visually match the reference's composition and pacing at their deterministic checkpoints.
- Scrolling forward/backward keeps DOM, camera, Y, project card, and background synchronized.
- All eight products appear in canonical order with lifecycle honesty.
- Existing claim/source/freshness tests remain green; no source of truth is duplicated.
- Desktop 1440×900 and mobile 390×844 have dedicated, coherent compositions and no horizontal overflow.
- Reduced-motion contains all core headings/projects/links with no hidden text and no continuous animation.
- WebGL fallback contains the same core content and navigation.
- Serious/critical axe violations: 0.
- Production build, route suite, claim checks, and high-severity production audit pass.
- Remote `main` merge deploys successfully to Vercel and live `yulalab.com` is smoke-tested in both locales.
