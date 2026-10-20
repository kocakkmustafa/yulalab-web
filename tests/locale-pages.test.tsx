import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import ContactPage from "@/app/[locale]/contact/page";
import StudioPage from "@/app/[locale]/studio/page";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { company } from "@/data/company";

const controls = vi.hoisted(() => ({ leads: true, studio: true }));
vi.mock("@/server/lead-surface", () => ({ leadsEnabled: () => controls.leads }));
vi.mock("@/server/studio-surface", () => ({ studioEnabled: () => controls.studio }));
// These boundaries cannot reach DB, provider or Next request/navigation I/O.
vi.mock("@/server/mail", () => ({ mailTransport: () => ({ configured: false }) }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (to: string): never => { throw Error(`NEXT_REDIRECT:${to}`); } }));
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));
vi.mock("@/components/common/GlassSheen", () => ({ GlassSheen: () => null }));
vi.mock("@/components/common/StaggerWords", () => ({ StaggerWords: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock("@/lib/analytics/client", () => ({ track: vi.fn() }));

const load = (locale: string) => JSON.parse(readFileSync(path.resolve(import.meta.dirname, `../messages/${locale}.json`), "utf8"));
const escaped = (value: string) => renderToStaticMarkup(<>{value}</>);
const render = (element: ReactElement, locale: string) => renderToStaticMarkup(
  <NextIntlClientProvider locale={locale} messages={load(locale)} now={new Date("2026-10-20T09:00:00Z")}>
    {element}
  </NextIntlClientProvider>,
);

afterEach(() => { controls.leads = true; controls.studio = true; vi.unstubAllGlobals(); });

describe.each(SUPPORTED_LOCALES)("actual async contact/studio SSR in %s", (locale) => {
  it("opens Contact intake only for TR/EN, preserving the real email alternative", async () => {
    const fetch = vi.fn(() => { throw Error("SSR must not request a provider"); });
    vi.stubGlobal("fetch", fetch);
    const result = await ContactPage({ params: Promise.resolve({ locale }) });
    const html = render(result, locale);
    expect(html).toContain(`href="mailto:${company.contact.email}"`);
    if (locale === "tr" || locale === "en") {
      expect(html).toContain("<form");
      expect(html).toContain('name="email"');
      expect(html).not.toContain("data-intake-language-notice");
    } else {
      expect(html).not.toContain("<form");
      expect(html).toContain("data-intake-language-notice");
      expect(html).toContain(escaped(load(locale).contact.intakeLanguageNotice));
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses a form for TR/EN Studio and a localized mail card for the other six", async () => {
    const result = await StudioPage({ params: Promise.resolve({ locale }) });
    const html = render(result, locale);
    if (locale === "tr" || locale === "en") {
      expect(html).toContain("<form");
      expect(html).toContain('name="problem"');
      expect(html).not.toContain("data-intake-language-notice");
    } else {
      expect(html).not.toContain("<form");
      expect(html).toContain("data-intake-language-notice");
      expect(html).toContain(escaped(load(locale).studio.form.intakeLanguageNotice));
      expect(html).toContain(`href="mailto:${company.contact.email}"`);
      // A language gate must not say the entire site collects no form data.
      expect(html).not.toContain(escaped(load(locale).studio.form.closedBody));
    }
  });

  it("closes real Contact/Studio form markup with leads disabled", async () => {
    controls.leads = false;
    const contact = render(await ContactPage({ params: Promise.resolve({ locale }) }), locale);
    const studio = render(await StudioPage({ params: Promise.resolve({ locale }) }), locale);
    expect(contact).not.toContain("<form");expect(studio).not.toContain("<form");
    expect(contact).toContain(`href="mailto:${company.contact.email}"`);
    if (locale === "tr" || locale === "en") {
      expect(studio).toContain(escaped(load(locale).studio.form.closedBody));
      expect(studio).toContain('href="/contact"');
    } else {
      expect(studio).toContain(`href="mailto:${company.contact.email}"`);
    }
  });

  it("keeps disabled Studio behind the corresponding locale contact route", async () => {
    controls.studio = false;
    await expect(StudioPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(
      `NEXT_REDIRECT:${locale === "tr" ? "" : "/" + locale}/contact`,
    );
  });
});
