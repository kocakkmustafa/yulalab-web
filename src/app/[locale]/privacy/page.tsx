import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "@/components/common/icons";
import { EyebrowChip } from "@/components/common/EyebrowChip";
import { projects } from "@/data/projects";
import { GlassSheen } from "@/components/common/GlassSheen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTR = locale === "tr";
  return {
    title: isTR ? "Gizlilik · YULA Lab" : "Privacy · YULA Lab",
    description: isTR
      ? "Braavolabs, Burun Farkı ve LifeOS için gizlilik politikalarımız."
      : "Privacy policies for Braavolabs, Burun Farkı and LifeOS.",
    alternates: {
      canonical: isTR ? "/privacy" : `/${locale}/privacy`,
    },
  };
}

export default async function PrivacyIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyIndex />;
}

// Only products with a dedicated /privacy/<slug> route belong here — a
// "coming-soon" product hasn't launched and collects no data yet, so
// linking to a policy page that doesn't exist would be a dead link. Filter
// stays semantic (not a slug allow-list) so a future product automatically
// joins this index the moment it ships its own policy page and status.
const projectsWithPrivacyPolicy = projects.filter((p) => p.status !== "coming-soon");

function PrivacyIndex() {
  const locale = useLocale();
  const isTR = locale === "tr";

  return (
    <div className="page-enter relative">
      <GlassSheen />
      <div className="ambient" aria-hidden />
      <section className="relative pt-32 pb-16 lg:pt-40">
        <div className="max-w-4xl mx-auto px-6 lg:px-10">
          <EyebrowChip>{isTR ? "Gizlilik" : "Privacy"}</EyebrowChip>

          <h1 className="mt-7 font-display font-extrabold text-ink-50 leading-[0.96] tracking-tightest text-[44px] sm:text-[56px] md:text-[64px]">
            {isTR ? "Verinize saygı duyuyoruz." : "We respect your data."}
          </h1>

          <p className="mt-7 max-w-[52ch] text-[16.5px] md:text-[17.5px] leading-[1.6] text-ink-300">
            {isTR
              ? "YULA Lab ürünlerinin her biri farklı bir gizlilik mekaniğine sahiptir; ancak hepsi aynı dört garantiye dayanır: verinize sahip olursunuz, modeller eğitilirken kullanılmaz, reklam yok, çıkış kapısı her zaman açık. Aşağıdan ilgili ürünün politikasını seçin."
              : "Each YULA Lab product has a different privacy mechanic; all share the same four guarantees: you own your data, it's never used for model training, no ads, and you can leave at any time. Pick a product below."}
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {projectsWithPrivacyPolicy.map((p) => (
              <Link
                key={p.slug}
                href={`/privacy/${p.slug}`}
                className="glass group block p-6 transition-colors focusable"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
                    {p.slug}
                  </span>
                  <ArrowUpRight
                    size={14}
                    strokeWidth={2}
                    className="arrow-nudge text-ink-400 group-hover:text-ink-100"
                  />
                </div>
                <div className="mt-6 font-display font-bold text-[22px] text-ink-50">
                  {p.name}
                </div>
                <div className="mt-2 text-sm text-ink-300 leading-relaxed">
                  {isTR ? "Politikayı oku →" : "Read the policy →"}
                </div>
              </Link>
            ))}

            {/* Motion is the one exception to the per-slug rule above: five
                applications (Choreia, Lissom, Gravita, JabLab, Ostinato) share
                a single policy because they share one privacy mechanic — the
                camera never leaves the device. Five identical pages would be
                five things to keep in sync, so the family gets one route
                (/privacy/motion) instead of five. The apps are still
                "coming-soon" and therefore correctly absent from the filtered
                list above; this card is what App Store Connect points at. */}
            <Link
              href="/privacy/motion"
              className="glass group block p-6 transition-colors focusable"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] tracking-widest uppercase text-ink-400">
                  motion
                </span>
                <ArrowUpRight
                  size={14}
                  strokeWidth={2}
                  className="arrow-nudge text-ink-400 group-hover:text-ink-100"
                />
              </div>
              <div className="mt-6 font-display font-bold text-[22px] text-ink-50">
                {isTR ? "Motion uygulamaları" : "Motion apps"}
              </div>
              <div className="mt-2 text-sm text-ink-300 leading-relaxed">
                {isTR
                  ? "Choreia · Lissom · Gravita · JabLab · Ostinato — ortak politika →"
                  : "Choreia · Lissom · Gravita · JabLab · Ostinato — shared policy →"}
              </div>
            </Link>
          </div>

          <div className="mt-16 pt-10 border-t border-white/10">
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-400 mb-3">
              {isTR ? "Ortak Çerçeve" : "Shared Framework"}
            </div>
            <p className="text-[15px] leading-[1.65] text-ink-200 max-w-[60ch]">
              {isTR
                ? "Her ürünümüzün gizlilik politikası, KVKK (6698) ve GDPR'nin öngördüğü temel unsurları kapsar: toplanan veri kategorileri, üçüncü taraflar, saklama süresi, kullanıcı hakları ve iletişim bilgileri."
                : "Every product's privacy policy addresses the core elements required by Turkey's KVKK (Law 6698) and the EU GDPR: the data categories collected, third parties, retention periods, user rights, and contact information."}
            </p>
            <div className="mt-6">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-sm text-ink-200 hover:text-ink-50 link-wipe"
              >
                {isTR ? "Veri talebi veya soru için iletişim" : "Contact us for data requests or questions"}
                <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
