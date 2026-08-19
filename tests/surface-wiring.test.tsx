import { afterEach, describe, expect, it, vi } from "vitest";
import ContactPage from "@/app/[locale]/contact/page";
import PrivacyPage from "@/app/[locale]/privacy/page";
import { mailTransport } from "@/server/mail";

/**
 * The three booleans that decide whether the site collects personal data,
 * and whether it says so.
 *
 * Grepping the source for `leadsEnabled()` does NOT guard these: negating
 * the call satisfies the grep, and the resulting page tells a reader there
 * is no contact form while a live form collects their name, email and
 * message. Nothing in the e2e suite catches it either — LEADS_ENABLED is
 * set nowhere in CI, so every rendered test only ever sees the closed
 * branch.
 *
 * A server component is a function returning an element, so the wiring can
 * be read off `props` without rendering anything.
 */
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {} }));
// next-intl's navigation helpers reach for next/navigation, which does not
// resolve outside a Next runtime. Neither page's wiring depends on it.
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

async function contactProps() {
  const element = await ContactPage({ params: Promise.resolve({ locale: "tr" }) });
  return (element as { props: { enabled: boolean; mailConfigured: boolean } }).props;
}

async function privacyProps() {
  const element = await PrivacyPage({ params: Promise.resolve({ locale: "tr" }) });
  return (element as { props: { formOpen: boolean } }).props;
}

describe("the contact page follows the switch", () => {
  it("hides the form while collection is closed", async () => {
    delete process.env.LEADS_ENABLED;
    expect((await contactProps()).enabled).toBe(false);
  });

  it("shows it when collection is open", async () => {
    // Inverting the wiring renders a form while the sink answers 503.
    process.env.LEADS_ENABLED = "1";
    expect((await contactProps()).enabled).toBe(true);
  });
});

describe("the privacy notice follows the same switch", () => {
  it("says there is no form while there is none", async () => {
    delete process.env.LEADS_ENABLED;
    expect((await privacyProps()).formOpen).toBe(false);
  });

  it("says there is one when there is", async () => {
    // The direction that matters: negated wiring leaves a legal notice
    // stating no form exists while one collects name, email and message.
    process.env.LEADS_ENABLED = "1";
    expect((await privacyProps()).formOpen).toBe(true);
  });
});

describe("the emailed-a-copy claim follows the transport", () => {
  it("is false when nothing can send", async () => {
    process.env.LEADS_ENABLED = "1";
    delete process.env.SENDGRID_API_KEY;
    expect((await contactProps()).mailConfigured).toBe(false);
    expect(mailTransport().configured).toBe(false);
  });

  it("tracks mailTransport(), not a constant", async () => {
    process.env.LEADS_ENABLED = "1";
    process.env.SENDGRID_API_KEY = "SG.key";
    process.env.MAIL_FROM = "hello@yulalab.com";
    expect((await contactProps()).mailConfigured).toBe(true);
    expect((await contactProps()).mailConfigured).toBe(mailTransport().configured);
  });
});
