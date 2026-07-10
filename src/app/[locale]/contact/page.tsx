import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { StaggerWords } from "@/components/common/StaggerWords";
import { MailCard } from "@/components/contact/MailCard";
import { company } from "@/data/company";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("eyebrow"),
    description: t("intro"),
    alternates: {
      canonical: locale === "tr" ? "/contact" : `/${locale}/contact`,
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Contact />;
}

function Contact() {
  const t = useTranslations("contact");
  return (
    <div className="page-enter relative">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[60vh] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.05), transparent 70%)",
          }}
        />
      </div>

      <section className="relative max-w-3xl mx-auto px-6 lg:px-10 pt-32 lg:pt-40 pb-12">
        <EyebrowChip>{t("eyebrow")}</EyebrowChip>
        <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[44px] sm:text-[60px] md:text-[80px]">
          <StaggerWords text={t("title")} />
        </h1>
        <p className="mt-7 max-w-[55ch] text-[16.5px] leading-[1.65] text-ink-300">
          {t("intro")}
        </p>
      </section>

      <section className="relative max-w-5xl mx-auto px-6 lg:px-10 pt-6 pb-12 grid grid-cols-1 md:grid-cols-2 gap-5">
        <MailCard
          label={t("generalLabel")}
          address={company.contact.email}
          hint={t("generalHint")}
          accent="#C3F400"
        />
        {company.contact.press ? (
          <MailCard
            label={t("pressLabel")}
            address={company.contact.press}
            hint={t("pressHint")}
            accent="#FAB81F"
          />
        ) : null}
      </section>

      <section className="relative max-w-5xl mx-auto px-6 lg:px-10 pt-12 pb-16">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-2">
              {t("locationEyebrow")}
            </div>
            <div className="font-display text-2xl font-semibold tracking-tight text-ink-50">
              {t("locationTitle")}
            </div>
            <div className="text-[14px] text-ink-400 mt-1">{t("locationNote")}</div>
          </div>
          <div className="flex items-center gap-3 text-[12px] font-mono tracking-widest uppercase text-ink-400">
            <span>Türkiye</span>
            <span className="w-px h-3 bg-white/10" />
            <span>GMT+3</span>
          </div>
        </div>
      </section>
    </div>
  );
}
