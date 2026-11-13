import type { ReactNode } from "react";

/**
 * Prototype copy exists only in TR and EN. For every other locale the page
 * shows the EN fallback, so that content is marked lang="en" dir="ltr" (the
 * document stays lang/dir of the locale). Arrows and punctuation therefore
 * keep their LTR direction inside the English text.
 */
export function FallbackScope({ locale, children }: { locale: string; children: ReactNode }) {
  if (locale === "tr" || locale === "en") return <>{children}</>;
  return (
    <div lang="en" dir="ltr">
      {children}
    </div>
  );
}
