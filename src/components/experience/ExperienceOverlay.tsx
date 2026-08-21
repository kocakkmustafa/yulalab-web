"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { TrackedLink } from "@/components/common/TrackedLink";
import { Link } from "@/i18n/navigation";
import { siteDate } from "@/lib/public-registry";
import type {
  ExperienceCopy,
  ExperienceProduct,
  ExperienceStage,
  QualityTier,
  TimelineFrame,
} from "./types";
import styles from "./Experience.module.css";
import { resolveExperiencePalette } from "./theme";

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
  const palette = resolveExperiencePalette(whiteMix);
  return {
    "--experience-fg": palette.foreground,
    "--experience-muted": palette.muted,
    "--experience-line": palette.line,
    "--white-mix": whiteMix,
  };
}

function stageIs(frame: TimelineFrame, stage: ExperienceStage): boolean {
  return frame.stage === stage;
}

/** Europe/Istanbul is the registry's documented freshness boundary. */
export function useExperienceSiteDate(): string | null {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(
      siteDate(new Date()),
    );
  }, []);

  return today;
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
  const nextLocale = copy.locale === "tr" ? "en" : "tr";

  return (
    <header className={styles.experienceHeader}>
      <a className={styles.experienceBrand} href="#experience-hero" aria-label={copy.navigation.home}>
        <span className={styles.brandGlyph} aria-hidden="true">Y</span>
        <span>YULA LAB</span>
      </a>

      <nav className={styles.experienceNavigation} aria-label={copy.navigation.home}>
        <a href="#experience-portfolio">{copy.navigation.projects}</a>
        <a href="#experience-manifesto">{copy.navigation.manifesto}</a>
        <a href="#experience-proof">{copy.navigation.transparency}</a>
      </nav>

      <details className={styles.mobileNavigation}>
        <summary aria-label={copy.navigation.projects}>
          <span aria-hidden="true"><i /><i /><i /></span>
        </summary>
        <nav aria-label={copy.navigation.home}>
          <a href="#experience-portfolio">{copy.navigation.projects}</a>
          <a href="#experience-manifesto">{copy.navigation.manifesto}</a>
          <a href="#experience-proof">{copy.navigation.transparency}</a>
        </nav>
      </details>

      <div className={styles.experienceControls}>
        {onLinearView ? (
          <button
            type="button"
            className={styles.linearButton}
            aria-label={copy.fallback.label}
            title={copy.fallback.label}
            onClick={onLinearView}
          >
            2D
          </button>
        ) : null}
        <Link
          href="/"
          locale={nextLocale}
          hrefLang={nextLocale}
          className={styles.localeLink}
          aria-label={nextLocale === "tr" ? "Türkçe" : "English"}
        >
          {nextLocale.toUpperCase()}
        </Link>
        <button
          type="button"
          className={styles.soundButton}
          aria-pressed={soundEnabled}
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
};

export function ProofLedger({ copy, product, today }: ProofLedgerProps) {
  if (product.claims.length === 0) {
    return (
      <p className={styles.noPublicBuild}>
        {product.lifecycle === "research" ? copy.portfolio.noPublicBuild : copy.fallback.label}
      </p>
    );
  }

  return (
    <ol className={styles.claimList}>
      {product.claims.map((claim) => {
        const freshness = today === null
          ? "unknown"
          : today > claim.expiresAt
            ? "stale"
            : "current";
        return (
          <li key={claim.id} className={styles.claim} data-freshness={freshness}>
            <div className={styles.claimHeading}>
              <span>{claim.evidenceKind}</span>
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
                <dd>{claim.source}</dd>
              </div>
              <div>
                <dt>{copy.proof.scope}</dt>
                <dd>{claim.scope}</dd>
              </div>
              <div>
                <dt>{copy.proof.verified}</dt>
                <dd><time dateTime={claim.verifiedAt}>{claim.verifiedAt}</time></dd>
              </div>
              <div>
                <dt>{copy.proof.refreshDue}</dt>
                <dd><time dateTime={claim.expiresAt}>{claim.expiresAt}</time></dd>
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
      <p className={styles.kicker}>{copy.closing.kicker}</p>
      <h2 id={headingId}>{copy.closing.title}</h2>
      <p className={styles.closingBody}>{copy.closing.body}</p>
      <a className={styles.emailLink} href={`mailto:${copy.closing.email}`}>
        {copy.closing.email}
      </a>
      <nav className={styles.trustLinks} aria-label={copy.closing.kicker}>
        <Link href="/transparency">{copy.navigation.transparency}</Link>
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
  );
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
  const today = useExperienceSiteDate();

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
        <span>SCROLL / {Math.round(frame.progress * 100).toString().padStart(3, "0")}%</span>
        <span>IOR / {tier === "low" ? "OFF" : "1.35"}</span>
        <span>PRODUCT / {String(frame.productIndex + 1).padStart(2, "0")} OF {String(products.length).padStart(2, "0")}</span>
      </div>

      <section
        className={`${styles.stage} ${styles.heroStage}`}
        style={stageStyle(frame.overlay.hero)}
        aria-hidden={!stageIs(frame, "hero")}
        inert={!stageIs(frame, "hero")}
      >
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{copy.hero.eyebrow}</p>
          <h1>{copy.hero.title}</h1>
          <p className={styles.heroLede}>{copy.hero.lede}</p>
          <p className={styles.heroNotice}>{copy.hero.notice}</p>
        </div>
        <div className={styles.scrollCue} aria-hidden="true">
          <span>{copy.hero.scroll}</span>
          <i />
        </div>
      </section>

      <section
        className={`${styles.stage} ${styles.portfolioStage}`}
        style={stageStyle(frame.overlay.portfolio)}
        aria-hidden={!stageIs(frame, "portfolio")}
        inert={!stageIs(frame, "portfolio")}
        aria-label={copy.portfolio.kicker}
      >
        {products.map((product, index) => {
          const active = stageIs(frame, "portfolio") && index === frame.productIndex;
          return (
            <article
              key={product.slug}
              className={styles.productPanel}
              aria-hidden={!active}
              inert={!active}
              data-product={product.slug}
              data-active={active ? "true" : "false"}
            >
              <div className={styles.productMeta}>
                <span>{String(index + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}</span>
                <span>{product.category}</span>
              </div>
              <div className={styles.lifecycleRow}>
                <span data-lifecycle={product.lifecycle}>{product.lifecycleLabel}</span>
                {product.lifecycle === "research" ? <strong>{copy.portfolio.noPublicBuild}</strong> : null}
              </div>
              <h2>{product.name}</h2>
              <p className={styles.productTagline}>{product.tagline}</p>
              <p className={styles.productShort}>{product.short}</p>
              <TrackedLink
                href={product.href}
                event="product_primary_cta"
                product={product.slug}
                tabIndex={active ? 0 : -1}
                className={styles.productLink}
              >
                {product.ctaLabel}
                <span aria-hidden="true">↗</span>
              </TrackedLink>
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
        style={stageStyle(frame.overlay.proof)}
        aria-hidden={!stageIs(frame, "proof")}
        inert={!stageIs(frame, "proof")}
        aria-labelledby="experience-proof-title"
      >
        <div className={styles.proofHeading}>
          <p className={styles.kicker}>{copy.proof.kicker}</p>
          <h2 id="experience-proof-title">{copy.proof.title}</h2>
        </div>
        <div
          className={styles.proofGrid}
          role="region"
          tabIndex={0}
          aria-labelledby="experience-proof-title"
        >
          {products.filter((product) => product.claims.length > 0).map((product) => (
            <article key={product.slug} className={styles.proofProduct}>
              <h3>{product.name}</h3>
              <ProofLedger copy={copy} product={product} today={today} />
            </article>
          ))}
        </div>
      </section>

      <section
        className={`${styles.stage} ${styles.crossingStage}`}
        style={stageStyle(frame.overlay.crossing)}
        aria-hidden={!stageIs(frame, "crossing")}
        inert={!stageIs(frame, "crossing")}
      >
        <p>{copy.proof.kicker}</p>
      </section>

      <section
        className={`${styles.stage} ${styles.manifestoStage}`}
        style={stageStyle(frame.overlay.mission)}
        aria-hidden={!stageIs(frame, "mission")}
        inert={!stageIs(frame, "mission")}
        aria-labelledby="experience-mission-title"
      >
        <p className={styles.kicker}>{copy.mission.kicker}</p>
        <h2 id="experience-mission-title"><span>{copy.mission.title}</span></h2>
        <p>{copy.mission.body}</p>
      </section>

      <section
        className={`${styles.stage} ${styles.manifestoStage} ${styles.visionStage}`}
        style={stageStyle(frame.overlay.vision)}
        aria-hidden={!stageIs(frame, "vision")}
        inert={!stageIs(frame, "vision")}
        aria-labelledby="experience-vision-title"
      >
        <p className={styles.kicker}>{copy.vision.kicker}</p>
        <h2 id="experience-vision-title">{copy.vision.title}</h2>
        <p>{copy.vision.body}</p>
      </section>

      <section
        className={`${styles.stage} ${styles.valuesStage}`}
        style={stageStyle(frame.overlay.values)}
        aria-hidden={!stageIs(frame, "values")}
        inert={!stageIs(frame, "values")}
        aria-labelledby="experience-values-title"
      >
        <div className={styles.valuesHeading}>
          <p className={styles.kicker}>{copy.values.kicker}</p>
          <h2 id="experience-values-title">{copy.values.title}</h2>
        </div>
        <div className={styles.valuePanels}>
          {copy.values.items.map((value, index) => {
            const active = stageIs(frame, "values") && index === frame.valueIndex;
            return (
              <article
                key={value.title}
                className={styles.valuePanel}
                aria-hidden={!active}
                inert={!active}
                data-active={active ? "true" : "false"}
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
        style={stageStyle(frame.overlay.closing)}
        aria-hidden={!stageIs(frame, "closing")}
        inert={!stageIs(frame, "closing")}
        aria-labelledby="experience-closing-title"
      >
        <ExperienceClosingContent copy={copy} headingId="experience-closing-title" />
      </section>
    </div>
  );
}

export default ExperienceOverlay;
