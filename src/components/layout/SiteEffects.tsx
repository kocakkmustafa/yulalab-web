"use client";

import { useEffect } from "react";
import { startReveal } from "@/lib/reveal";
import { startSiteSmoothScroll } from "@/lib/smooth-scroll";

/** Mounted once in the locale layout: scroll reveal + site smooth scroll. */
export function SiteEffects() {
  useEffect(() => {
    const stopReveal = startReveal();
    const stopScroll = startSiteSmoothScroll();
    return () => {
      stopReveal();
      stopScroll();
    };
  }, []);
  return null;
}
