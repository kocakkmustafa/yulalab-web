import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { text } from "@/lib/localized";
import { company } from "@/data/company";
import { MOTION_PARENTAL_CONSENT_LIVE } from "@/data/motion-release";
import MotionPrivacyPage from "@/app/[locale]/privacy/motion/page";
import TermsPage from "@/app/[locale]/terms/page";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));

const root = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const SECONDARY = SUPPORTED_LOCALES.filter((locale) => locale !== "tr" && locale !== "en");
const escaped = (value: string) => renderToStaticMarkup(<>{value}</>);
const render = async (
  page: (props: { params: Promise<{ locale: string }> }) => Promise<React.ReactElement>,
  locale: string,
) => {
  const element = await page({ params: Promise.resolve({ locale }) });
  return renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={{}}>{element}</NextIntlClientProvider>);
};

// Same retired "sales closed" phrasings as motion-sales-copy.test.ts.
const RETIRED_SALES = /paid sales|ücretli satış|kostenpflichtiger Verkauf|ventes payantes|ventas (?:de pago|pagadas)|vendas pagas|有料販売|البيع المدفوع|المبيعات المدفوعة|vendite a pagamento|유료 판매|penjualan berbayar|płatna sprzedaż|भुगतान वाली बिक्री|付费销售|If subscriptions are enabled|Abonelikler açılırsa|cannot start subscription purchases|satın alma başlatılamaz/i;
const PLACEHOLDER = /\[(?:email provider|e-posta sağlayıcısı)\]/;
// Catalogue keys whose source sentences/headings were replaced by the Motion legal copy.
const RETIRED_KEYS = [
  "The applications are not directed at children and do not knowingly collect data from children.",
  "5. Burun Farkı — special terms",
  "6. Intellectual property",
  "12. Contact",
];
const RETIRED_PREFIXES = [
  "These terms apply to all products developed by YULA Lab — LifeOS, Burun Farkı and Braavolabs (",
  "Deleting the account does not cancel an Apple or Google subscription; cancel it separately in your store account to stop renewal. A one-way digest of the random account ID is retained on the server as a deletion receipt so other devices can recognize deletion on a later launch. Provider",
];

describe("Motion legal copy (privacy/motion + terms)", () => {
  it("keeps parental-approval copy behind the Core-live switch until it is flipped on purpose", () => {
    expect(MOTION_PARENTAL_CONSENT_LIVE).toBe(false);
  });

  it.each(["src/app/[locale]/privacy/motion/page.tsx", "src/app/[locale]/terms/page.tsx"])(
    "%s has no sales-closed claim or provider placeholder",
    (rel) => {
      const source = read(rel);
      expect(source).not.toMatch(RETIRED_SALES);
      expect(source).not.toMatch(PLACEHOLDER);
    },
  );

  it.each(SECONDARY)("%s catalogue drops the replaced keys", (locale) => {
    const catalogue = JSON.parse(read(`messages/content-${locale}.json`)) as Record<string, string>;
    for (const key of RETIRED_KEYS) expect(catalogue).not.toHaveProperty([key]);
    for (const prefix of RETIRED_PREFIXES) expect(Object.keys(catalogue).some((key) => key.startsWith(prefix))).toBe(false);
    expect(JSON.stringify(catalogue)).not.toMatch(PLACEHOLDER);
  });

  describe.each(SUPPORTED_LOCALES)("%s", (locale) => {
    it("renders the Motion privacy teen, retention and data-role sections in this language", async () => {
      const html = await render(MotionPrivacyPage, locale);
      for (const [tr, en] of [
        ["Gençler ve yaş sınırı", "Teens and minimum age"],
        ["Saklama süreleri", "Retention"],
        ["Veri rolleri ve alt işleyenler", "Data roles and processors"],
        ["Sağlayıcı günlükleri: en fazla 30 gün.", "Provider logs: at most 30 days."],
      ]) {
        expect(html).toContain(escaped(text(locale, tr, en)));
      }
      // The data-roles controller must equal the Contact section's controller, whatever
      // company record is current (the REL-03 publisher record replaces both together).
      const label = escaped(text(locale, "Veri Sorumlusu", "Data Controller"));
      const contact = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: ([^<]+)<br`).exec(html)?.[1];
      expect(contact).toContain(escaped(company.legalName));
      const controller = text(locale, "Veri sorumlusu: {controller}.", "The data controller is {controller}.", {
        controller: "@@CONTROLLER@@",
      });
      expect(html).toContain(escaped(controller).replace("@@CONTROLLER@@", contact!));
      expect(html).not.toContain(`>${escaped(text(locale, "Çocuklar", "Children"))}</h2>`);
      expect(html).not.toMatch(RETIRED_SALES);
      expect(html).not.toMatch(PLACEHOLDER);
    });

    it("does not render parental-approval copy while Core consent is not live", async () => {
      const html = await render(MotionPrivacyPage, locale);
      expect(html).not.toContain("data-motion-parental-approval");
      // Heading match only: in some languages the title is also a substring of the teen paragraph.
      expect(html).not.toContain(`>${escaped(text(locale, "Veli veya vasi onayı", "Parent or guardian approval"))}</h2>`);
      expect(html).not.toContain(escaped(text(locale, "Onaylanmamış genç hesabı: 30 gün.", "Unapproved teen account: 30 days.")));
      expect(html).not.toContain("Workspace");
    });

    it("renders the parental-approval copy in this language once the switch is on", async () => {
      vi.resetModules();
      vi.doMock("@/data/motion-release", () => ({ MOTION_PARENTAL_CONSENT_LIVE: true }));
      try {
        const { default: LivePage } = await import("@/app/[locale]/privacy/motion/page");
        const html = await render(LivePage, locale);
        expect(html).toContain("data-motion-parental-approval");
        expect(html).toContain(`>${escaped(text(locale, "Veli veya vasi onayı", "Parent or guardian approval"))}</h2>`);
        expect(html).toContain(escaped(text(locale, "Onaylanmamış genç hesabı: 30 gün.", "Unapproved teen account: 30 days.")));
        expect(html).toContain(escaped(text(locale, "Google (Workspace) veli onayı e-postalarını bizim adımıza gönderir.", "Google (Workspace) sends parental-approval emails on our behalf.")));
      } finally {
        vi.doUnmock("@/data/motion-release");
        vi.resetModules();
      }
    });

    it("renders the Motion special terms as section 5 and numbers sections 1–13 in order", async () => {
      const html = await render(TermsPage, locale);
      expect(html).toContain(escaped(text(locale, "5. Motion uygulamaları — özel şartlar", "5. Motion apps — special terms")));
      expect(html).toContain("data-motion-terms");
      const numbers = [...html.matchAll(/<h2[^>]*>\s*(\d+)\.\s/g)].map((match) => Number(match[1]));
      expect(numbers).toEqual(Array.from({ length: 13 }, (_, index) => index + 1));
      expect(html).not.toMatch(RETIRED_SALES);
    });
  });
});
