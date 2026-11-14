import { describe, expect, it } from "vitest";
import { composite, contrast, parseBlocks, readGlobalsCss, toRgb, toRgba } from "../scripts/contrast-audit";
import { ostinato } from "@/data/projects/ostinato";
import { lifeos } from "@/data/projects/lifeos";

const blocks = parseBlocks(readGlobalsCss());
const GROUNDS = ["ink-900", "ink-850"] as const;
const STACKS: string[][] = [[], ["surface"], ["surface-raised"]];

function worst(theme: "dark" | "light", fg: string) {
  let w = 99;
  for (const g of GROUNDS) for (const st of STACKS) {
    let ground = toRgb(blocks[theme][g]);
    for (const l of st) ground = composite(ground, toRgba(blocks[theme][l]));
    w = Math.min(w, contrast(toRgb(fg), ground));
  }
  return w;
}

describe.each([["ostinato", ostinato, "#5F4CA0"], ["lifeos", lifeos, "#76558F"]] as const)("%s app brand colour", (_n, p, primary) => {
  it("uses the app brand colour", () => expect(p.brand.primary).toBe(primary));
  it("text >= 4.5:1 and UI >= 3:1 in both themes", () => {
    const dark = p.brand.primaryOnDark ?? p.brand.primary;
    expect(worst("dark", dark)).toBeGreaterThanOrEqual(4.5);
    expect(worst("light", p.brand.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
