import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
// Isolate our alias/locale guard from Next's ESM runtime. next-intl rendering
// is an HTTP/build acceptance, not claimed by this local delegation test.
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null, {status: 209}) }));
import middleware from "@/middleware";
vi.mock("next-intl/server", () => ({getTranslations: async () => (key: string) => key, setRequestLocale: () => {}}));
vi.mock("@/i18n/navigation", () => ({Link: "a"}));
import { generateMetadata as transparencyMetadata } from "@/app/[locale]/transparency/page";
import { LOCALE_LABELS, SUPPORTED_LOCALES, localeAlternates } from "@/i18n/locales";
import sitemap from "@/app/sitemap";
import { siteOrigin } from "@/lib/site-origin";

afterEach(() => vi.unstubAllEnvs());

describe("fourteen-language routing and public discovery", () => {
  it.each(SUPPORTED_LOCALES)("%s transparency metadata lists all approved translations", async (locale) => {
    const meta = await transparencyMetadata({params: Promise.resolve({locale})});
    expect(meta.alternates?.languages).toEqual(localeAlternates("/transparency"));
    expect(meta.alternates?.canonical).toBe(locale === "tr" ? "/transparency" : `/${locale}/transparency`);
  });
  it.each(SUPPORTED_LOCALES)("%s Links alias forwards only the selected language", (locale) => {
    const response = middleware(new NextRequest(`https://yulalab.com/${locale}/links?token=private&returnTo=elsewhere`));
    const target = new URL(response.headers.get("location")!);
    expect(response.status).toBe(308);
    expect(target.origin).toBe("https://links.yulalab.com");
    expect([...target.searchParams]).toEqual([["lang", locale]]);
    expect(LOCALE_LABELS[locale]).toBeTruthy();
  });
  it.each(SUPPORTED_LOCALES)("%s page reaches the locale middleware", (locale) => {
    const response = middleware(new NextRequest(`https://yulalab.com/${locale}/privacy`, {headers:{host:"yulalab.com"}}));
    // TR is canonicalized first; all other approved prefixes are delegated.
    expect(response.status).toBe(locale === "tr" ? 307 : 209);
    if (locale === "tr") expect(response.headers.get("location")).toBe("https://yulalab.com/privacy");
  });
  it.each(["xx", "es-MX", "pt-PT", "zh", "zh-Hant", "zh-TW", "zh-HK", "zh-MO", "zh-Hant-CN", "zh-Hant-TW"])("unsupported %s prefixes remain 404", (locale) => {
    expect(middleware(new NextRequest(`https://yulalab.com/${locale}/privacy`)).status).toBe(404);
  });
  it.each([
    ["PT-br", "pt-BR"], ["ZH-HANS", "zh-Hans"], ["zh-CN", "zh-Hans"], ["zh-SG", "zh-Hans"], ["EN", "en"],
  ])("canonicalizes the explicit alias %s without losing query or setting an unrelated language", (alias, canonical) => {
    const response = middleware(new NextRequest(`https://yulalab.com/${alias}/privacy?view=fixture`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://yulalab.com/${canonical}/privacy?view=fixture`);
    expect(response.headers.get("set-cookie")).toContain(`NEXT_LOCALE=${canonical}`);
  });
  it.each(SUPPORTED_LOCALES)("canonicalizes encoded %s capability aliases before their response policy", (locale) => {
    const encoded = `%${locale.charCodeAt(0).toString(16)}${locale.slice(1)}`;
    const response = middleware(new NextRequest(`https://yulalab.com/${encoded}/data-request/%76erify`));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://yulalab.com${locale === "tr" ? "" : "/" + locale}/data-request/verify`);
  });
  it("lists each translated page once without a fabricated modification date", () => {
    const entries = sitemap();
    expect(entries).toHaveLength(25 * SUPPORTED_LOCALES.length);
    expect(new Set(entries.map((entry) => entry.url)).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined();
      expect(Object.keys(entry.alternates!.languages!)).toEqual([...SUPPORTED_LOCALES]);
    }
    expect(localeAlternates("/privacy")["pt-BR"]).toBe("/pt-BR/privacy");
  });
  it("uses the same explicit or stable origin for sitemap and metadata", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "preview.example.test");
    expect(siteOrigin()).toBe("https://yulalab.com");
    expect(sitemap()[0].url).toBe("https://yulalab.com");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.test/");
    expect(siteOrigin()).toBe("https://www.example.test");
    expect(sitemap()[0].url).toBe("https://www.example.test");
  });
});
