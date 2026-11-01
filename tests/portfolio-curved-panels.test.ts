import { describe, expect, it } from "vitest";

import { bentPanelGeometry, PANEL_BEND_RADIUS } from "@/components/experience/PortfolioField";

function extent(width: number, height: number) {
  const geometry = bentPanelGeometry(width, height);
  const position = geometry.attributes.position;
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    xs.push(position.getX(index));
    ys.push(position.getY(index));
    zs.push(position.getZ(index));
  }
  geometry.dispose();
  return { xs, ys, zs };
}

describe("curved works panels", () => {
  it("bends the face around a vertical axis so its edges recede", () => {
    const { xs, zs } = extent(3.9, 2.4);
    const edgeAngle = 3.9 / 2 / PANEL_BEND_RADIUS;

    expect(Math.max(...zs)).toBeCloseTo(0, 6);
    expect(Math.min(...zs)).toBeCloseTo(-(1 - Math.cos(edgeAngle)) * PANEL_BEND_RADIUS, 6);
    // The arc keeps the panel's width; its chord is a little narrower.
    expect(Math.max(...xs)).toBeCloseTo(Math.sin(edgeAngle) * PANEL_BEND_RADIUS, 6);
    expect(Math.max(...xs)).toBeLessThan(3.9 / 2);
  });

  it("keeps the height straight and the bend symmetric", () => {
    const { xs, ys, zs } = extent(3.15, 1.97);

    expect(Math.max(...ys)).toBeCloseTo(1.97 / 2, 6);
    expect(Math.min(...ys)).toBeCloseTo(-1.97 / 2, 6);
    expect(Math.min(...xs)).toBeCloseTo(-Math.max(...xs), 6);
    zs.forEach((z) => expect(z).toBeLessThanOrEqual(1e-9));
  });
});
