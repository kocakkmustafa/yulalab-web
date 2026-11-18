import fs from "node:fs";
import path from "node:path";

type Allow = Record<string, { messages?: string[]; content?: string[] }>;
const allow = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "scripts", "translation-same-as-en.json"), "utf8"),
) as Allow;

/** True when `locale` may keep the English text for this catalogue path (WEB-10c-AI allowlist). */
export const mayEqualEn = (locale: string, messagePath: string): boolean =>
  allow[locale]?.messages?.includes(messagePath) ?? false;

/** Same, for a `messages/content-<locale>.json` key. */
export const contentMayEqualEn = (locale: string, key: string): boolean =>
  allow[locale]?.content?.includes(key) ?? false;
