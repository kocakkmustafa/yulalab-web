"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Menu, X } from "@/components/common/icons";
import { YulaMark } from "@/components/common/YulaMark";
import { LocaleSwitcher } from "./LocaleSwitcher";

type NavKey = "home" | "manifesto" | "projects" | "contact";
type NavItem = { key: NavKey; href: "/" | "/manifesto" | "/projects" | "/contact" };

const NAV: NavItem[] = [
  { key: "home", href: "/" },
  { key: "manifesto", href: "/manifesto" },
  { key: "projects", href: "/projects" },
  { key: "contact", href: "/contact" },
];

export function Header() {
  const t = useTranslations("header");
  const locale = useLocale();
  const pathname = usePathname();
  const stripped = stripLocale(pathname, locale);

  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={
          "fixed top-0 inset-x-0 z-40 transition-all duration-500 " +
          (scrolled
            ? "backdrop-blur-xl bg-ink-900/70 border-b border-white/[0.06]"
            : "bg-transparent border-b border-transparent")
        }
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focusable"
            aria-label="YULA Lab"
          >
            <YulaMark size={28} />
            <span className="font-display font-semibold tracking-tight text-[15px]">
              YULA Lab
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-[13.5px] text-ink-200">
            {NAV.map((n) => {
              const isActive =
                (n.href === "/" && stripped === "/") ||
                (n.href !== "/" && stripped.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    "link-wipe focusable transition-colors " +
                    (isActive ? "text-ink-50" : "text-ink-300 hover:text-ink-50")
                  }
                >
                  {t(n.key)}
                </Link>
              );
            })}
            <LocaleSwitcher />
            <Link
              href="/projects"
              className="ml-1 group inline-flex items-center gap-1.5 rounded-full bg-ink-50 text-ink-900 pl-4 pr-3.5 py-2 text-[13px] font-medium hover:bg-ink-100 transition-colors focusable"
            >
              {t("ctaProjects")}
              <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobile(true)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-white/10 text-ink-100 focusable"
            aria-label={t("menuOpen")}
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Mobile slide panel */}
      <div
        className={
          "fixed inset-0 z-50 md:hidden transition-opacity duration-400 " +
          (mobile ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")
        }
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div
          className="absolute inset-0 mm-overlay bg-ink-900/60"
          onClick={() => setMobile(false)}
        />
        <div
          className={
            "absolute right-0 top-0 bottom-0 w-[82%] max-w-sm bg-ink-850 border-l border-white/10 p-6 flex flex-col transition-transform duration-500 " +
            (mobile ? "translate-x-0" : "translate-x-full")
          }
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <YulaMark />
              <span className="font-display font-semibold">YULA Lab</span>
            </div>
            <button
              type="button"
              onClick={() => setMobile(false)}
              className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-white/10"
              aria-label={t("menuClose")}
            >
              <X size={16} />
            </button>
          </div>
          <nav className="mt-10 flex flex-col gap-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMobile(false)}
                className="font-display text-3xl font-semibold tracking-tight py-2 text-ink-50"
              >
                {t(n.key)}
              </Link>
            ))}
          </nav>
          <div className="mt-6 flex items-center gap-2">
            <LocaleSwitcher onNavigate={() => setMobile(false)} />
          </div>
          <Link
            href="/projects"
            onClick={() => setMobile(false)}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-ink-50 text-ink-900 px-5 py-3 text-sm font-medium"
          >
            {t("ctaProjects")} <ArrowUpRight size={14} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </>
  );
}

function stripLocale(pathname: string, locale: string): string {
  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
  return stripped === "" ? "/" : stripped;
}
