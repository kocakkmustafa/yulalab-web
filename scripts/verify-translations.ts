/** Source-only language contract. No network, database or provider work. */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { SUPPORTED_LOCALES } from "../src/i18n/locales";

const root = process.cwd();
const secondary = SUPPORTED_LOCALES.filter((locale) => locale !== "tr" && locale !== "en");
const read = (file: string): Record<string, unknown> => {
  const value: unknown = JSON.parse(fs.readFileSync(path.join(root, "messages", file), "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Expected a catalogue object: ${file}`);
  return value as Record<string, unknown>;
};
function shape(value: unknown): unknown {
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, shape(child)]));
  throw new Error("Catalogue values must be strings, arrays or objects of strings");
}
function leaves(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") return { [prefix]: value };
  if (value && typeof value === "object") return Object.assign({}, ...Object.entries(value).map(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key)));
  throw new Error(`Non-string message leaf: ${prefix}`);
}
const placeholders = (value: string) => [...value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]).sort();
const sourceCatalogue = read("en.json");
const source = leaves(sourceCatalogue);
const issues: string[] = [];
for (const locale of SUPPORTED_LOCALES) {
  const catalogue = read(`${locale}.json`);
  const actual = leaves(catalogue);
  if (JSON.stringify(shape(catalogue)) !== JSON.stringify(shape(sourceCatalogue))) issues.push(`${locale}: message tree shape differs`);
  if (!Intl.DateTimeFormat.supportedLocalesOf([locale]).length || !Intl.NumberFormat.supportedLocalesOf([locale]).length) issues.push(`${locale}: runtime Intl locale support is unavailable`);
  if (JSON.stringify(Object.keys(actual).sort()) !== JSON.stringify(Object.keys(source).sort())) issues.push(`${locale}: message key set differs`);
  for (const [key, value] of Object.entries(source)) {
    if (typeof actual[key] !== "string" || JSON.stringify(placeholders(actual[key] ?? "")) !== JSON.stringify(placeholders(value))) issues.push(`${locale}: ${key} missing/placeholder mismatch`);
    if (Boolean(value.trim()) !== Boolean(actual[key]?.trim())) issues.push(`${locale}: ${key} empty-pattern mismatch`);
  }
}

const required = new Map<string, string>();
const technical = new Set(["en", "tr", "en-GB", "en_US", "opacity-60"]);
function literal(node: ts.Node): string | undefined {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((span) => `{${span.expression.getText()}}${span.literal.text}`).join("");
}
function add(tr: ts.Node, en: ts.Node, file: string) {
  const a = literal(tr), b = literal(en);
  if (a !== undefined && b !== undefined && Boolean(b.trim()) && !technical.has(b) && !b.startsWith("/") && !/^(?:https?:|mailto:)/.test(b) && !b.startsWith("{ORIGIN}")) required.set(b, file);
}
function prop(node: ts.ObjectLiteralExpression, name: string) {
  return node.properties.find((item): item is ts.PropertyAssignment => ts.isPropertyAssignment(item) && item.name.getText().replace(/^["']|["']$/g, "") === name);
}
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
}
for (const file of walk(path.join(root, "src"))) {
  // Transaction templates and legacy Studio mail labels are a TR/EN backend contract.
  if (file.endsWith(`${path.sep}i18n${path.sep}locales.ts`) || file.endsWith(`${path.sep}data${path.sep}privacy-copy.ts`) || file.includes(`${path.sep}server${path.sep}`) || file.endsWith(`${path.sep}lib${path.sep}studio.ts`) || file.endsWith(`${path.sep}data-request${path.sep}verify${path.sep}route.ts`)) continue;
  const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText() === "text" && node.arguments.length >= 3) add(node.arguments[1], node.arguments[2], file);
    if (ts.isObjectLiteralExpression(node)) {
      const tr = prop(node, "tr"), en = prop(node, "en");
      if (tr && en) add(tr.initializer, en.initializer, file);
      for (const item of node.properties) {
        if (!ts.isPropertyAssignment(item)) continue;
        const name = item.name.getText().replace(/^["']|["']$/g, "");
        if (name.endsWith("Tr")) { const en = prop(node, `${name.slice(0, -2)}En`); if (en) add(item.initializer, en.initializer, file); }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
for (const locale of secondary) {
  const actual = read(`content-${locale}.json`);
  for (const [key, translated] of Object.entries(actual)) {
    if (typeof translated !== "string" || !translated.trim() || JSON.stringify(placeholders(key)) !== JSON.stringify(placeholders(translated))) issues.push(`${locale}: invalid supplemental entry ${JSON.stringify(key)}`);
  }
  for (const [key, file] of required) {
    const translated = actual[key];
    if (typeof translated !== "string" || !translated.trim() || JSON.stringify(placeholders(key)) !== JSON.stringify(placeholders(translated))) issues.push(`${locale}: missing content/placeholder ${JSON.stringify(key)} in ${path.relative(root, file)}`);
  }
}
console.log(JSON.stringify({ locales: SUPPORTED_LOCALES, messageLeaves: Object.keys(source).length, requiredSourcePhrases: required.size, scope: "catalogue shape, placeholders, source coverage and runtime Intl availability; not translation quality or browser acceptance", intakeLocales: ["tr", "en"], issues }, null, 2));
if (issues.length) process.exitCode = 1;
