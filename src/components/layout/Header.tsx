"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight, Menu, X } from "@/components/common/icons";
import { YulaMark } from "@/components/common/YulaMark";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ThemeControl } from "@/components/theme/ThemeControl";
import { SlotLabel } from "@/components/common/SlotLabel";
import { HEADER_CTA, HEADER_NAV, MOBILE_EXTRA_NAV } from "./nav-config";
import { HOME_DOORS } from "@/components/landing/home-doors";

const isActiveHref = (href: string, stripped: string) =>
  href === "/" ? stripped === "/" : stripped.startsWith(href);

// Studio is reachable from the footer only (see nav-config.ts), so the header takes no switch.
export function Header() {
  const t = useTranslations("header");
  const tHome = useTranslations("home");
  const locale = useLocale();
  const pathname = usePathname();
  const stripped = stripLocale(pathname, locale);
  const mobilePrimary = HEADER_NAV.filter((n) => n.primary);
  const mobileSecondary = [
    ...MOBILE_EXTRA_NAV.slice(0, 1),
    ...HEADER_NAV.filter((n) => !n.primary),
    ...MOBILE_EXTRA_NAV.slice(1),
  ];

  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const doorsWrap = useRef<HTMLDivElement>(null);
  const doorsButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const mobileCloseButton = useRef<HTMLButtonElement>(null);
  const mobileProjectsLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setMobile(false);
    setDoorsOpen(false);
  }, [pathname]);

  // Disclosure, not a modal: Escape or an outside press closes it, and Escape
  // returns focus to the trigger (design 04 §E12, QA A11Y-16).
  useEffect(() => {
    if (!doorsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Claim the key so the opening card's Escape listener does not also skip.
      event.preventDefault();
      setDoorsOpen(false);
      doorsButton.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!doorsWrap.current?.contains(event.target as Node)) setDoorsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [doorsOpen]);

  // The open drawer must not let the page scroll behind it (design 04 §E12).
  useEffect(() => {
    if (!mobile) return;
    // Locked on <body>, not <html>: the opening card keeps its own capture and
    // restore of the <html> overflow, so the two locks never overwrite each other.
    const body = document.body;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous;
    };
  }, [mobile]);

  useEffect(() => {
    const dialog = mobileDialog.current;
    if (!dialog) return;
    if (mobile && !dialog.open) {
      dialog.showModal();
      // showModal() focuses the first focusable in tree order. Once the panel
      // is tall enough to scroll (Kapılar section), Chrome makes the scroller
      // itself focusable and it comes before the close button, so name the
      // initial focus explicitly instead of relying on tree order.
      mobileCloseButton.current?.focus();
    }
    if (!mobile && dialog.open) dialog.close();
  }, [mobile]);

  useEffect(() => {
    if (!mobile) return;
    // A modal hidden by the desktop layout must not keep the page inert.
    const desktop = window.matchMedia("(min-width: 1280px)");
    const onDesktop = () => {
      if (!desktop.matches) return;
      setMobile(false);
    };
    onDesktop();
    desktop.addEventListener("change", onDesktop);
    return () => desktop.removeEventListener("change", onDesktop);
  }, [mobile]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        data-site-header="true"
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
            className="flex shrink-0 whitespace-nowrap items-center gap-2.5 group focusable"
            aria-label="Yula Lab"
          >
            <YulaMark size={28} />
            <span className="font-display font-semibold tracking-tight text-[15px]">
              Yula Lab
            </span>
          </Link>

          <nav className="hidden xl:flex items-center gap-4 text-[13.5px] text-ink-200">
            {HEADER_NAV.map((n) => {
              const isActive = isActiveHref(n.href, stripped);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    "link-wipe focusable transition-colors " +
                    (isActive ? "text-ink-50" : "text-ink-300 hover:text-ink-50")
                  }
                >
                  {t(n.key)}
                </Link>
              );
            })}
            <div ref={doorsWrap} className="relative">
              <button
                ref={doorsButton}
                type="button"
                onClick={() => setDoorsOpen((open) => !open)}
                aria-expanded={doorsOpen}
                aria-controls="site-doors-panel"
                data-site-doors-trigger="true"
                className="focusable inline-flex min-h-[44px] items-center text-ink-300 hover:text-ink-50 transition-colors"
              >
                {t("doors")}
              </button>
              {doorsOpen ? (
                <ul
                  id="site-doors-panel"
                  role="list"
                  aria-label={t("doorsPanel")}
                  data-site-doors-panel="true"
                  className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col rounded-xl border border-hairline bg-ink-900 p-2"
                >
                  {HOME_DOORS.map((door) => (
                    <li key={door.key}>
                      <Link
                        href={door.links[0].href}
                        prefetch={false}
                        onClick={() => setDoorsOpen(false)}
                        data-site-door={door.key}
                        className="focusable flex min-h-[44px] items-center rounded-lg px-3 text-ink-100 hover:bg-white/[0.06]"
                      >
                        {tHome(`doors.${door.key}.title`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <LocaleSwitcher compact />
            <ThemeControl compact />
            <Link
              href={HEADER_CTA.href}
              className="ml-1 group inline-flex items-center gap-1.5 rounded-full bg-ink-50 text-ink-900 pl-4 pr-3.5 py-2 text-[13px] font-medium hover:bg-ink-100 transition-colors focusable"
            >
              <SlotLabel>{t(HEADER_CTA.key)}</SlotLabel>
              <ArrowUpRight size={14} strokeWidth={2} className="arrow-nudge" />
            </Link>
          </nav>

          <button
            ref={menuButton}
            type="button"
            onClick={() => setMobile(true)}
            className="xl:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md border border-hairline text-ink-100 focusable"
            aria-label={t("menuOpen")}
            aria-expanded={mobile}
            aria-controls="site-mobile-navigation"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Mobile slide panel */}
      <dialog
        id="site-mobile-navigation"
        ref={mobileDialog}
        data-site-mobile-drawer="true"
        aria-label={t("menuOpen")}
        aria-hidden={!mobile}
        inert={!mobile}
        onCancel={(event) => {
          event.preventDefault();
          setMobile(false);
        }}
        onClose={() => setMobile(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && event.currentTarget.open) {
            event.preventDefault();
            setMobile(false);
            return;
          }
          if (
            !event.currentTarget.open || event.defaultPrevented || event.key !== "Tab" ||
            event.ctrlKey || event.altKey || event.metaKey
          ) return;
          const first = mobileCloseButton.current;
          const last = mobileProjectsLink.current;
          if (!first || !last) return;
          // Keep the two modal boundaries inside the drawer; leave every
          // intermediate control and browser shortcut to its native behavior.
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        className={
          "fixed inset-0 z-50 m-0 h-[100dvh] w-screen max-h-none max-w-none border-0 bg-transparent p-0 text-inherit backdrop:bg-transparent xl:hidden transition-opacity duration-400 " +
          (mobile ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")
        }
        style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div
          className="absolute inset-0 mm-overlay bg-ink-900/60"
          onClick={() => setMobile(false)}
        />
        <div
          data-site-mobile-panel="true"
          data-open={mobile ? "true" : "false"}
          className={
            "absolute right-0 top-0 bottom-0 w-[82%] max-w-sm border-l border-hairline p-6 flex flex-col overflow-y-auto overscroll-contain [&>*]:shrink-0 transition-transform duration-500 " +
            (mobile ? "translate-x-0" : "translate-x-full")
          }
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <YulaMark />
              <span className="font-display font-semibold">Yula Lab</span>
            </div>
            <button
              ref={mobileCloseButton}
              type="button"
              onClick={() => setMobile(false)}
              className="mm-close focusable min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md border border-hairline"
              aria-label={t("menuClose")}
            >
              <X size={16} />
            </button>
          </div>
          <nav className="mt-8 flex flex-col" aria-label={t("mainNavigation")}>
            {mobilePrimary.map((n, index) => {
              const isActive = isActiveHref(n.href, stripped);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobile(false)}
                  aria-current={isActive ? "page" : undefined}
                  data-active={isActive ? "true" : "false"}
                  style={{ "--mm-index": index } as CSSProperties}
                  className="mm-item focusable font-display text-3xl font-semibold tracking-tight min-h-[44px] py-2 text-ink-50"
                >
                  <span className="mm-dash" aria-hidden="true" />
                  {t(n.key)}
                </Link>
              );
            })}
            <ul className="mt-4 flex flex-col border-t border-hairline pt-3">
              {mobileSecondary.map((n, index) => {
                const isActive = isActiveHref(n.href, stripped);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      onClick={() => setMobile(false)}
                      aria-current={isActive ? "page" : undefined}
                      data-active={isActive ? "true" : "false"}
                      style={{ "--mm-index": mobilePrimary.length + index } as CSSProperties}
                      className="mm-item focusable flex min-h-[44px] items-center text-base text-ink-200"
                    >
                      {t(n.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 border-t border-hairline pt-3 text-xs uppercase tracking-widest text-ink-300">
              {t("doors")}
            </p>
            <ul role="list" className="flex flex-col">
              {HOME_DOORS.map((door, index) => (
                <li key={door.key}>
                  <Link
                    href={door.links[0].href}
                    prefetch={false}
                    onClick={() => setMobile(false)}
                    data-site-door={door.key}
                    style={{ "--mm-index": mobilePrimary.length + mobileSecondary.length + index } as CSSProperties}
                    className="mm-item focusable flex min-h-[44px] items-center text-base text-ink-200"
                  >
                    {tHome(`doors.${door.key}.title`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <LocaleSwitcher onNavigate={() => setMobile(false)} />
            <ThemeControl />
          </div>
          <div className="mt-auto pt-6">
            <Link
              ref={mobileProjectsLink}
              href={HEADER_CTA.href}
              onClick={() => setMobile(false)}
              className="focusable flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-ink-50 text-ink-900 px-5 py-3 text-sm font-medium"
            >
              <SlotLabel>{t(HEADER_CTA.key)}</SlotLabel> <ArrowUpRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}

function stripLocale(pathname: string, locale: string): string {
  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
  return stripped === "" ? "/" : stripped;
}
