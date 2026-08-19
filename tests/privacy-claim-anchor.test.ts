import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The privacy page states the funnel "is currently OFF". That sentence is
 * prose with no mechanical link to the switch it describes — flip the
 * switch and the public page starts lying, silently, with every gate still
 * green. This test is the anchor.
 *
 * It is deliberately anchored to BEHAVIOUR (the value of the hub's flag)
 * rather than to the wording, so rephrasing the paragraph does not trip it
 * but enabling collection does.
 */
const root = path.resolve(import.meta.dirname, "..");

function read(relative: string): string {
  return readFileSync(path.resolve(root, relative), "utf8");
}

describe("the 'currently OFF' claim matches the code", () => {
  const privacy = read("src/app/[locale]/privacy/page.tsx");
  const claimsOff = /currently OFF|şu an KAPALI/.test(privacy);

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
    const client = read("src/lib/analytics/client.ts");
    expect(client).toContain('process.env.NEXT_PUBLIC_ATTRIBUTION_ENABLED === "1"');
    if (claimsOff) {
      expect(read(".env.example")).not.toMatch(/^NEXT_PUBLIC_ATTRIBUTION_ENABLED=1$/m);
    }
  });

  it("lists every field the event contract can actually store", () => {
    // Under-claiming counts too: a field stored but undisclosed is the same
    // failure as a field disclosed but not stored.
    const events = read("src/lib/analytics/events.ts");
    const stored = ["event", "product", "locale", "page", "target", "targetCategory", "source", "medium", "campaign", "content"];
    for (const field of stored) {
      expect(events).toContain(`"${field}"`);
    }
    for (const phrase of ["event version number", "that link's class", "olay sürüm numarası", "o bağlantının sınıfı"]) {
      expect(privacy, `privacy page must disclose: ${phrase}`).toContain(phrase);
    }
  });
});
