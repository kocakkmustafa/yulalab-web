import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ALLOWED_FIELDS } from "@/lib/analytics/events";

/**
 * Ties the public privacy copy to the code it describes.
 *
 * The first version of this file grepped four hardcoded phrases and
 * asserted that events.ts contained its own field-name literals — always
 * true. A three-line page containing only those four phrases passed it,
 * which is how "eleven fields" survived while the list actually named
 * twelve things. That is the same failure as the storage test it was
 * written to replace: a test whose title is the only thing being asserted.
 *
 * The list below is now the disclosure contract itself. Every field the
 * event contract can carry must appear here with the wording that discloses
 * it, in BOTH languages — so adding a field to ALLOWED_FIELDS without
 * disclosing it fails at the first assertion, and deleting a sentence from
 * the page fails at the second.
 */
const DISCLOSURE: Record<string, { tr: string; en: string }> = {
  v: { tr: "olay sürüm numarası", en: "event version number" },
  event: { tr: "olay adı", en: "event name" },
  locale: { tr: "dil", en: "language" },
  page: { tr: "sayfa yolu", en: "page path" },
  product: { tr: "ürün kısa adı", en: "product short name" },
  target: { tr: "dış bağlantının adresi", en: "address of the outbound link" },
  targetCategory: { tr: "o bağlantının sınıfı", en: "that link's class" },
  source: { tr: "utm_source", en: "utm_source" },
  medium: { tr: "utm_source/medium/campaign/content", en: "utm_source/medium/campaign/content" },
  campaign: { tr: "utm_source/medium/campaign/content", en: "utm_source/medium/campaign/content" },
  content: { tr: "utm_source/medium/campaign/content", en: "utm_source/medium/campaign/content" },
  // Not in the field list: disclosed separately as the rotating pseudonym.
  session: { tr: "takma ad", en: "pseudonym" },
};

const root = path.resolve(import.meta.dirname, "..");
const read = (relative: string) => readFileSync(path.resolve(root, relative), "utf8");
const privacy = read("src/app/[locale]/privacy/page.tsx");
const claimsOff = /currently OFF|şu an KAPALI/.test(privacy);

describe("every storable field is disclosed", () => {
  it("has a disclosure entry for every field the contract accepts", () => {
    for (const field of ALLOWED_FIELDS) {
      expect(
        DISCLOSURE[field],
        `${field} can be stored but has no disclosure wording — add it to the privacy page and to this table`,
      ).toBeTruthy();
    }
  });

  it.each(Object.entries(DISCLOSURE))("discloses %s in both languages", (_field, wording) => {
    expect(privacy, `missing Turkish disclosure: ${wording.tr}`).toContain(wording.tr);
    expect(privacy, `missing English disclosure: ${wording.en}`).toContain(wording.en);
  });

  it("also discloses the timestamp, which is stored but never sent", () => {
    expect(privacy).toContain("zaman damgası");
    expect(privacy).toContain("timestamp");
  });

  it("makes no countable claim it cannot keep", () => {
    // "Nothing outside those eleven fields is stored" was wrong — the list
    // names twelve things. A number on this page is a promise that someone
    // will check.
    expect(privacy).not.toMatch(/eleven fields|on bir alan/);
  });
});

describe("the 'currently OFF' claim matches the code", () => {
  it("keeps the links hub's collector disabled while the page says it is off", () => {
    const hub = read("../links/index.html");
    const match = hub.match(/var ENABLED = (true|false);/);
    expect(match, "links/index.html no longer declares an ENABLED flag").toBeTruthy();
    if (claimsOff) {
      expect(match?.[1], "privacy page says OFF but the links hub collects").toBe("false");
    }
  });

  it("keeps the main site's collector opt-in while the page says it is off", () => {
    // The site's switch is an env var read at build time, so its production
    // value cannot be asserted here. What CAN be asserted is that the code
    // still requires an explicit opt-in rather than defaulting to on.
    expect(read("src/lib/analytics/client.ts")).toContain(
      'process.env.NEXT_PUBLIC_ATTRIBUTION_ENABLED === "1"',
    );
    if (claimsOff) {
      expect(read(".env.example")).not.toMatch(/^NEXT_PUBLIC_ATTRIBUTION_ENABLED=1$/m);
    }
  });
});
