import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Ties the contact-data section of /privacy to the columns migration 0002
 * actually creates.
 *
 * The page described the funnel record field by field and said NOTHING about
 * contact data, while the lead backend was already deployed and one
 * environment variable from collecting. This anchor is what makes
 * LEADS_ENABLED safe to set: a column added later without a matching
 * disclosure fails here rather than on the live page.
 *
 * Keyed on the migration file, not on a hand-kept list, for the same reason
 * the attribution anchor is — a hand-kept list is a second source that
 * drifts.
 */
const root = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => readFileSync(path.resolve(root, rel), "utf8");

function renderedText(source: string): string {
  // Comments stripped: moving a sentence into a comment deletes it from the
  // page while leaving it in the file.
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

const privacy = renderedText(read("src/app/[locale]/privacy/page.tsx"));
const migration = read("db/migrations/0002_leads_consents_outbox.sql");

/** Columns of one CREATE TABLE block in the migration. */
function columnsOf(table: string): string[] {
  const start = migration.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`);
  expect(start, `no CREATE TABLE for ${table}`).toBeGreaterThan(-1);
  const body = migration.slice(start, migration.indexOf("\n);", start));
  const cols: string[] = [];
  for (const line of body.split("\n")) {
    const stripped = line.replace(/--.*$/, "").trim();
    const m = stripped.match(/^([a-z_]+)\s+(uuid|text|integer|timestamptz|jsonb)\b/);
    if (m) cols.push(m[1]);
  }
  return cols;
}

/** Column → the wording that discloses it, in both languages. */
const LEADS: Record<string, { tr: string; en: string }> = {
  id: { tr: "rastgele bir kayıt numarası", en: "a random record identifier" },
  created_at: { tr: "kaydın oluşturulma tarihi", en: "the date the record was created" },
  name: { tr: "adınız", en: "your name" },
  email: { tr: "e-posta adresiniz", en: "your email address" },
  company: { tr: "şirket adınız", en: "your company" },
  intent: { tr: "hangi konuda yazdığınız", en: "what you are writing about" },
  product_slug: { tr: "hangi ürün", en: "which product" },
  message: { tr: "mesajınızın kendisi", en: "your message itself" },
  locale: { tr: "sayfanın dili", en: "the page language" },
  status: { tr: "talebin bizdeki durumu", en: "the status of the request on our side" },
  retention_until: { tr: "silineceği tarih", en: "the date it will be deleted" },
  dedupe_key: { tr: "eşleştirme değeri", en: "a matching value" },
};

const CONSENTS: Record<string, { tr: string; en: string }> = {
  id: { tr: "ayrı bir kayıt", en: "its own record" },
  lead_id: { tr: "ayrı bir kayıt", en: "its own record" },
  notice_version: { tr: "hangi tarihli bildirim metnini", en: "which dated version of the notice" },
  accepted_at: { tr: "ne zaman kabul ettiğiniz", en: "when you accepted it" },
  lawful_basis: { tr: "hukuki dayanağı", en: "the lawful basis" },
};

describe("every column the leads table stores is disclosed", () => {
  it("finds the migration's columns at all", () => {
    // A silently empty list would make the next assertion vacuously true —
    // the failure this project's anchors have already had twice.
    expect(columnsOf("leads").length).toBeGreaterThan(8);
    expect(columnsOf("leads")).toContain("message");
  });

  it("has disclosure wording for every leads column", () => {
    for (const column of columnsOf("leads")) {
      expect(
        LEADS[column],
        `leads.${column} is stored but has no disclosure wording — add it to /privacy and to this table`,
      ).toBeTruthy();
    }
  });

  it("has disclosure wording for every lead_consents column", () => {
    for (const column of columnsOf("lead_consents")) {
      expect(CONSENTS[column], `lead_consents.${column} is undisclosed`).toBeTruthy();
    }
  });

  it.each(Object.entries(LEADS))("discloses leads.%s in both languages", (_col, wording) => {
    expect(privacy, `missing Turkish: ${wording.tr}`).toContain(wording.tr);
    expect(privacy, `missing English: ${wording.en}`).toContain(wording.en);
  });

  it.each(Object.entries(CONSENTS))("discloses lead_consents.%s in both languages", (_col, wording) => {
    expect(privacy).toContain(wording.tr);
    expect(privacy).toContain(wording.en);
  });
});

describe("the queue and the retentions are described accurately", () => {
  it("says the queue does not carry the message body", () => {
    expect(privacy).toMatch(/kuyruk mesajınızın metnini TAŞIMAZ/);
    expect(privacy).toMatch(/does NOT carry the text of your message/);
  });

  it("states both retention periods, matching the migration", () => {
    expect(migration).toContain("interval '180 days'");
    expect(migration).toContain("interval '30 days'");
    expect(privacy).toMatch(/180 gün/);
    expect(privacy).toMatch(/30 gün/);
    expect(privacy).toMatch(/180 days/);
    expect(privacy).toMatch(/30 days/);
  });

  it("does not claim a form exists while collection is closed", () => {
    // The route refuses unless LEADS_ENABLED is exactly "1"; .env.example must
    // not ship it on, and the page must not describe a form as present.
    expect(read("src/app/api/leads/route.ts")).toContain('process.env.LEADS_ENABLED === "1"');
    expect(read(".env.example")).not.toMatch(/^LEADS_ENABLED=1$/m);
    expect(privacy).toMatch(/iletişim formu YOK|no contact form on the site today/);
  });
});
