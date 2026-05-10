import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale, LocalizedString } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pickLocalized(value: LocalizedString, locale: Locale): string {
  return value[locale] ?? value.tr;
}

/** Append alpha hex (00–FF) to a 6-char hex color. */
export function withAlpha(hex: string, alpha: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return `${hex}${alpha}`;
}
