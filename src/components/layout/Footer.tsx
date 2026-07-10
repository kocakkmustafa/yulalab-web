import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { YulaMark } from "@/components/common/YulaMark";
import { XLogo, Linkedin, Instagram } from "@/components/common/icons";
import { company } from "@/data/company";
import { projects } from "@/data/projects";
import type { Locale } from "@/lib/types";

const SOCIAL_ICON = { x: XLogo, linkedin: Linkedin, instagram: Instagram } as const;

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale() as Locale;
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] mt-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <YulaMark />
            <span className="font-display font-semibold">YULA Lab</span>
          </div>
          <p className="mt-4 text-sm text-ink-300 leading-relaxed max-w-[26ch]">
            {t("tagline")}
          </p>
          <div className="mt-6 font-mono text-[11px] tracking-widest text-ink-400 uppercase">
            {t("location")}
          </div>
          <div className="mt-5 flex items-center gap-3">
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
                    aria-label={key}
                    className="text-ink-400 hover:text-ink-50 transition-colors focusable"
                  >
                    <Icon size={16} />
                  </a>
                );
              },
            )}
          </div>
        </div>

        <div>
          <div className="font-mono text-[11px] tracking-widest text-ink-400 uppercase mb-4">
            {t("projectsHeading")}
          </div>
          <ul className="flex flex-col gap-2.5 text-sm text-ink-200">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="link-wipe hover:text-ink-50"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="font-mono text-[11px] tracking-widest text-ink-400 uppercase mb-4">
            {t("companyHeading")}
          </div>
          <ul className="flex flex-col gap-2.5 text-sm text-ink-200">
            <li>
              <Link href="/manifesto" className="link-wipe">
                {t("navManifesto")}
              </Link>
            </li>
            <li>
              <Link href="/transparency" className="link-wipe">
                {t("navTransparency")}
              </Link>
            </li>
            <li>
              <Link href="/projects" className="link-wipe">
                {t("navProjects")}
              </Link>
            </li>
            <li>
              <Link href="/notes" className="link-wipe">
                {t("navNotes")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="link-wipe">
                {t("navContact")}
              </Link>
            </li>
            <li>
              <a href={`mailto:${company.contact.email}`} className="link-wipe">
                {company.contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-mono text-[11px] tracking-widest text-ink-400 uppercase mb-4">
            {t("legalHeading")}
          </div>
          <ul className="flex flex-col gap-2.5 text-sm text-ink-200">
            <li>
              <Link href="/privacy" className="link-wipe">
                {t("navPrivacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className="link-wipe">
                {t("navTerms")}
              </Link>
            </li>
            <li>
              <Link href="/support" className="link-wipe">
                {t("navSupport")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-mono text-[11px] tracking-widest text-ink-400 uppercase mb-4">
            {t("founderHeading")}
          </div>
          <div className="text-sm text-ink-200">{company.founder.name}</div>
          <div className="text-sm text-ink-400 mt-1">
            {company.founder.role[locale]}
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between text-[12px] text-ink-400">
          <div>
            © {year} {company.legalName}. {t("rights")}
          </div>
          <div className="font-mono tracking-widest uppercase">{t("version")}</div>
        </div>
      </div>
    </footer>
  );
}
