import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { SUPPORTED_LOCALES, normalizeLocale } from "@/i18n/locales";

vi.mock("next-intl/server", () => ({ getRequestConfig: (factory: unknown) => factory }));
import requestConfig from "@/i18n/request";

const root = path.resolve(import.meta.dirname, "..");

describe("locale fallback", () => {
  it("(i) unknown locale falls back to tr (normalizeLocale undefined, request config tr)", async () => {
    expect(normalizeLocale("xx")).toBeUndefined();
    const config = await requestConfig({ requestLocale: Promise.resolve("xx") });
    expect(config.locale).toBe("tr");
  });

  // (ii) UNKNOWN/boşluk: there is no real cross-locale fallback. src/i18n/request.ts
  // loads only the selected locale's catalogue and sets neither onError nor
  // getMessageFallback, so next-intl's defaults apply: a missing key is reported
  // via onError (console.error) and rendered as its literal "namespace.key" path.
  // Catalogue parity (iii) is therefore the only guard. This test documents behaviour.
  it("(ii) a missing key renders the literal path, not a tr/en fallback", () => {
    const errors: string[] = [];
    const t = createTranslator({
      locale: "de",
      messages: { home: { title: "Hallo" } },
      namespace: "home",
      onError: (error) => errors.push(error.code),
    });
    expect(t("title")).toBe("Hallo");
    // @ts-expect-error key intentionally absent
    expect(t("missing")).toBe("home.missing");
    expect(errors).toEqual(["MISSING_MESSAGE"]);
  });

  it("(ii) request config exposes no onError/getMessageFallback fallback hook", async () => {
    const config = (await requestConfig({ requestLocale: Promise.resolve("de") })) as Record<string, unknown>;
    expect(Object.keys(config).sort()).toEqual(["locale", "messages"]);
  });

  it("(iii) all 14 locales have messages + content catalogues with tr/en key parity (verify-translations)", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(14);
    for (const locale of SUPPORTED_LOCALES) {
      expect(existsSync(path.join(root, "messages", `${locale}.json`)), `${locale}.json`).toBe(true);
      if (locale !== "tr" && locale !== "en") {
        expect(existsSync(path.join(root, "messages", `content-${locale}.json`)), `content-${locale}.json`).toBe(true);
      }
    }
    const result = spawnSync("node", ["--import", "tsx", "scripts/verify-translations.ts"], { cwd: root, encoding: "utf8" });
    expect(result.status, result.stdout.slice(-800) + result.stderr.slice(-400)).toBe(0);
    expect(JSON.parse(result.stdout).issues).toEqual([]);
  }, 120_000);
});
