"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  applyThemeToDocument, isThemePreference, resolveTheme, THEME_STORAGE_KEY,
  type ResolvedTheme, type ThemePreference,
} from "@/lib/theme";

type ThemeState = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  ready: boolean;
  sessionOnly: boolean;
};
type ThemeContextValue = ThemeState & { choose: (preference: ThemePreference) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemIsDark(): boolean {
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches; }
  catch { return true; }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Match SSR and hydration. Prepaint CSS/boot already owns visible colors;
  // the client-only WebGL surface waits for `ready`, not a guessed SSR mode.
  const [state, setState] = useState<ThemeState>({
    preference: "system", resolved: "dark", ready: false, sessionOnly: false,
  });
  const preferenceRef = useRef<ThemePreference>("system");
  const sessionOnlyRef = useRef(false);
  const update = useCallback((preference: ThemePreference, systemDark: boolean, sessionOnly = sessionOnlyRef.current) => {
    preferenceRef.current = preference;
    sessionOnlyRef.current = sessionOnly;
    const resolved = resolveTheme(preference, systemDark);
    applyThemeToDocument(document, preference, resolved);
    setState({ preference, resolved, ready: true, sessionOnly });
  }, []);

  useEffect(() => {
    let preference: ThemePreference = "system";
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemePreference(saved)) preference = saved;
    } catch { /* System CSS remains usable when storage is blocked. */ }
    update(preference, systemIsDark());

    let media: MediaQueryList | undefined;
    const onSystem = (event: MediaQueryListEvent) => {
      if (preferenceRef.current === "system") update("system", event.matches);
    };
    try {
      media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", onSystem);
    } catch { /* Older/blocked media APIs keep the initial safe preference. */ }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
      } catch { return; }
      update(isThemePreference(event.newValue) ? event.newValue : "system", systemIsDark(), false);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      media?.removeEventListener?.("change", onSystem);
      window.removeEventListener("storage", onStorage);
    };
  }, [update]);

  const choose = useCallback((preference: ThemePreference) => {
    if (!isThemePreference(preference)) return;
    let sessionOnly = false;
    try { window.localStorage.setItem(THEME_STORAGE_KEY, preference); }
    catch { sessionOnly = true; }
    update(preference, systemIsDark(), sessionOnly);
  }, [update]);

  const value = useMemo(() => ({ ...state, choose }), [choose, state]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("ThemeProvider is required");
  return theme;
}
