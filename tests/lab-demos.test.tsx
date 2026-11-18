// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { LAB_DEMOS, enabledLabDemos } from "@/data/lab-demos";
import { LAB_DEMO_LOADERS } from "@/components/lab/lab-demo-loaders";
import { LabDemoGrid } from "@/components/lab/LabDemoGrid";
import en from "../messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const wrap = (ui: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {ui}
  </NextIntlClientProvider>
);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("lab demo registry (WEB-P2-01a)", () => {
  it("has LifeOS and Ostinato only, with unique ids and a description message each", () => {
    expect(LAB_DEMOS.map((d) => d.product)).toEqual(["LifeOS", "Ostinato"]);
    expect(new Set(LAB_DEMOS.map((d) => d.id)).size).toBe(LAB_DEMOS.length);
    for (const d of LAB_DEMOS) {
      expect(typeof en.labDemos[d.descriptionKey]).toBe("string");
      expect(typeof LAB_DEMO_LOADERS[d.id]).toBe("function");
    }
  });

  it("is closed by default and follows each product flag", () => {
    vi.stubEnv("LIFEOS_DEMO_ENABLED", "");
    vi.stubEnv("OSTINATO_DEMO_ENABLED", "");
    expect(enabledLabDemos()).toEqual([]);
    vi.stubEnv("LIFEOS_DEMO_ENABLED", "1");
    expect(enabledLabDemos().map((d) => d.id)).toEqual(["lifeos-decision"]);
    vi.stubEnv("OSTINATO_DEMO_ENABLED", "1");
    expect(enabledLabDemos().map((d) => d.id)).toEqual(["lifeos-decision", "ostinato-rhythm"]);
    vi.stubEnv("LIFEOS_DEMO_ENABLED", "true");
    expect(enabledLabDemos().map((d) => d.id)).toEqual(["ostinato-rhythm"]);
  });
});

describe("LabDemoGrid", () => {
  it("renders nothing without ids (closed flag: no card, no section)", () => {
    const { container } = render(wrap(<LabDemoGrid ids={[]} />));
    expect(container.innerHTML).toBe("");
  });

  it("lists only the given ids as a semantic list with headings", () => {
    render(wrap(<LabDemoGrid ids={["ostinato-rhythm"]} />));
    expect(screen.getByRole("list", { name: en.labDemos.listLabel })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3, name: "Ostinato" })).toBeTruthy();
    expect(screen.queryByText("LifeOS")).toBeNull();
  });

  it("server render has no open button, only the honest product page link", () => {
    const html = renderToString(wrap(<LabDemoGrid ids={["lifeos-decision", "ostinato-rhythm"]} />));
    expect(html).not.toContain("<button");
    expect(html).toContain('href="/projects/lifeos#dene"');
    expect(html).toContain('href="/projects/ostinato#dene"');
  });

  it("does not load a demo until Open is pressed, then loads it once and moves focus", async () => {
    const Demo = () => <p data-testid="fake-demo">demo body</p>;
    const load = vi.spyOn(LAB_DEMO_LOADERS, "lifeos-decision").mockResolvedValue(Demo);
    render(wrap(<LabDemoGrid ids={["lifeos-decision"]} />));
    expect(load).not.toHaveBeenCalled();
    const open = await screen.findByRole("button", { name: "Open: LifeOS" });
    expect(open.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(open);
    await screen.findByTestId("fake-demo");
    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Open: LifeOS" }).getAttribute("aria-expanded")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId("lab-demo-panel")));
    fireEvent.click(screen.getByRole("button", { name: "Close: LifeOS" }));
    expect(screen.queryByTestId("fake-demo")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open: LifeOS" }));
  });
});
