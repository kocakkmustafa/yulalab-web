import { localized } from "@/lib/localized";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { YulaMark } from "@/components/common/YulaMark";
import { FooterWordmark } from "./FooterWordmark";
import { XLogo, Linkedin, Instagram } from "@/components/common/icons";
import { company } from "@/data/company";
import { projects } from "@/data/projects";
import type { Locale } from "@/lib/types";
import { FOOTER_COMPANY_NAV, FOOTER_LEGAL_NAV, SOCIAL_LABEL } from "./nav-config";

// Mobile touch targets: 44px rows; desktop keeps the compact list.
const LINK_ROWS = "[&_a]:inline-flex [&_a]:items-center max-md:[&_a]:min-h-[44px]";

const SOCIAL_ICON = { x: XLogo, linkedin: Linkedin, instagram: Instagram } as const;

export function Footer({ studioEnabled }: { studioEnabled: boolean }) {
  const t = useTranslations("footer");
  const locale = useLocale() as Locale;
  const year = new Date().getFullYear();
  const emailBreakAt = company.contact.email.indexOf("@") + 1;

  return (
    <footer data-site-footer="true" className="border-t border-white/[0.06] mt-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <YulaMark />
            <span className="font-display font-semibold">YULA Lab</span>
          </div>
          <p className="mt-4 text-sm text-ink-300 leading-relaxed max-w-[26ch]">
            {t("tagline")}
          </p>
          <div className="mt-6 font-mono text-[11px] tracking-widest text-ink-300 uppercase">
            {t("location")}
          </div>
          <div className="mt-3 flex items-center gap-1">
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
          <ul className={`flex flex-col gap-2.5 max-md:gap-0 text-sm text-ink-200 ${LINK_ROWS}`}>
            {FOOTER_COMPANY_NAV.filter((item) => !item.studioOnly || studioEnabled).map((item) => (
              <li key={item.href}>
                <Link href={item.href as "/"} className="link-wipe focusable">{t(item.key)}</Link>
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
      {/* Closing wordmark: the brand drawn as one oversized outline that runs
          edge to edge and is cut by the bottom bar, the way the reference's
          footer ends. Decorative; the readable brand sits in the first column.
          It draws itself stroke by stroke when the footer is first seen. */}
      <FooterWordmark />
      <div className="border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between text-[12px] text-ink-300">
          <div>
            © {year} {company.legalName}. {t("rights")}
          </div>
          <div className="font-mono tracking-widest uppercase">{t("version")}</div>
        </div>
      </div>
    </footer>
  );
}
