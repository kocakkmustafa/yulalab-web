import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { text } from "@/lib/localized";
import { company } from "@/data/company";
import MotionAccountDeletionPage, { generateMetadata } from "@/app/[locale]/delete-account/motion/page";
import MotionPrivacyPage from "@/app/[locale]/privacy/motion/page";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));

const escaped = (value: string) => renderToStaticMarkup(<>{value}</>);
const render = async (
  page: (props: { params: Promise<{ locale: string }> }) => Promise<React.ReactElement>,
  locale: string,
) => {
  const element = await page({ params: Promise.resolve({ locale }) });
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={{}}>{element}</NextIntlClientProvider>);
};

const APPS = [
  "Choreia: Learn to Dance",
  "Lissom: Mobility & Yoga",
  "Gravita: Skills & Strength",
  "JabLab: Shadow Training",
  "Ostinato: Music Practice",
];

// Sentences the deletion page shares with privacy/motion; both pages must render the same text.
const SHARED: Array<[string, string]> = [
  ["Motion hesabını ve verilerini silme", "Delete a Motion account and its data"],
  [
    "Tek Motion hesabı beş uygulamada ortaktır; silme beşini birden etkiler. Çevrimdışı bir cihaz, internete bağlanıp uygulamayı açana kadar o hesabın yerel geçmişini tutar ve silme kaydını gördüğünde temizler; silme kanıtı yoksa yerel veriyi silmez.",
    "One Motion account is shared by all five apps, so deletion affects all of them. An offline device keeps that account's local history until it is online and the app is opened; it then clears the history after seeing the deletion receipt and never deletes local data without that proof.",
  ],
  [
    "Hesap silindiğinde sunucudaki ürün verileri hemen silinir. Yedekler en fazla 30 günlük bir döngüde tutulur; bir yedekten geri dönülürse, o tarihten sonra silinmiş hesaplar yeniden silinir.",
    "When an account is deleted, its product data on the server is deleted immediately. Backups are kept on a cycle of at most 30 days; if a backup is ever restored, accounts deleted after that point are deleted again.",
  ],
  ["Sağlayıcı günlükleri: en fazla 30 gün.", "Provider logs: at most 30 days."],
  ["Kapanan destek yazışmaları: 90 gün.", "Closed support conversations: 90 days."],
];

describe.each(SUPPORTED_LOCALES)("Motion account deletion page (%s)", (locale) => {
  it("names the five apps and the publisher, and links the email request without the app", async () => {
    const html = await render(MotionAccountDeletionPage, locale);
    for (const app of APPS) expect(html).toContain(escaped(app));
    expect(html).toContain(escaped(company.legalName));
    expect(html).not.toContain("{publisher}");
    expect(html).toContain('href="mailto:support@yulalab.com?subject=Motion%20account%20deletion"');
    const steps = /<ol[^>]*data-motion-deletion-steps[^>]*>(.*?)<\/ol>/s.exec(html)?.[1] ?? "";
    expect(steps.match(/<li>/g)).toHaveLength(3);
  });

  it("renders the deletion and retention sentences exactly as privacy/motion does", async () => {
    const [page, privacy] = await Promise.all([render(MotionAccountDeletionPage, locale), render(MotionPrivacyPage, locale)]);
    for (const [tr, en] of SHARED) {
      const sentence = escaped(text(locale, tr, en));
      expect(page).toContain(sentence);
      expect(privacy).toContain(sentence);
    }
  });

  it("is canonical at /delete-account/motion in this language", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(metadata.alternates?.canonical).toBe(locale === "tr" ? "/delete-account/motion" : `/${locale}/delete-account/motion`);
  });
});
