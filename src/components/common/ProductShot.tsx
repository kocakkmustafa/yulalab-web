import Image from "next/image";
import { ALPHA } from "@/lib/color";
import type { ProjectAsset, ProjectBrand, ProjectKind } from "@/lib/types";

type Props = {
  asset: ProjectAsset;
  /** Picks the frame: a mobile-only project gets PhoneFrame, anything with
   *  a "web" surface gets BrowserFrame. */
  kind: ProjectKind[];
  brand: ProjectBrand;
  priority?: boolean;
};

/** One elevation language for both frames: hairline border + an ambient
 *  brand-colored ring/glow behind the device — no drop-shadow (it disappears
 *  against the near-black showcase background). */
function AmbientGlow({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      className="absolute -inset-6 rounded-[32px] -z-10"
      style={{ background: color, opacity: 0.28, filter: "blur(50px)" }}
    />
  );
}

function PhoneFrame({ asset, brand, priority }: { asset: ProjectAsset; brand: ProjectBrand; priority?: boolean }) {
  return (
    <div className="relative mx-auto" style={{ maxWidth: 280 }}>
      <AmbientGlow color={brand.primary} />
      <div
        className="relative rounded-[40px] p-2.5 border"
        style={{
          borderColor: brand.foreground + ALPHA.moderate,
          background: "rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="relative overflow-hidden rounded-[30px]"
          style={{ aspectRatio: "9 / 19.5" }}
        >
          <Image
            src={asset.src}
            alt={asset.alt}
            fill
            priority={priority}
            sizes="280px"
            className="object-cover"
          />
        </div>
        <div
          aria-hidden
          className="absolute left-1/2 top-4 -translate-x-1/2 h-1.5 w-14 rounded-full"
          style={{ background: "rgba(0,0,0,0.55)" }}
        />
      </div>
    </div>
  );
}

function BrowserFrame({ asset, brand, priority }: { asset: ProjectAsset; brand: ProjectBrand; priority?: boolean }) {
  return (
    <div className="relative w-full">
      <AmbientGlow color={brand.primary} />
      <div
        className="relative rounded-2xl overflow-hidden border"
        style={{ borderColor: brand.foreground + ALPHA.moderate, background: "rgba(0,0,0,0.35)" }}
      >
        <div
          className="flex items-center gap-1.5 px-3.5 py-2.5 border-b"
          style={{ borderColor: brand.foreground + ALPHA.soft }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: brand.foreground + ALPHA.moderate }}
            />
          ))}
        </div>
        <div className="relative overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
          <Image
            src={asset.src}
            alt={asset.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 560px, 90vw"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a single real product screenshot inside a device frame chosen by
 * the project's `kind`. Callers must pre-filter `asset.kind === "product"` —
 * this component doesn't gate on it, so it never silently downgrades an
 * atmosphere photo into "proof".
 */
export function ProductShot({ asset, kind, brand, priority }: Props) {
  const isMobileOnly = kind.length === 1 && kind[0] === "mobile";
  return isMobileOnly ? (
    <PhoneFrame asset={asset} brand={brand} priority={priority} />
  ) : (
    <BrowserFrame asset={asset} brand={brand} priority={priority} />
  );
}
