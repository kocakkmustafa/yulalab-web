import type { LocalizedString } from "@/lib/types";

export type NoteLang = "tr" | "en";

/** The five template fields of a lab record, in reading order. */
export const LAB_FIELDS = ["question", "hypothesis", "did", "learned", "next"] as const;
export type LabField = (typeof LAB_FIELDS)[number];

/**
 * Text of a note in the wanted language. A note is only ever shown in a
 * language it was written in: when the wanted one is empty, the other one is
 * returned with `translated: false` so the caller can label it ("no
 * translation") instead of inventing a translation.
 */
export function pickNoteText(
  value: LocalizedString,
  want: NoteLang,
): { text: string; lang: NoteLang; translated: boolean } {
  if (value[want].trim() !== "") return { text: value[want], lang: want, translated: true };
  const other: NoteLang = want === "tr" ? "en" : "tr";
  return { text: value[other], lang: other, translated: false };
}
