/* eslint-disable @next/next/no-img-element -- the reader displays the complete original development capture. */
"use client";

import { text } from "@/lib/localized";
import type { Locale } from "@/lib/types";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import NextLink from "next/link";
import Image from "next/image";
import { track } from "@/lib/analytics/client";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { evidenceKindLabel } from "@/components/common/SourceStamp";
import { siteDate } from "@/lib/public-registry";
import type {
  ExperienceCopy,
  ExperienceProduct,
  ExperienceStage,
  QualityTier,
  TimelineFrame,
} from "./types";
import styles from "./Experience.module.css";
import { scrollProgressForTimeline } from "./storyboard";
import { ThemeControl } from "@/components/theme/ThemeControl";

type ExperienceOverlayProps = {
  copy: ExperienceCopy;
  products: ExperienceProduct[];
  frame: TimelineFrame;
  tier: QualityTier;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onLinearView: () => void;
};

type StageStyle = CSSProperties & {
  "--stage-opacity": number;
};

type PanelStyle = CSSProperties & {
  "--panel-opacity": number;
  "--panel-offset": number;
};

type WorksBackdropStyle = CSSProperties & {
  "--works-opacity": number;
  "--works-primary": string;
  "--works-secondary": string;
};

type OverlayStyle = CSSProperties & {
  "--experience-fg": string;
  "--experience-muted": string;
  "--experience-line": string;
  "--white-mix": number;
};

function stageStyle(opacity: number): StageStyle {
  return { "--stage-opacity": opacity };
}

function overlayStyle(whiteMix: number): OverlayStyle {
  return {
    "--experience-fg": "var(--yula-exp-fg)",
    "--experience-muted": "var(--yula-exp-muted)",
    "--experience-line": "var(--yula-exp-line)",
    "--white-mix": whiteMix,
  };
}

function stageIs(frame: TimelineFrame, stage: ExperienceStage): boolean {
  return frame.stage === stage;
}

const SEMANTIC_VISIBILITY_THRESHOLD = 0.01;

function stageSemanticActive(
  frame: TimelineFrame,
  stage: ExperienceStage,
  opacity: number,
): boolean {
  return stageIs(frame, stage) && opacity > SEMANTIC_VISIBILITY_THRESHOLD;
}

function visualFocus(distance: number): number {
  const clamped = Math.min(1, Math.max(0, Math.abs(distance)));
  const eased = clamped * clamped * (3 - 2 * clamped);
  return 1 - eased;
}

function exclusivePanelFocus(
  index: number,
  activeIndex: number,
  slotProgress: number,
): number {
  if (index !== activeIndex) return 0;
  const edge = 0.14;
  const enter = Math.min(1, Math.max(0, slotProgress / edge));
  const exit = Math.min(1, Math.max(0, (1 - slotProgress) / edge));
  const focus = Math.min(enter, exit);
  return focus * focus * (3 - 2 * focus);
}

/** Europe/Istanbul is the registry's documented freshness boundary. */
const noSiteDateSubscription = () => () => {};

/**
 * Server and hydration render without a date (freshness "pending"), so the
 * markup matches. A view mounted after hydration — the 2D linear switch —
 * gets the date in its first render; otherwise the pending labels collapse a
 * frame later and shift the section the switch has just scrolled to.
 */
export function useExperienceSiteDate(): string | null {
  return useSyncExternalStore(noSiteDateSubscription, () => siteDate(new Date()), () => null);
}

export type ExperienceHeaderProps = {
  copy: ExperienceCopy;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onLinearView?: () => void;
};

export function ExperienceHeader({
  copy,
  soundEnabled,
  onSoundToggle,
  onLinearView,
}: ExperienceHeaderProps) {
  const closeMobileMenu = (menu: HTMLDetailsElement | null) => {
    if (!menu) return;
    menu.open = false;
    // The native fragment jump also moves focus; restore a visible control
    // after that default action rather than leaving focus in the closed menu.
    requestAnimationFrame(() => menu.querySelector("summary")?.focus({ preventScroll: true }));
  };

  return (
    <header className={styles.experienceHeader}>
      <NextLink
        className={styles.experienceBrand}
        href="#experience-hero"
        aria-label={`YULA Lab — ${copy.navigation.home}`}
      >
        <span>YULA Lab</span>
      </NextLink>

      <nav className={styles.experienceNavigation} aria-label={copy.navigation.home}>
        <Link href="/consulting">{copy.navigation.consulting}</Link>
        <NextLink href="#experience-portfolio">{copy.navigation.projects}</NextLink>
        <NextLink href="#experience-manifesto">{copy.navigation.manifesto}</NextLink>
        <NextLink href="#experience-proof">{copy.navigation.transparency}</NextLink>
      </nav>

      <details
        className={styles.mobileNavigation}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeMobileMenu(event.currentTarget);
          }
        }}
      >
        <summary aria-label={copy.navigation.projects}>
          <span aria-hidden="true"><i /><i /><i /></span>
        </summary>
        <nav
          aria-label={copy.navigation.home}
          onClick={(event) => closeMobileMenu(event.currentTarget.closest("details"))}
        >
          <Link href="/consulting">{copy.navigation.consulting}</Link>
        <NextLink href="#experience-portfolio">{copy.navigation.projects}</NextLink>
          <NextLink href="#experience-manifesto">{copy.navigation.manifesto}</NextLink>
          <NextLink href="#experience-proof">{copy.navigation.transparency}</NextLink>
        </nav>
      </details>

      <div className={styles.experienceControls}>
        {onLinearView ? (
          <button
            type="button"
            className={styles.linearButton}
            aria-label={`2D — ${copy.fallback.label}`}
            title={copy.fallback.label}
            onClick={onLinearView}
          >
            2D
          </button>
        ) : null}
        <LocaleSwitcher compact />
        <ThemeControl compact />
        <button
          type="button"
          className={styles.soundButton}
          data-sound-control="true"
          data-sound-enabled={soundEnabled}
          onClick={onSoundToggle}
        >
          <span className={styles.soundBars} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {soundEnabled ? copy.navigation.soundOff : copy.navigation.soundOn}
        </button>
      </div>
    </header>
  );
}

type ProofLedgerProps = {
  copy: ExperienceCopy;
  product: ExperienceProduct;
  today: string | null;
  compact?: boolean;
};

export function ProofLedger({ copy, product, today, compact = false }: ProofLedgerProps) {
  if (product.claims.length === 0) {
    return (
      <p className={styles.noPublicBuild}>
        {product.lifecycle === "research" ? copy.portfolio.noPublicBuild : copy.fallback.label}
      </p>
    );
  }

  return (
    <ol className={styles.claimList}>
      {(compact ? product.claims.slice(0, 1) : product.claims).map((claim) => {
        const freshness = today === null
          ? "unknown"
          : today > claim.expiresAt
            ? "stale"
            : "current";
        return (
          <li key={claim.id} className={styles.claim} data-freshness={freshness}>
            <div className={styles.claimHeading}>
              <span>{evidenceKindLabel(claim.evidenceKind, copy.locale)}</span>
              <span className={styles.freshnessState}>
                {freshness === "unknown"
                  ? copy.proof.freshnessPending
                  : freshness === "stale"
                    ? copy.proof.stale
                    : copy.proof.verified}
              </span>
            </div>
            {claim.figure ? <strong className={styles.claimFigure}>{claim.figure}</strong> : null}
            <p className={styles.claimStatement}>{claim.statement}</p>
            <dl className={styles.provenance}>
              <div>
                <dt>{copy.proof.source}</dt>
                <dd dir="ltr">{claim.source}</dd>
              </div>
              <div>
                <dt>{copy.proof.scope}</dt>
                <dd>{claim.scope}</dd>
              </div>
              <div>
                <dt>{copy.proof.verified}</dt>
                <dd><time dir="ltr" dateTime={claim.verifiedAt}>{claim.verifiedAt}</time></dd>
              </div>
              <div>
                <dt>{copy.proof.refreshDue}</dt>
                <dd><time dir="ltr" dateTime={claim.expiresAt}>{claim.expiresAt}</time></dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ol>
  );
}

type ExperienceClosingContentProps = {
  copy: ExperienceCopy;
  headingId: string;
};

export function ExperienceClosingContent({ copy, headingId }: ExperienceClosingContentProps) {
  return (
    <div className={styles.closingContent}>
      <div className={styles.closingPitch}>
        <p className={styles.kicker}>{copy.closing.kicker}</p>
        <h2 id={headingId}>{copy.closing.title}</h2>
        <p className={styles.closingBody}>{copy.closing.body}</p>
      </div>
      <div className={styles.closingContact}>
        <a className={styles.emailLink} href={`mailto:${copy.closing.email}`}>
          {copy.closing.email}
        </a>
        <nav className={styles.trustLinks} aria-label={copy.closing.kicker}>
          <Link href="/transparency">{copy.navigation.transparency}</Link>
          <Link href="/consulting">{copy.navigation.consulting}</Link>
          <Link href="/contact">{copy.navigation.contact}</Link>
          <Link href="/privacy">{copy.closing.privacy}</Link>
          <Link href="/terms">{copy.closing.terms}</Link>
          <Link href="/support">{copy.closing.support}</Link>
        </nav>
        <div className={styles.legalLine}>
          <span>© {new Date().getFullYear()} YULA Lab</span>
          <span>{copy.closing.rights}</span>
        </div>
      </div>
    </div>
  );
}

const PREVIEW_HISTORY_KEY = "__yulaDevelopmentPreviewV1";
type PreviewHistory = {
  slug: string;
  scrollY: number;
  href: string;
  pathname: string;
  documentStartedAt: number;
  scrollRestoration: ScrollRestoration;
};

function readPreviewHistory(state: unknown): PreviewHistory | null {
  const saved = (state as Record<string, PreviewHistory> | null)?.[PREVIEW_HISTORY_KEY];
  return saved && saved.documentStartedAt === performance.timeOrigin
    && saved.pathname === window.location.pathname
    && saved.href === window.location.href
    && (saved.scrollRestoration === "auto" || saved.scrollRestoration === "manual")
    && typeof saved.slug === "string" && Number.isFinite(saved.scrollY) && saved.scrollY >= 0
    ? saved : null;
}

function DevelopmentPreviewDialog({ product, locale, onClose }: { product: ExperienceProduct | null; locale: Locale; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const focusFrame = useRef(0);
  const releaseDeferred = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!product || !dialog) return;
    cancelAnimationFrame(focusFrame.current);
    releaseDeferred.current?.();
    const saved = readPreviewHistory(window.history.state);
    const returnY = saved?.scrollY ?? window.scrollY;
    const href = window.location.href;
    const opener = document.getElementById(`development-preview-open-${product.slug}`);
    const previousOverflow = document.body.style.overflow;
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    const previousRestoration = saved?.scrollRestoration ?? window.history.scrollRestoration;
    // The reader owns one same-URL history entry. Browser traversal must not
    // restore an older anchor position underneath the modal or its return focus.
    window.history.scrollRestoration = "manual";
    root.style.scrollBehavior = "auto";
    document.body.style.overflow = "hidden";
    dialog.showModal();
    window.scrollTo({ top: returnY, behavior: "instant" });
    const positionFrame = requestAnimationFrame(() => window.scrollTo({ top: returnY, behavior: "instant" }));
    return () => {
      cancelAnimationFrame(positionFrame);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      const release = () => {
        root.style.scrollBehavior = previousBehavior;
        if (window.location.href === href) window.history.scrollRestoration = previousRestoration;
        releaseDeferred.current = null;
      };
      if (window.location.href !== href || !dialog.isConnected) { release(); return; }
      window.scrollTo({ top: returnY, behavior: "instant" });
      // A rapid Forward/Back can finish before the damped scene reaches its
      // saved product. Wait only for its opener to leave inert, without scrolling
      // a focused off-screen card or taking focus after another navigation.
      const restoreFocus = (remaining: number) => {
        if (dialog.open || !dialog.isConnected || window.location.href !== href
          || Math.abs(window.scrollY - returnY) > 3) return;
        if (opener?.isConnected && !opener.closest("[inert]")) {
          opener.focus({ preventScroll: true });
        } else if (remaining > 0) {
          focusFrame.current = requestAnimationFrame(() => restoreFocus(remaining - 1));
        } else if (document.activeElement === document.body) {
          document.querySelector<HTMLElement>("[data-yula-experience] header > a")?.focus({ preventScroll: true });
        }
      };
      // Native history restores persisted scroll after dispatching popstate.
      // Keep smooth scrolling disabled through that step, then restore the
      // reader's position before paint and release the original policies.
      releaseDeferred.current = release;
      focusFrame.current = requestAnimationFrame(() => {
        if (!dialog.open && dialog.isConnected && window.location.href === href) {
          window.scrollTo({ top: returnY, behavior: "instant" });
        }
        release();
        restoreFocus(60);
      });
    };
  }, [product]);
  useLayoutEffect(() => () => {
    cancelAnimationFrame(focusFrame.current);
    releaseDeferred.current?.();
  }, []);
  const shot = product?.developmentPreviews?.[0];
  return <dialog ref={ref} className={styles.previewDialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="development-preview-title">
    <header><h2 id="development-preview-title">{product?.name} · {text(locale, "Geliştirme görünümü", "Development view")}</h2><button type="button" onClick={onClose} aria-label={text(locale, "Görüntüyü kapat", "Close image")}>×</button></header>
    {shot ? <><p>{shot.capturedAt} · {text(locale, "Tarihli geliştirme sürümü", "Dated development build")}</p><div className={styles.previewDialogScroll} tabIndex={0} role="region" aria-label={text(locale, "Tam geliştirme ekranı", "Complete development screen")}><img src={shot.path} alt={shot.alt} /></div></> : null}
  </dialog>;
}

export function ExperienceOverlay({
  copy,
  products,
  frame,
  tier,
  soundEnabled,
  onSoundToggle,
  onLinearView,
}: ExperienceOverlayProps) {
  const [previewProduct, setPreviewProduct] = useState<ExperienceProduct | null>(null);
  const previewDismissPending = useRef(false);
  const previewEntry = useRef<PreviewHistory | null>(null);
  const openPreview = useCallback((product: ExperienceProduct) => {
    const saved: PreviewHistory = {
      slug: product.slug,
      scrollY: window.scrollY,
      href: window.location.href,
      pathname: window.location.pathname,
      documentStartedAt: performance.timeOrigin,
      scrollRestoration: window.history.scrollRestoration,
    };
    previewEntry.current = saved;
    // Preserve Next's routing fields and the journey's entry-local snapshot.
    window.history.pushState({ ...window.history.state, [PREVIEW_HISTORY_KEY]: saved }, "", saved.href);
    previewDismissPending.current = false;
    setPreviewProduct(product);
  }, []);
  const closePreview = useCallback(() => {
    if (previewDismissPending.current) return;
    if (readPreviewHistory(window.history.state)) {
      previewDismissPending.current = true;
      window.history.back();
    } else {
      previewEntry.current = null;
      setPreviewProduct(null);
    }
  }, []);
  useEffect(() => {
    const syncPreview = (event?: PopStateEvent) => {
      const saved = readPreviewHistory(window.history.state);
      if (event && previewEntry.current && !saved && window.location.href === previewEntry.current.href) {
        // Capture the destination entry before native persisted-scroll restore.
        // Its original policy is released by the dialog after this traversal.
        window.history.scrollRestoration = "manual";
      }
      previewEntry.current = saved;
      previewDismissPending.current = false;
      setPreviewProduct(saved ? products.find((product) => product.slug === saved.slug) ?? null : null);
    };
    syncPreview();
    window.addEventListener("popstate", syncPreview, true);
    return () => window.removeEventListener("popstate", syncPreview, true);
  }, [products]);
  const closingInteractive =
    stageIs(frame, "closing") && frame.world.closingContent >= 0.2;
  const heroActive = stageSemanticActive(frame, "hero", frame.overlay.hero);
  const portfolioActive = stageSemanticActive(
    frame,
    "portfolio",
    frame.overlay.portfolio,
  );
  const proofActive = stageSemanticActive(frame, "proof", frame.overlay.proof);
  const crossingActive = stageSemanticActive(
    frame,
    "crossing",
    frame.overlay.crossing,
  );
  const missionActive = stageSemanticActive(frame, "mission", frame.overlay.mission);
  const visionActive = stageSemanticActive(frame, "vision", frame.overlay.vision);
  const valuesActive = stageSemanticActive(frame, "values", frame.overlay.values);
  const today = useExperienceSiteDate();
  const proofProducts = products.filter((product) => product.claims.length > 0);
  const proofScaled = Math.min(
    proofProducts.length,
    frame.stageProgress * proofProducts.length,
  );
  const proofProductIndex = Math.min(
    Math.max(0, proofProducts.length - 1),
    Math.floor(proofScaled),
  );
  const proofProductProgress = proofProductIndex === proofProducts.length - 1 && proofScaled === proofProducts.length
    ? 1
    : proofScaled - proofProductIndex;

  return (
    <div className={styles.overlay} style={overlayStyle(frame.world.themeMix)}>
      <ExperienceHeader
        copy={copy}
        soundEnabled={soundEnabled}
        onSoundToggle={onSoundToggle}
        onLinearView={onLinearView}
      />

      <div className={styles.realHud} aria-hidden="true">
        <span>RENDER / {tier.toUpperCase()}</span>
        <span>SCROLL / {Math.round(scrollProgressForTimeline(frame.progress) * 100).toString().padStart(3, "0")}%</span>
        <span>IOR / {tier === "low" ? "OFF" : "1.35"}</span>
        <span>PRODUCT / {String(frame.productIndex + 1).padStart(2, "0")} OF {String(products.length).padStart(2, "0")}</span>
      </div>

      <section
        className={`${styles.stage} ${styles.heroStage}`}
        data-active={heroActive ? "true" : "false"}
        data-experience-stage="hero"
        style={stageStyle(frame.overlay.hero)}
        aria-hidden={!heroActive}
        inert={!heroActive}
      >
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{copy.hero.eyebrow}</p>
          <h1>{copy.hero.title}</h1>
          <p className={styles.heroLede}>{copy.hero.lede}</p>
          <Link href="/consulting" className={styles.productLink}>{copy.navigation.consulting} <span aria-hidden="true">↗</span></Link>
          <p className={styles.heroNotice}>{copy.hero.notice}</p>
        </div>
        <NextLink
          href="#experience-portfolio"
          onClick={() => track({ event: "home_primary_cta" })}
          onAuxClick={(event) => {
            if (event.button === 1) track({ event: "home_primary_cta" });
          }}
          className={styles.scrollCue}
        >
          <span>{copy.hero.scroll}</span>
          <i />
        </NextLink>
      </section>

      <section
        className={`${styles.stage} ${styles.portfolioStage}`}
        data-active={portfolioActive ? "true" : "false"}
        data-experience-stage="portfolio"
        style={stageStyle(frame.overlay.portfolio)}
        aria-hidden={!portfolioActive}
        inert={!portfolioActive}
        aria-label={copy.portfolio.kicker}
      >
        <div className={styles.worksBackdrop} aria-hidden="true">
          {products.map((product, index) => {
            const opacity = visualFocus(index - frame.productFloat) * frame.world.worksBackdropMix;
            const screenshot = product.screenshots[0]?.path;
            const screenshotIsNear =
              frame.world.worksBackdropMix > 0.001 &&
              Math.abs(index - frame.productFloat) <= 1.05;
            const style: WorksBackdropStyle = {
              "--works-opacity": opacity,
              "--works-primary": product.colors.primary,
              "--works-secondary": product.colors.secondary,
              backgroundImage: screenshot && screenshotIsNear
                ? `linear-gradient(105deg, ${product.colors.background} 8%, transparent 72%), url("${screenshot}")`
                : `radial-gradient(circle at 72% 36%, ${product.colors.primary}, transparent 34%), linear-gradient(125deg, ${product.colors.background}, ${product.colors.secondary})`,
            };

            return <span key={product.slug} style={style} />;
          })}
        </div>

        {products.map((product, index) => {
          const panelOpacity = exclusivePanelFocus(
            index,
            frame.productIndex,
            frame.productProgress,
          );
          const active =
            stageIs(frame, "portfolio") &&
            index === frame.productIndex &&
            panelOpacity > SEMANTIC_VISIBILITY_THRESHOLD;
          const distance = index - frame.productFloat;
          const panelStyle: PanelStyle = {
            "--panel-opacity": panelOpacity,
            "--panel-offset": Math.max(-1, Math.min(1, distance)),
          };
          return (
            <article
              key={product.slug}
              className={styles.productPanel}
              aria-hidden={!active}
              inert={!active}
              data-product={product.slug}
              data-development-media={product.developmentPreviews?.length ? "true" : undefined}
              data-active={active ? "true" : "false"}
              style={panelStyle}
            >
              <div className={styles.productMeta}>
                <span>{String(index + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}</span>
                <span>{product.category}</span>
              </div>
              <div className={styles.lifecycleRow}>
                <span data-lifecycle={product.lifecycle}>{product.lifecycleLabel}</span>
                {product.lifecycle === "research" ? <strong>{copy.portfolio.noPublicBuild}</strong> : null}
              </div>
              <h2>{product.icon ? <Image src={product.icon} alt="" width={36} height={36} sizes="36px" /> : null}{product.name}</h2>
              <p className={styles.productTagline}>{product.tagline}</p>
              <p className={styles.productShort}>{product.short}</p>
              {product.developmentPreviews?.length ? (
                <p className={styles.previewNote} data-development-preview="true">
                  {product.developmentPreviews[0].captureKind === "onboarding" ? (text(copy.locale, "İlk başlangıç önizlemesi", "First-start preview")) : (text(copy.locale, "Geliştirme önizlemesi", "Development preview"))} · {product.developmentPreviews[0].capturedAt}
                  <button type="button" id={`development-preview-open-${product.slug}`} className={styles.previewExpand} onClick={() => openPreview(product)} tabIndex={active ? 0 : -1}>{text(copy.locale, "Ekranı büyüt", "Enlarge screen")}</button>
                </p>
              ) : null}
              <NextLink
                href={product.href}
                onClick={() => track({ event: "product_primary_cta", product: product.slug })}
                onAuxClick={(event) => {
                  if (event.button === 1) track({ event: "product_primary_cta", product: product.slug });
                }}
                tabIndex={active ? 0 : -1}
                className={styles.productLink}
              >
                {product.ctaLabel}
                <span aria-hidden="true">↗</span>
              </NextLink>
              {product.screenshots.length > 0 ? (
                <ul className={styles.srOnly}>
                  {product.screenshots.map((shot) => (
                    <li key={shot.path}>
                      {shot.alt} — {shot.sourceBuild} — {shot.capturedAt}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </section>

      <section
        className={`${styles.stage} ${styles.proofStage}`}
        data-active={proofActive ? "true" : "false"}
        data-experience-stage="proof"
        style={stageStyle(frame.overlay.proof)}
        aria-hidden={!proofActive}
        inert={!proofActive}
        aria-labelledby="experience-proof-title"
      >
        <div className={styles.proofHeading}>
          <p className={styles.kicker}>{copy.proof.kicker}</p>
          <h2 id="experience-proof-title">{copy.proof.title}</h2>
        </div>
        <div className={styles.proofGrid} aria-label={`${copy.proof.kicker}: ${copy.proof.source}`}>
          {proofProducts.map((product, index) => {
            const panelOpacity = exclusivePanelFocus(
              index,
              proofProductIndex,
              proofProductProgress,
            );
            const active =
              stageIs(frame, "proof") &&
              index === proofProductIndex &&
              panelOpacity > SEMANTIC_VISIBILITY_THRESHOLD;
            const style: PanelStyle = {
              "--panel-opacity": panelOpacity,
              "--panel-offset": index - proofProductIndex,
            };
            return (
            <article
              key={product.slug}
              className={styles.proofProduct}
              aria-hidden={!active}
              inert={!active}
              data-active={active ? "true" : "false"}
              style={style}
            >
              <h3>{product.icon ? <Image src={product.icon} alt="" width={28} height={28} sizes="28px" /> : null}{product.name}</h3>
              <ProofLedger compact copy={copy} product={product} today={today} />
            </article>
            );
          })}
        </div>
      </section>

      <section
        className={`${styles.stage} ${styles.crossingStage}`}
        data-active={crossingActive ? "true" : "false"}
        data-experience-stage="crossing"
        style={stageStyle(frame.overlay.crossing)}
        aria-hidden={!crossingActive}
        inert={!crossingActive}
      />

      <section
        className={`${styles.stage} ${styles.manifestoStage}`}
        data-active={missionActive ? "true" : "false"}
        data-experience-stage="mission"
        style={stageStyle(frame.overlay.mission)}
        aria-hidden={!missionActive}
        inert={!missionActive}
        aria-labelledby="experience-mission-title"
      >
        <p className={styles.kicker}>{copy.mission.kicker}</p>
        <h2 id="experience-mission-title"><span>{copy.mission.title}</span></h2>
        <p>{copy.mission.body}</p>
      </section>

      <section
        className={`${styles.stage} ${styles.manifestoStage} ${styles.visionStage}`}
        data-active={visionActive ? "true" : "false"}
        data-experience-stage="vision"
        style={stageStyle(frame.overlay.vision)}
        aria-hidden={!visionActive}
        inert={!visionActive}
        aria-labelledby="experience-vision-title"
      >
        <p className={styles.kicker}>{copy.vision.kicker}</p>
        <h2 id="experience-vision-title"><span>{copy.vision.title}</span></h2>
        <p>{copy.vision.body}</p>
      </section>

      <section
        className={`${styles.stage} ${styles.valuesStage}`}
        data-active={valuesActive ? "true" : "false"}
        data-experience-stage="values"
        style={stageStyle(frame.overlay.values)}
        aria-hidden={!valuesActive}
        inert={!valuesActive}
        aria-labelledby="experience-values-title"
      >
        <div className={styles.valuesHeading}>
          <p className={styles.kicker}>{copy.values.kicker}</p>
          <h2 id="experience-values-title">{copy.values.title}</h2>
          <p className={styles.previewNote}>{text(copy.locale, "Ürün kimlikleri ve tarihli geliştirme görünümleri", "Product identities and dated development views")}</p>
        </div>
        <div className={styles.valuePanels}>
          {copy.values.items.map((value, index) => {
            const panelOpacity = exclusivePanelFocus(
              index,
              frame.valueIndex,
              frame.valueProgress,
            );
            const active =
              stageIs(frame, "values") &&
              index === frame.valueIndex &&
              panelOpacity > SEMANTIC_VISIBILITY_THRESHOLD;
            const distance = index - frame.valueFloat;
            const panelStyle: PanelStyle = {
              "--panel-opacity": panelOpacity,
              "--panel-offset": Math.max(-1, Math.min(1, distance)),
            };
            return (
              <article
                key={value.title}
                className={styles.valuePanel}
                aria-hidden={!active}
                inert={!active}
                data-active={active ? "true" : "false"}
                style={panelStyle}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className={`${styles.stage} ${styles.closingStage}`}
        data-interactive={closingInteractive ? "true" : "false"}
        data-active={closingInteractive ? "true" : "false"}
        data-experience-stage="closing"
        style={{
          ...stageStyle(frame.overlay.closing),
          "--closing-content": frame.world.closingContent,
          "--closing-draw": frame.world.closingDraw,
        } as CSSProperties}
        aria-hidden={!closingInteractive}
        inert={!closingInteractive}
        aria-labelledby="experience-closing-title"
      >
        <div className={styles.closingWordmark} aria-hidden="true">
          <svg viewBox="-1.1 -1.1 2.2 2.2" fill="currentColor">
            <path transform="scale(1 -1)" d="M-.95 .9H-.43L0 .27 .43 .9H.95L.27-.08V-.9H-.27V-.08Z" />
          </svg>
        </div>
        <ExperienceClosingContent copy={copy} headingId="experience-closing-title" />
      </section>
      <DevelopmentPreviewDialog product={previewProduct} locale={copy.locale} onClose={closePreview} />
    </div>
  );
}

export default ExperienceOverlay;
