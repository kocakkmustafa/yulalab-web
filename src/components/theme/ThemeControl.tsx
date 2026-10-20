"use client";

import { useId } from "react";
import { useLocale } from "next-intl";
import { isThemePreference } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";
import { themeCopy } from "./theme-copy";

export function ThemeControl({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const locale = useLocale();
  const copy = themeCopy(locale);
  const theme = useTheme();
  return (
    <span className="theme-control-group">
      <label htmlFor={id} className="theme-control" data-compact={compact || undefined}>
        <span className={compact ? "sr-only" : undefined}>{copy.label}</span>
        {compact ? <span aria-hidden="true" className="theme-control-symbol">{theme.preference === "light" ? "☼" : theme.preference === "dark" ? "☾" : "◐"}</span> : null}
        <select
          id={id}
          value={theme.preference}
          disabled={!theme.ready}
          onChange={(event) => {
            if (isThemePreference(event.target.value)) theme.choose(event.target.value);
          }}
        >
          <option value="system">{copy.system}</option>
          <option value="light">{copy.light}</option>
          <option value="dark">{copy.dark}</option>
        </select>
      </label>
      {theme.sessionOnly ? <span role="status" className="sr-only">{copy.sessionOnly}</span> : null}
    </span>
  );
}
