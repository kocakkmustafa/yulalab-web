import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// WEB-UX-05g, design G5. Playwright 1.62 cannot emulate
// `prefers-reduced-transparency` nor an engine without backdrop-filter, so the
// fallback is proven on the stylesheet itself: both guarded blocks exist, come
// after every glass definition (they must win the cascade), turn glass into a
// flat opaque token surface with `backdrop-filter: none`, and add no colour.
const css = readFileSync(join(__dirname, "..", "src", "app", "globals.css"), "utf8");

function blockAfter(header: string): string {
  const start = css.indexOf(header);
  expect(start, `${header} missing`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${header}`);
}

const HEADERS = [
  "@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))",
  "@media (prefers-reduced-transparency: reduce)",
];

describe("glass flat fallback (G5)", () => {
  for (const header of HEADERS) {
    describe(header, () => {
      const block = blockAfter(header);

      it("comes after every .glass / .glass-accent definition", () => {
        const lastGlass = Math.max(css.lastIndexOf("\n.glass {"), css.lastIndexOf("\n.glass-accent {"));
        expect(css.indexOf(header)).toBeGreaterThan(lastGlass);
      });

      it(".glass is a flat opaque token surface with no backdrop-filter", () => {
        const rule = /\.glass\s*\{([^}]*)\}/.exec(block)?.[1] ?? "";
        expect(rule).toMatch(/background:\s*rgb\(var\(--yula-ink-850\)\)\s*;/);
        expect(rule).toMatch(/(?<!-webkit-)backdrop-filter:\s*none\s*;/);
        expect(rule).toMatch(/-webkit-backdrop-filter:\s*none\s*;/);
      });

      it(".glass-accent keeps the accent trace on the same token", () => {
        const rule = /\.glass-accent\s*\{([^}]*)\}/.exec(block)?.[1] ?? "";
        expect(rule).toContain("var(--accent");
        expect(rule).toContain("rgb(var(--yula-ink-850))");
      });

      it("introduces no new colour value", () => {
        expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(block).not.toMatch(/\brgba?\(\s*\d/);
        expect(block).not.toMatch(/\bhsla?\(/);
      });
    });
  }

  it("leaves the supported-case glass rules in place (blur 22px and 12px)", () => {
    expect(css).toContain("backdrop-filter: blur(22px) saturate(150%);");
    expect(css).toContain("backdrop-filter: blur(12px);");
  });
});
