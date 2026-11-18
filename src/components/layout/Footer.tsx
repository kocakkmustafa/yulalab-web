import { localized } from "@/lib/localized";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FooterWordmark } from "./FooterWordmark";
import { XLogo, Linkedin, Instagram, ArrowUpRight } from "@/components/common/icons";
import { company } from "@/data/company";
import { projects } from "@/data/projects";
import type { Locale } from "@/lib/types";
import { caseStudies } from "@/data/case-studies";
import { FOOTER_LEGAL_NAV, SOCIAL_LABEL, visibleFooterCompanyNav } from "./nav-config";

// Mobile touch targets: 44px rows; desktop keeps the compact list.
const LINK_ROWS = "[&_a]:inline-flex [&_a]:items-center max-md:[&_a]:min-h-[44px]";

const SOCIAL_ICON = { x: XLogo, linkedin: Linkedin, instagram: Instagram } as const;

export function Footer({ studioEnabled }: { studioEnabled: boolean }) {
  const t = useTranslations("footer");
  const tHeader = useTranslations("header");
  const locale = useLocale() as Locale;
  const year = new Date().getFullYear();
  const emailBreakAt = company.contact.email.indexOf("@") + 1;

  return (
    <footer data-site-footer="true" data-reveal className="mt-32 border-t border-hairline">
      <div className="px-[clamp(24px,3.5vw,50px)] pt-16 lg:pt-24 pb-6 lg:pb-8 grid gap-8 lg:gap-12 lg:grid-cols-[minmax(0,1fr)_auto] text-[14px]">
       <div className="grid grid-cols-2 gap-10 min-w-0 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="col-span-2 md:col-span-1">
          <span className="font-display text-2xl font-semibold">Yula Lab</span>
          <p className="mt-2 lg:mt-1 text-sm text-ink-300 leading-relaxed max-w-[26ch]">
            {t("tagline")}
          </p>
          <div className="mt-4 lg:mt-2 flex flex-wrap items-center gap-x-6 gap-y-0">
          <div className="font-mono text-[11px] tracking-widest text-ink-300 uppercase">
            {t("location")}
          </div>
          <div className="flex items-center gap-1">
            {(Object.entries(company.socials) as [keyof typeof SOCIAL_ICON, string][]).map(
              ([key, href]) => {
                const Icon = SOCIAL_ICON[key];
                if (!Icon) return null;
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={SOCIAL_LABEL[key]}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-ink-300 hover:text-ink-50 transition-colors focusable"
                  >
                    <Icon size={16} />
                  </a>
                );
              },
            )}
          </div>
          </div>
        </div>

        <div>
          <div className="font-mono text-[11px] tracking-widest text-ink-300 uppercase mb-4">
            {t("founderHeading")}
          </div>
          <div className="text-sm text-ink-200">{company.founder.name}</div>
          <div className="text-sm text-ink-300 mt-1">
            {localized(company.founder.role, locale)}
          </div>
        </div>
       </div>
        <div className="flex flex-col items-start gap-2 lg:items-end text-[16px]">
          {([["/contact", t("navContact")], ["/support", t("navSupport")]] as const).map(([href, label]) => (
            <Link key={href} href={href} className="focusable inline-flex min-h-[44px] items-center gap-3 text-ink-200">
              <span>{label}</span>
              <span aria-hidden="true" className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border border-current">
                <ArrowUpRight size={14} strokeWidth={1.6} />
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-[clamp(24px,3.5vw,50px)] pb-2 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid grid-cols-2 md:grid-cols-[repeat(3,max-content)] gap-x-10 md:gap-x-16 gap-y-10 min-w-0 text-[14px] [&_ul]:gap-0 [&_li]:leading-8">
        <div>
            <div className="font-mono text-[11px] tracking-widest text-ink-300 uppercase mb-4">
              {t("projectsHeading")}
            </div>
            <ul className={`flex flex-col gap-2.5 max-md:gap-0 text-sm text-ink-200 ${LINK_ROWS}`}>
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/projects/${p.slug}`}
                    className="link-wipe focusable hover:text-ink-50"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-mono text-[11px] tracking-widest text-ink-300 uppercase mb-4">
              {t("companyHeading")}
            </div>
            <ul className={`flex flex-col gap-2.5 max-md:gap-0 text-sm text-ink-200 lg:grid lg:grid-flow-col lg:grid-rows-6 lg:!gap-x-10 lg:!gap-y-0 ${LINK_ROWS}`}>
              {visibleFooterCompanyNav({ studioEnabled, caseStudyCount: caseStudies.length }).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href as "/"}
                    prefetch={false}
                    className="link-wipe focusable"
                  >
                    {item.ns === "header" ? tHeader(item.key) : t(item.key)}
                  </Link>
                </li>
              ))}
              <li>
                {/* `overflow-wrap: anywhere`, not Tailwind's `break-words`
                    (`break-word`): only `anywhere` also shrinks the element's
                    min-content width, which is what a fixed-width grid column
                    measures. Measured at 320px — this 19-character address
                    needed 152px inside a 116px column and pushed the whole
                    document 12px wide, so every page scrolled sideways on the
                    narrowest supported viewport. */}
                <a
                  href={`mailto:${company.contact.email}`}
                  className="link-wipe focusable [overflow-wrap:anywhere]"
                >
                  {company.contact.email.slice(0, emailBreakAt)}
                  <wbr />
                  {company.contact.email.slice(emailBreakAt)}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-mono text-[11px] tracking-widest text-ink-300 uppercase mb-4">
              {t("legalHeading")}
            </div>
            <ul className={`flex flex-col gap-2.5 max-md:gap-0 text-sm text-ink-200 ${LINK_ROWS}`}>
              {FOOTER_LEGAL_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-wipe focusable">{t(item.key)}</Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
        <div
          className="text-ink-50 lg:text-right text-[32px] leading-tight font-semibold"
          style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
        >
          ©{year} Yula Lab
        </div>
      </div>
      {/* Closing wordmark: the brand drawn as one oversized outline that runs
          edge to edge and is cut by the bottom bar, the way the reference's
          footer ends. Decorative; the readable brand sits in the first column.
          It draws itself stroke by stroke when the footer is first seen. */}
      <FooterWordmark />
      <div className="border-t border-hairline">
        <div className="px-[clamp(24px,3.5vw,50px)] py-6 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 max-md:justify-center text-[12px] text-ink-300 [overflow-wrap:anywhere]">
          <div>
            {company.legalName}. {t("rights")}
          </div>
          <span aria-hidden="true" className="md:hidden">·</span>
          <div className="font-mono tracking-[0.1em] uppercase">{t("version")}</div>
        </div>
      </div>
    </footer>
  );
}
