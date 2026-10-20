import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

// Only unwrap next-intl's configuration registration. The actual request
// resolver and JSON imports remain under test; no HTTP or browser negotiation.
vi.mock("next-intl/server", () => ({ getRequestConfig: (factory: unknown) => factory }));
import requestConfig from "@/i18n/request";
const catalogue = (locale: string) => JSON.parse(readFileSync(path.resolve(import.meta.dirname, `../messages/${locale}.json`), "utf8"));

describe("selected-locale request catalogue", () => {
  it.each(SUPPORTED_LOCALES)("loads the actual %s main catalogue", async (locale) => {
    const config = await requestConfig({ requestLocale: Promise.resolve(locale) });
    expect(config.locale).toBe(locale);
    expect(config.messages).toEqual(catalogue(locale));
  });

  it.each([
    ["zh-CN", "zh-Hans"], ["zh-SG", "zh-Hans"], ["ZH-HANS", "zh-Hans"],
    ["pt-br", "pt-BR"], ["EN", "en"], ["TR", "tr"],
  ])("canonicalizes the explicit alias %s to %s", async (requested, locale) => {
    const config = await requestConfig({ requestLocale: Promise.resolve(requested) });
    expect(config.locale).toBe(locale);
    expect(config.messages).toEqual(catalogue(locale));
  });

  it.each(["zh", "zh-Hant", "zh-TW", "zh-HK", "zh-Hant-CN", "xx", "../en", "constructor", undefined])("uses the established TR fallback for unsupported request context %s", async (requested) => {
    const config = await requestConfig({ requestLocale: Promise.resolve(requested) });
    expect(config.locale).toBe("tr");
    expect(config.messages).toEqual(catalogue("tr"));
  });
});
