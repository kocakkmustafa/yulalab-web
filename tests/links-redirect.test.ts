import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import middleware from "@/middleware";

const intl = vi.hoisted(() => vi.fn());
vi.mock("next-intl/middleware", () => ({ default: () => intl }));
beforeEach(() => intl.mockReset().mockReturnValue(NextResponse.next()));

describe("canonical Links redirect before locale rewriting", () => {
  it.each(["/links", "/links/", "/tr/links", "/en/links", "/%6cinks"])(
    "redirects %s directly to the static hub", (path) => {
      const response = middleware(new NextRequest(`https://yulalab.com${path}?returnTo=https://evil.example&email=private`));
      expect(response.status).toBe(308);
      // Only an explicit locale prefix is forwarded (as ?lang=); caller query values never are.
      const prefix = /^\/(tr|en)\/links$/.exec(path)?.[1];
      expect(response.headers.get("location")).toBe(
        `https://links.yulalab.com/${prefix ? `?lang=${prefix}` : ""}`,
      );
      expect(intl).not.toHaveBeenCalled();
    },
  );

  it.each(["/linksmith", "/links/unknown", "/contact"])("keeps ordinary %s in locale routing", (path) => {
    middleware(new NextRequest(`https://yulalab.com${path}`));
    expect(intl).toHaveBeenCalledOnce();
  });
});
