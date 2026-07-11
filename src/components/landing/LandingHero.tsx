"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "@/components/common/icons";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { StaggerWords } from "@/components/common/StaggerWords";
import { YulaBanner } from "@/components/common/YulaBanner";
import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { EASE_OUT } from "@/lib/motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

/**
 * The hero's own entrance sequence — eyebrow, title, description, CTAs and
 * meta line arrive one after another (staggerChildren) instead of as one
 * flat block. The title's words additionally stagger internally
 * (StaggerWords), so the two effects layer: the block arrives, then its
 * words settle. The banner card arrives last, from the opposite side, so
 * the eye has somewhere to land after the text finishes.
 */
export function LandingHero() {
  const t = useTranslations("landing");
  const tc = useTranslations("common");

  return (
    <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32">
      <HeroBackdrop />
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 lg:gap-16 items-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <EyebrowChip>{t("eyebrow")}</EyebrowChip>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[44px] sm:text-[60px] md:text-[72px] lg:text-[80px] xl:text-[92px] max-w-[14ch]"
          >
            <StaggerWords text={t("heroTitle")} />
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-7 max-w-[52ch] text-[16.5px] md:text-[17.5px] leading-[1.6] text-ink-300"
          >
            {t("heroDescription")}
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/projects"
              className="group inline-flex items-center gap-2 rounded-full bg-ink-50 text-ink-900 pl-5 pr-4 py-3 text-[14px] font-medium hover:bg-ink-100 transition-colors focusable"
            >
              {tc("discoverProjects")}{" "}
              <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
            </Link>
            <Link
              href="/manifesto"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 text-ink-100 pl-5 pr-5 py-3 text-[14px] font-medium hover:border-white/30 hover:bg-white/[0.04] transition-colors focusable"
            >
              {tc("manifesto")}
            </Link>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-12 flex items-center gap-6 text-[12px] text-ink-400 font-mono tracking-widest uppercase"
          >
            <span>{t("heroMeta.products")}</span>
            <span className="w-px h-3 bg-white/10" />
            <span>{t("heroMeta.studio")}</span>
            <span className="w-px h-3 bg-white/10" />
            <span>{t("heroMeta.place")}</span>
          </motion.div>
        </motion.div>

        {/* Banner card — arrives last, settling in from the right. */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 18, x: 14 }}
          animate={{ opacity: 1, y: 0, x: 0, transition: { duration: 0.8, ease: EASE_OUT, delay: 0.35 } }}
        >
          <div className="relative tilt-r aspect-[4/5] sm:aspect-[5/4] lg:aspect-[4/5]">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[28px] opacity-60"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(255,255,255,0.10), transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            <YulaBanner />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono tracking-widest uppercase text-ink-400 px-1">
            <span>{t("bannerCardTopLabel")}</span>
            <span>{t("bannerCardBottomLabel")}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
