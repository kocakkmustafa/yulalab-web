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
  // YUL-13: replaced by the final Core text (country from the store region, policy-neutral teen
  // purchase sentence, Workspace sends account and parental-approval mail).
  "When you create an account you declare your birth month and year (we do not ask for the day) and your country; they are stored with your account to decide which account features and protections apply, and after the first declaration they can be corrected only through support.",
  "Accounts awaiting parental approval are not offered purchases; purchases by users under 18 are subject to the store's family and parental controls.",
  "Google (Workspace) sends parental-approval emails on our behalf.",
  // K-2 (2026-10-27): five apps use store family controls; the policy-neutral sentence gives way to
  // Core yayın profili §9 variant (B).
  "Purchases by users under 18 are subject to the store's family and parental controls.",
  // Legal pre-review 2026-10-29 (factual fixes): account mail goes through Resend, not Workspace; the
  // approval link can be resent and a sent copy stays in the mailbox.
  "Google (Google Workspace) sends account and parental-approval emails on our behalf.",
  // Counsel-approved additions + founder retention decisions (2026-10-29): rights section rewritten
  // (KVKK art. 11 list), support and deletion-receipt periods stated, terms renumbered after LifeOS §7.
  "You can view your account profile and correct your display name in the app. Send requests to access, correct or delete data to support@yulalab.com with your account email and app name. Applicable rights under Turkish data protection law (KVKK) and GDPR remain available.",
  "Closed support conversations: 90 days.",
  "Deletion receipt (one-way digest of the account ID): kept so other devices can recognise the deletion.",
  "7. Intellectual property",
  "13. Contact",
  "Teens who need approval enter a parent's or guardian's email address. One approval link is sent to it; the address itself is not stored, only a one-way digest used to limit repeated requests. The link works for 7 days and the approval page shows the teen's email address masked. If approved, account features open; if declined, the account is deleted. An account not approved within 30 days is deleted.",
];
const RETIRED_PREFIXES = [
  "These terms apply to all products developed by YULA Lab — LifeOS, Burun Farkı and Braavolabs (",
  "Deleting the account does not cancel an Apple or Google subscription; cancel it separately in your store account to stop renewal. A one-way digest of the random account ID is retained on the server as a deletion receipt so other devices can recognize deletion on a later launch. Provider",
];

describe("Motion legal copy (privacy/motion + terms)", () => {
  it("publishes parental-approval copy only after the Core-live check flipped the switch", () => {
    // Flipped after the YUL-10/YUL-15 live CORS check and CORE-07 3.1 + 2.2b (Workspace SMTP).
    expect(MOTION_PARENTAL_CONSENT_LIVE).toBe(true);
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
        ["Neden ve hangi dayanakla işliyoruz", "Why and on what legal basis we process data"],
        ["KVKK md. 11 uyarınca şu haklara sahipsiniz:", "Under KVKK article 11 you have the right to:"],
        [
          "Destek yazışmaları: son iletiden 90 gün sonra silinir, en geç 120 gün içinde kalıcı olarak kaldırılır.",
          "Support conversations: deleted 90 days after the last message and permanently removed within 120 days at the latest.",
        ],
        [
          "Silme kaydı (hesap kimliğinin tek yönlü özeti): diğer cihazların silmeyi tanıması için 3 yıl.",
          "Deletion receipt (one-way digest of the account ID): kept for 3 years so other devices can recognise the deletion.",
        ],
        [
          "Motion+ deneme kaydı (mağaza, uygulama, ilk işlem referansı, başlangıç zamanı): ücretsiz denemenin hesap başına bir kez kullanılması için; hesap silinince hemen silinir.",
          "Motion+ trial record (store, app, original transaction reference, start time): kept so the free trial is used once per account; deleted immediately with the account.",
        ],
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

    it("does not render parental-approval copy when the switch is off", async () => {
      vi.resetModules();
      vi.doMock("@/data/motion-release", () => ({ MOTION_PARENTAL_CONSENT_LIVE: false }));
      try {
        const { default: OffPage } = await import("@/app/[locale]/privacy/motion/page");
        const html = await render(OffPage, locale);
        expect(html).not.toContain("data-motion-parental-approval");
        // Heading match only: in some languages the title is also a substring of the teen paragraph.
        expect(html).not.toContain(`>${escaped(text(locale, "Veli veya vasi onayı", "Parent or guardian approval"))}</h2>`);
        expect(html).not.toContain(escaped(text(locale, "Onaylanmamış genç hesabı: 30 gün.", "Unapproved teen account: 30 days.")));
        expect(html).not.toContain(escaped(text(locale, "Gönderilen veli onayı e-postasının kopyası: 30 gün sonra silinir, en geç 60 gün içinde kalıcı olarak kaldırılır.", "Copy of a sent parental-approval email: deleted after 30 days and permanently removed within 60 days at the latest.")));
        expect(html).not.toContain("Workspace");
      } finally {
        vi.doUnmock("@/data/motion-release");
        vi.resetModules();
      }
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
        expect(html).toContain(escaped(text(locale, "Gönderilen veli onayı e-postasının kopyası: 30 gün sonra silinir, en geç 60 gün içinde kalıcı olarak kaldırılır.", "Copy of a sent parental-approval email: deleted after 30 days and permanently removed within 60 days at the latest.")));
        expect(html).toContain(escaped(text(locale, "Bu kopya 30 gün sonra silinir ve en geç 60 gün içinde kalıcı olarak kaldırılır.", "This copy is deleted after 30 days and permanently removed within 60 days at the latest.")));
        expect(html).toContain(escaped(text(locale, "Google (Google Workspace) veli onayı e-postalarını bizim adımıza gönderir.", "Google (Google Workspace) sends parental-approval emails on our behalf.")));
      } finally {
        vi.doUnmock("@/data/motion-release");
        vi.resetModules();
      }
    });

    it("renders the Motion special terms as section 5, LifeOS as section 7, and numbers sections 1–14 in order", async () => {
      const html = await render(TermsPage, locale);
      expect(html).toContain(escaped(text(locale, "5. Motion uygulamaları — özel şartlar", "5. Motion apps — special terms")));
      expect(html).toContain(escaped(text(locale, "7. LifeOS — özel şartlar", "7. LifeOS — special terms")));
      expect(html).toContain("data-motion-terms");
      const numbers = [...html.matchAll(/<h2[^>]*>\s*(\d+)\.\s/g)].map((match) => Number(match[1]));
      expect(numbers).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
      expect(html).not.toMatch(RETIRED_SALES);
    });
  });
});
