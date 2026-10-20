// @vitest-environment jsdom
import { createElement, type AnchorHTMLAttributes, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import LandingPage from "@/app/[locale]/page";
import { StaticExperience } from "@/components/experience/StaticExperience";
import { ExperienceHeader, ProofLedger } from "@/components/experience/ExperienceOverlay";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { ExperienceCopy, ExperienceProduct } from "@/components/experience/types";
import { localePath, SUPPORTED_LOCALES, type Locale } from "@/i18n/locales";
import { text } from "@/lib/localized";
import tr from "../messages/tr.json";
import en from "../messages/en.json";
import es from "../messages/es-419.json";
import pt from "../messages/pt-BR.json";
import de from "../messages/de.json";
import fr from "../messages/fr.json";
import ja from "../messages/ja.json";
import ar from "../messages/ar.json";
import itMessages from "../messages/it.json";
import ko from "../messages/ko.json";
import id from "../messages/id.json";
import pl from "../messages/pl.json";
import hi from "../messages/hi.json";
import zhHans from "../messages/zh-Hans.json";

const catalogues = { tr, en, "es-419": es, "pt-BR": pt, de, fr, ja, ar, it: itMessages, ko, id, pl, hi, "zh-Hans": zhHans };
const navigation = vi.hoisted(() => ({ locale: "fr" as Locale, replace: vi.fn() }));
type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: AnchorProps) => createElement("a", { ...props, href }, children) }));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: navigation.replace }),
  Link: ({ href, children, ...props }: AnchorProps) => createElement("a", { ...props, href: localePath(navigation.locale, href) }, children),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found"); } }));
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async ({ locale }: { locale: Locale }) => createTranslator({ locale, messages: catalogues[locale], namespace: "experience" }),
}));
vi.mock("@/components/experience/YulaExperience", () => ({ YulaExperience: () => null }));
vi.mock("@/lib/analytics/client", () => ({ track: vi.fn() }));

afterEach(() => { cleanup(); navigation.replace.mockReset(); });

async function load(locale: Locale) {
  navigation.locale = locale;
  const page = await LandingPage({ params: Promise.resolve({ locale }) });
  return (page as ReactElement<{ copy: ExperienceCopy; products: ExperienceProduct[] }>).props;
}
function provider(locale: Locale, children: ReactElement) {
  return <NextIntlClientProvider locale={locale} messages={catalogues[locale]} timeZone="UTC"><ThemeProvider>{children}</ThemeProvider></NextIntlClientProvider>;
}

// Actual catalogues/helper and rendered components, with router/server lookup
// adapters only. jsdom does not establish layout, RTL visual, WebGL or device acceptance.
describe.each(["fr", "ja", "ar"] as const)("experience catalogue integration in %s", (locale) => {
  it("keeps the static consulting CTA in the selected language and translates product data", async () => {
    const { copy, products } = await load(locale);
    const { container } = render(provider(locale, <StaticExperience copy={copy} products={products} soundEnabled={false} onSoundToggle={vi.fn()} />));
    expect(container.querySelector("#experience-hero a")?.getAttribute("href")).toBe(localePath(locale, "/consulting"));
    expect(container.querySelector("#experience-product-braavolabs")?.textContent).toContain(products[0].category);
    expect(products[0].category).not.toBe("Autonomous AI Company OS");
    expect(products[0].short).not.toBe("An autonomous AI company OS for small teams. Primitives, agent networks and transparent cost — one panel.");
    expect(container.querySelector("#experience-product-lifeos img")?.getAttribute("alt")).toBeTruthy();
  });

  it("exposes all fourteen native language choices and keeps section navigation", async () => {
    const { copy } = await load(locale);
    window.history.replaceState(null, "", `/${locale}?token=private#experience-proof`);
    const onSoundToggle = vi.fn();
    render(provider(locale, <ExperienceHeader copy={copy} soundEnabled={false} onSoundToggle={onSoundToggle} />));
    const selector = screen.getByRole("combobox", { name: catalogues[locale].header.language });
    expect((selector as HTMLSelectElement).value).toBe(locale);
    expect(within(selector).getAllByRole("option").map((option) => (option as HTMLOptionElement).value)).toEqual([...SUPPORTED_LOCALES]);
    fireEvent.change(selector, { target: { value: "de" } });
    expect(navigation.replace).toHaveBeenCalledWith("/#experience-proof", { locale: "de" });
    fireEvent.click(screen.getByRole("button", { name: copy.navigation.soundOn }));
    expect(onSoundToggle).toHaveBeenCalledTimes(1);
  });

  it("keeps translated proof caveats and isolates technical sources and ISO dates", async () => {
    const { copy, products } = await load(locale);
    const product = products.find((item) => item.claims.length > 0)!;
    const { container } = render(<ProofLedger copy={copy} product={product} today="2099-01-01" />);
    expect(screen.getAllByText(copy.proof.stale).length).toBeGreaterThan(0);
    const first = product.claims[0];
    expect(screen.getAllByText(first.statement).length).toBeGreaterThan(0);
    const source = screen.getByText(first.source);
    expect(source.getAttribute("dir")).toBe("ltr");
    expect(container.querySelector(`time[datetime="${first.verifiedAt}"]`)?.getAttribute("dir")).toBe("ltr");
    expect(screen.getAllByText(text(locale, "kaynak kodda doğrulandı", "verified in source code")).length).toBeGreaterThan(0);
  });
});
