import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { DATA_RIGHTS_COPY, LANGUAGE_STORAGE_COPY, CHILD_DATA_CONTACT } from "@/data/privacy-copy";
import LifeosPrivacyPage from "@/app/[locale]/privacy/lifeos/page";
import BraavolabsPrivacyPage from "@/app/[locale]/privacy/braavolabs/page";
import BurunfarkiPrivacyPage from "@/app/[locale]/privacy/burunfarki/page";

vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));
// Isolate supplemental translation lookup. The actual typed rights paragraphs
// and real page renderers remain under test for every approved locale.
vi.mock("@/lib/localized", () => ({ text: (locale: string, tr: string, en: string) => locale === "tr" ? tr : en }));

const escaped = (value: string) => renderToStaticMarkup(<>{value}</>);

it("defines all three privacy-copy contracts for exactly the approved fourteen locales", () => {
  for (const record of [DATA_RIGHTS_COPY, LANGUAGE_STORAGE_COPY, CHILD_DATA_CONTACT]) {
    expect(Object.keys(record)).toEqual([...SUPPORTED_LOCALES]);
    for (const value of Object.values(record)) expect(value.trim()).not.toBe("");
  }
});

describe.each(SUPPORTED_LOCALES)("typed rights paragraphs in %s", (locale) => {
  it("preserves the common rights/contact references and language-storage identifiers", () => {
    expect(DATA_RIGHTS_COPY[locale]).toContain("support@yulalab.com");
    expect(DATA_RIGHTS_COPY[locale]).toContain("KVKK");
    expect(DATA_RIGHTS_COPY[locale]).toContain("15–22");
    expect(DATA_RIGHTS_COPY[locale]).toContain("30");
    expect(LANGUAGE_STORAGE_COPY[locale]).toContain("NEXT_LOCALE");
    expect(LANGUAGE_STORAGE_COPY[locale]).toContain("yula.links.locale");
    expect(LANGUAGE_STORAGE_COPY[locale]).toContain("yula.appearance.v1");
    expect(LANGUAGE_STORAGE_COPY[locale]).toContain("links.yulalab.com");
  });

  it.each([
    ["LifeOS", LifeosPrivacyPage],
    ["Braavolabs", BraavolabsPrivacyPage],
    ["Burun Farkı", BurunfarkiPrivacyPage],
  ] as const)("renders the actual %s policy rights paragraph for this locale", async (_name, page) => {
    const element = await page({ params: Promise.resolve({ locale }) });
    const html = renderToStaticMarkup(<NextIntlClientProvider locale={locale} messages={{}}>{element}</NextIntlClientProvider>);
    expect(html).toContain(escaped(DATA_RIGHTS_COPY[locale]));
  });
});

it("keeps the TR KVKK deadline distinct from conditional GDPR rights and the calendar month", () => {
  expect(DATA_RIGHTS_COPY.tr).toContain("KVKK'nın 11. maddesindeki");
  expect(DATA_RIGHTS_COPY.tr).toContain("GDPR uygulanıyorsa 15–22.");
  expect(DATA_RIGHTS_COPY.tr).toContain("kendi yasal şartlarına tabidir");
  expect(DATA_RIGHTS_COPY.tr).toMatch(/KVKK başvuruları[^;]+en geç 30 gün içinde; GDPR talepleri[^.]+bir ay içinde/);
  expect(DATA_RIGHTS_COPY.tr).toContain("ilk ay içinde gerekçesiyle");
  expect(CHILD_DATA_CONTACT.tr).toContain("genel bir garanti vermiyoruz");
});

it("keeps the EN KVKK deadline distinct from conditional GDPR rights and an explained extension", () => {
  expect(DATA_RIGHTS_COPY.en).toContain("Article 11");
  expect(DATA_RIGHTS_COPY.en).toContain("Where GDPR applies");
  expect(DATA_RIGHTS_COPY.en).toContain("their own statutory conditions");
  expect(DATA_RIGHTS_COPY.en).toMatch(/KVKK requests[^;]+within 30 days; GDPR requests[^.]+one month/);
  expect(DATA_RIGHTS_COPY.en).toContain("its reasons within the first month");
  expect(CHILD_DATA_CONTACT.en).toContain("do not give a blanket guarantee");
});
