import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { IMAGE_DIMENSIONS } from "@/data/image-dimensions";
import { developmentPreviews } from "@/data/product-presentations";
import { publicRegistry } from "@/data/public-registry";

const root = join(__dirname, "..");

function pngSize(publicPath: string) {
  const bytes = readFileSync(join(root, "public", publicPath));
  expect(bytes.subarray(0, 8).toString("hex"), publicPath).toBe("89504e470d0a1a0a");
  expect(bytes.subarray(12, 16).toString("latin1"), publicPath).toBe("IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const linearImages = [
  ...publicRegistry.flatMap((record) => record.screenshots.map((shot) => shot.path)),
  ...Object.values(developmentPreviews).flatMap((previews) => (previews ?? []).map((preview) => preview.path)),
];

describe("intrinsic image sizes for the linear experience", () => {
  it("covers exactly the registry screenshots and development previews", () => {
    expect(Object.keys(IMAGE_DIMENSIONS).sort()).toEqual([...new Set(linearImages)].sort());
  });

  it.each(linearImages)("%s matches its PNG header", (path) => {
    expect(IMAGE_DIMENSIONS[path]).toEqual(pngSize(path));
  });

  it("passes the sizes to every static screenshot", () => {
    const source = readFileSync(join(root, "src/components/experience/StaticExperience.tsx"), "utf8");
    expect(source).toContain("IMAGE_DIMENSIONS[shot.path]");
    expect(source).toMatch(/width=\{size\?\.width\}/);
    expect(source).toMatch(/height=\{size\?\.height\}/);
  });
});
