import { setRequestLocale } from "next-intl/server";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, ArrowRight } from "@/components/common/icons";
import { Reveal } from "@/components/common/Reveal";
import { GlassSheen } from "@/components/common/GlassSheen";
import { StatusPill } from "@/components/common/StatusPill";
import { YulaEmblem } from "@/components/common/YulaEmblem";
import { SceneRail } from "@/components/landing/SceneRail";
import { company } from "@/data/company";
import { projects } from "@/data/projects";
import type { Locale } from "@/lib/types";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Landing />;
}

// `xl:pr-32` reserves a gutter for the fixed SceneRail: without it the
// rail's labels land on top of section copy at wide viewports.
const SECTION = "max-w-7xl mx-auto px-6 lg:px-10 xl:pr-32";
const KICKER = "font-mono text-[11px] tracking-[0.22em] uppercase text-ink-300";
const ROMAN = ["I", "II", "III", "IV"] as const;

function Landing() {
  const t = useTranslations("landing");
  const locale = useLocale() as Locale;

  const scenes = (
    ["giris", "vizyon", "degerler", "manifesto", "projeler", "seffaflik", "birlesme"] as const
  ).map((id) => ({ id, label: t(`scenes.${id}`) }));

  const values = [1, 2, 3, 4] as const;
  const principles = [1, 2, 3, 4, 5, 6] as const;

  return (
    <>
      {/* Ambient ground sits outside `.page-enter`: that class animates
          with `fill-mode: both`, so its final transform sticks around and
          any transform makes the element a containing block for fixed
          descendants — nested inside, this layer would stretch to the
          full document height instead of the viewport. */}
      <div className="ambient" aria-hidden />

      <div className="page-enter relative">
        <GlassSheen />
        <SceneRail scenes={scenes} label={t("railLabel")} />

      <div className="relative z-10">
        {/* ── 01 intro ─────────────────────────────────────────────── */}
        <section id="giris" className={`${SECTION} pt-24 pb-32 scroll-mt-24`}>
          <Reveal className="flex items-center gap-3 mb-10">
            <span
              aria-hidden
              className="w-[5px] h-[5px] rounded-full bg-[#7FD8DC]"
              style={{ boxShadow: "0 0 10px rgba(127,216,220,0.7)" }}
            />
            <span className={KICKER}>{t("heroEyebrow")}</span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="font-display font-light text-[clamp(40px,6.4vw,90px)] leading-[1.03] tracking-tightest max-w-[17ch]">
              {t("heroTitleA")}
              <br />
              <span className="text-ink-400">{t("heroTitleB")}</span>
            </h1>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-20 mt-14 items-end">
            <Reveal delay={190}>
              <p className="max-w-[46ch] text-[16px] leading-[1.72] text-ink-300 text-pretty">
                {t("heroLede")}
              </p>
            </Reveal>
            <Reveal delay={280} className="flex flex-col gap-3.5">
              <a
                href="#projeler"
                className="glass inline-flex items-center justify-between gap-4 px-5 py-4 text-sm hover:border-white/35 transition-colors focusable"
              >
                <span>{t("heroCta")}</span>
                <span className="font-mono text-[11px] text-ink-300">03</span>
              </a>
              <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-400">
                {t("scrollHint")}
              </span>
            </Reveal>
          </div>
        </section>

        {/* ── 02 vision / mission ──────────────────────────────────── */}
        <section id="vizyon" className={`${SECTION} py-28 scroll-mt-24`}>
          <Reveal>
            <p className={`${KICKER} mb-10`}>{t("visionKicker")}</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              [
                ["visionLabel", "visionTitle", "visionBody", 0],
                ["missionLabel", "missionTitle", "missionBody", 110],
              ] as const
            ).map(([label, title, body, delay]) => (
              <Reveal key={label} delay={delay}>
                <div className="glass p-8 lg:p-12 h-full">
                  <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-[#7FD8DC] mb-6">
                    {t(label)}
                  </div>
                  <h2 className="font-display font-light text-[clamp(24px,2.6vw,38px)] leading-[1.18] tracking-tight max-w-[24ch] mb-4 text-pretty">
                    {t(title)}
                  </h2>
                  <p className="max-w-[46ch] text-[15px] leading-[1.75] text-ink-300 text-pretty">
                    {t(body)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── 03 values ────────────────────────────────────────────── */}
        <section id="degerler" className={`${SECTION} py-28 scroll-mt-24`}>
          <Reveal className="flex items-baseline justify-between flex-wrap gap-4 mb-10">
            <p className={KICKER}>{t("valuesKicker")}</p>
            <p className="text-[13.5px] text-ink-300">{t("valuesNote")}</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {values.map((n, i) => (
              <Reveal key={n} delay={i * 70}>
                <div className="glass p-6 lg:p-9 h-full">
                  <div className="font-mono text-[10.5px] tracking-[0.18em] text-[#7FD8DC] mb-5">
                    {ROMAN[i]}
                  </div>
                  <h3 className="font-display font-medium text-[17px] tracking-tight mb-3">
                    {t(`value${n}Title`)}
                  </h3>
                  <p className="text-sm leading-[1.68] text-ink-300">{t(`value${n}Body`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── 04 manifesto ─────────────────────────────────────────── */}
        <section id="manifesto" className={`${SECTION} py-28 scroll-mt-24`}>
          <Reveal className="flex items-baseline justify-between flex-wrap gap-4 mb-10">
            <p className={KICKER}>{t("manifestoKicker")}</p>
            <p className="text-[13.5px] text-ink-300">{t("manifestoNoteNew")}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display font-light text-[clamp(30px,4.2vw,58px)] leading-[1.1] tracking-tightest max-w-[20ch] mb-14 text-pretty">
              {t("manifestoTitleA")}
              <span className="text-ink-400">{t("manifestoTitleB")}</span>
            </h2>
          </Reveal>
          <div className="flex flex-col">
            {principles.map((n) => (
              <Reveal key={n}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-14 py-8 border-t border-white/10">
                  <div className="flex gap-4">
                    <span className="font-mono text-[11px] text-ink-400 pt-[7px]">
                      {String(n).padStart(2, "0")}
                    </span>
                    <h3 className="font-display font-normal text-[clamp(19px,1.8vw,26px)] tracking-tight leading-[1.26] max-w-[22ch] text-pretty">
                      {t(`m${n}Title`)}
                    </h3>
                  </div>
                  <p className="max-w-[52ch] text-[14.5px] leading-[1.75] text-ink-300 text-pretty">
                    {t(`m${n}Body`)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="pt-10">
            <Link
              href="/manifesto"
              className="group inline-flex items-center gap-2 text-[13.5px] text-ink-200 link-wipe focusable"
            >
              {t("manifestoReadAll")}
              <ArrowRight size={14} strokeWidth={2} className="arrow-nudge" />
            </Link>
          </Reveal>
        </section>

        {/* ── 05 projects ──────────────────────────────────────────── */}
        <section id="projeler" className={`${SECTION} py-28 scroll-mt-24`}>
          <Reveal className="flex items-baseline justify-between flex-wrap gap-4 pb-5 border-b border-white/20 mb-16">
            <p className={KICKER}>{t("projectsKicker")}</p>
            <p className="font-mono text-[11px] tracking-[0.16em] text-ink-400">
              {t("projectsCount")}
            </p>
          </Reveal>

          {projects.map((p, i) => (
            <Reveal key={p.slug}>
              <article
                className={
                  "grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-[76px] items-center pb-20 " +
                  (i > 0 ? "border-t border-white/10 pt-20" : "")
                }
              >
                <div>
                  <div className="flex items-center gap-3 mb-5 flex-wrap">
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background:
                          p.status === "live"
                            ? "#7FD8DC"
                            : p.status === "beta"
                            ? "#4FA8B8"
                            : "#5B6472",
                        boxShadow:
                          p.status === "live" || p.status === "beta"
                            ? "0 0 9px rgba(127,216,220,0.6)"
                            : "none",
                      }}
                    />
                    <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-ink-300">
                      {String(i + 1).padStart(2, "0")} · {p.category[locale]}
                    </span>
                    {p.status !== "live" ? <StatusPill status={p.status} /> : null}
                  </div>
                  <h3 className="font-display font-light text-[clamp(32px,4.2vw,56px)] leading-[1.06] tracking-tightest mb-4">
                    {p.name}
                  </h3>
                  <p className="max-w-[42ch] text-[16px] leading-[1.72] text-ink-300 mb-7 text-pretty">
                    {p.short[locale]}
                  </p>
                  <Link
                    href={`/projects/${p.slug}`}
                    className="inline-flex items-center gap-2.5 text-sm border-b border-white/20 pb-1.5 hover:border-[#7FD8DC] transition-colors focusable"
                  >
                    {p.name} — {t("inspect")}
                    <ArrowUpRight size={13} strokeWidth={2} className="arrow-nudge text-ink-300" />
                  </Link>
                </div>

                <div className="glass glass-accent relative p-6 lg:p-9 overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute right-5 bottom-2 font-display font-extralight leading-[0.86] tracking-tightest select-none"
                    style={{ fontSize: "clamp(64px,8vw,112px)", color: "rgba(244,244,245,0.07)" }}
                  >
                    {p.monogram}
                  </div>
                  <div className="relative">
                    <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-ink-400 pb-4">
                      {t("specHeading")}
                    </div>
                    {p.stats.map((s) => (
                      <div
                        key={s.label[locale]}
                        className="flex items-baseline justify-between gap-4 py-3.5 border-t border-white/10"
                      >
                        <span className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-400">
                          {s.label[locale]}
                        </span>
                        <span className="font-grotesk text-[15px] text-right">{s.value}</span>
                      </div>
                    ))}
                    {/* honest empty state — never a fabricated product shot */}
                    <div className="font-mono text-[10px] tracking-[0.13em] uppercase text-ink-400 pt-5 border-t border-white/10">
                      {t("visualsNote")}
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </section>

        {/* ── 06 transparency ──────────────────────────────────────── */}
        <section id="seffaflik" className={`${SECTION} py-28 scroll-mt-24`}>
          <Reveal>
            <p className={`${KICKER} mb-10`}>{t("transparencyKicker")}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-display font-light text-[clamp(30px,4.2vw,58px)] leading-[1.1] tracking-tightest max-w-[20ch] mb-8 text-pretty">
              {t("transparencyTitleA")}
              <span className="text-ink-400">{t("transparencyTitleB")}</span>
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="max-w-[52ch] text-[15.5px] leading-[1.75] text-ink-300 mb-8 text-pretty">
              {t("transparencyBody")}
            </p>
            <Link
              href="/transparency"
              className="group inline-flex items-center gap-2 text-[13.5px] text-ink-200 link-wipe focusable"
            >
              {t("transparencyCta")}
              <ArrowRight size={14} strokeWidth={2} className="arrow-nudge" />
            </Link>
          </Reveal>
        </section>

        {/* ── 07 convergence ───────────────────────────────────────── */}
        <section
          id="birlesme"
          className="min-h-screen grid place-items-center px-6 lg:px-10 py-24 scroll-mt-24"
        >
          <div className="w-full max-w-[640px] text-center">
            {/* the filament field measures this element to know where scene
                progress reaches 1 — the threads land exactly here */}
            {/* By this point the background film has converged on the
                emblem, so the scene shows nothing of its own. When the film
                isn't running — reduced motion, a metered connection — the
                static mark takes its place (see [data-film] in globals). */}
            <div className="mx-auto mb-8 w-[clamp(180px,24vw,300px)]">
              <Reveal>
                <YulaEmblem size={300} className="w-full h-auto" title={company.name} />
              </Reveal>
            </div>
            <Reveal delay={120}>
              <h2 className="font-display font-light text-[clamp(30px,4vw,54px)] leading-[1.08] tracking-[0.06em] mb-4">
                {t("closingTitleA")}
                <span className="text-ink-400">{t("closingTitleB")}</span>
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mx-auto max-w-[44ch] text-[16px] leading-[1.75] text-ink-300 mb-12 text-pretty">
                {t("closingBody")}
              </p>
            </Reveal>
            <Reveal delay={280} className="flex flex-wrap gap-3 justify-center">
              <a
                href={`mailto:${company.contact.email}`}
                className="inline-flex items-center gap-3 px-6 py-4 text-sm rounded-[10px] focusable transition-colors"
                style={{
                  border: "1px solid rgba(127,216,220,0.34)",
                  background:
                    "linear-gradient(150deg, rgba(127,216,220,0.16), rgba(127,216,220,0.05))",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
                }}
              >
                {company.contact.email}
              </a>
              <Link
                href="/manifesto"
                className="inline-flex items-center gap-3 px-6 py-4 text-sm rounded-[10px] border border-white/10 text-ink-300 hover:text-ink-50 hover:border-white/20 transition-colors focusable"
              >
                {t("closingSecondary")}
              </Link>
            </Reveal>
          </div>
        </section>
        </div>
      </div>
    </>
  );
}
