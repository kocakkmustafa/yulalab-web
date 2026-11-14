import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { projects } from "@/data/projects";
import { JsonLd } from "@/components/common/JsonLd";

describe("JSON-LD Burun Farki degismez", () => {
  it("web kaynakli urunun url'i ham web baglantisiyla ayni", () => {
    const bf = projects.find((p) => p.slug === "burunfarki");
    const raw = bf?.links.find((l) => l.kind === "web")?.href;
    expect(raw).toBeTruthy();
    const html = renderToStaticMarkup(<JsonLd now={new Date()} />);
    const graph = JSON.parse(html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""))["@graph"];
    const node = graph.find((n: { name?: string }) => n.name === bf?.name);
    // Yayin kaydi dogrulamasi suresi doldiysa dugum hic yoktur; varsa url ham baglantidir.
    if (node) expect(node.url).toBe(raw);
  });
});
