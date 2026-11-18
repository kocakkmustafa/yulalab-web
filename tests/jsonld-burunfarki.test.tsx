import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd } from "@/components/common/JsonLd";

describe("JSON-LD no longer carries Burun Farki (founder, 2026-11-18)", () => {
  it("the structured data graph has no Burun Farki node and no burunfark.com url", () => {
    const html = renderToStaticMarkup(<JsonLd now={new Date("2026-11-18T12:00:00+03:00")} />);
    expect(html).not.toContain("Burun Farkı");
    expect(html).not.toContain("burunfark.com");
  });
});
