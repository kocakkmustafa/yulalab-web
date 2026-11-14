import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { projects } from "@/data/projects";
import { publicRegistry } from "@/data/public-registry";
import { JsonLd } from "@/components/common/JsonLd";

describe("JSON-LD Burun Farki degismez", () => {
  it("web kaynakli urunun url'i ham web baglantisiyla ayni", () => {
    const bf = projects.find((p) => p.slug === "burunfarki");
    const raw = bf?.links.find((l) => l.kind === "web")?.href;
    expect(raw).toBeTruthy();
    // Kaydin en erken expiresAt gununden 1 gun once: kayit hala gecerli.
    const record = publicRegistry.find((r) => r.slug === "burunfarki");
    const earliest = Math.min(...(record?.surfaces ?? []).map((s) => Date.parse(s.expiresAt as string)));
    expect(Number.isFinite(earliest)).toBe(true);
    const now = new Date(earliest - 24 * 3600 * 1000);
    const html = renderToStaticMarkup(<JsonLd now={now} />);
    const graph = JSON.parse(html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))["@graph"];
    const node = graph.find((n: { name?: string }) => n.name === bf?.name);
    expect(node).toBeDefined();
    expect(node.url).toBe(raw);
  });
});
