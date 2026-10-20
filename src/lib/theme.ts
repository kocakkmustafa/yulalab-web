export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "yula.appearance.v1";
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: "#09060e",
  light: "#f5f3ee",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function applyThemeToDocument(
  document: Document,
  preference: ThemePreference,
  resolved: ResolvedTheme,
): void {
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  root.classList.toggle("dark", resolved === "dark");
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[resolved];
}

// Public, fixed input only. Runs in <head> before body/React, with no request,
// URL, locale, capability or user content interpolated into executable code.
export const THEME_BOOTSTRAP = `(function(){var p="system",d=true;try{var v=localStorage.getItem("${THEME_STORAGE_KEY}");if(v==="light"||v==="dark"||v==="system")p=v}catch(e){}try{d=matchMedia("(prefers-color-scheme: dark)").matches}catch(e){}var t=p==="system"?(d?"dark":"light"):p,r=document.documentElement;r.dataset.themePreference=p;r.dataset.theme=t;r.style.colorScheme=t;r.classList.toggle("dark",t==="dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==="dark"?"${THEME_COLORS.dark}":"${THEME_COLORS.light}"})()`;
