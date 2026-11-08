import type { getTranslations } from "next-intl/server";
import { localePath } from "@/i18n/locales";
import { projects } from "@/data/projects";
import { braavolabs } from "@/data/projects/braavolabs";
import { lifeos } from "@/data/projects/lifeos";
import { ostinato } from "@/data/projects/ostinato";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

// Status labels reuse the existing `status.*` catalogue keys.
const STATUS_KEY = {
  live: "live",
  beta: "beta",
  "coming-soon": "comingSoon",
  "in-development": "inDevelopment",
} as const;

type Privacy = { href: "/privacy/lifeos" | "/privacy/braavolabs" | "/privacy/motion"; product: string };

type Line = {
  key: string;
  /** Product record that backs the sentence; absent for the "others" line. */
  record?: { slug: string; name: string };
  /** Privacy page that backs the sentence. At least one of record/privacy is set. */
  privacy?: Privacy;
  /** True when the label must say "product records" (several products). */
  records?: boolean;
};

const LIFEOS_PRIVACY: Privacy = { href: "/privacy/lifeos", product: "LifeOS" };
const BRAAVO_PRIVACY: Privacy = { href: "/privacy/braavolabs", product: "Braavolabs" };
const MOTION_PRIVACY: Privacy = { href: "/privacy/motion", product: "Motion" };

/**
 * Rows 1 and 2 of scene 6. Every line names the product and carries only the
 * sources it truly rests on: the product record (`src/data/projects/*`), a
 * site privacy page, or both. No line speaks for "all products". A product
 * whose record or privacy page says nothing about a flow gets no sentence
 * about it. See docs/yula-execution/scene-6-evidence.md.
 */
const PROTECTION: readonly Line[] = [
  { key: "lifeos", record: lifeos, privacy: LIFEOS_PRIVACY },
  // Privacy policy only: it covers the mobile app; the record does not state a data flow.
  { key: "braavolabs", privacy: BRAAVO_PRIVACY },
  { key: "ostinato", record: ostinato, privacy: MOTION_PRIVACY },
  { key: "others", records: true, privacy: MOTION_PRIVACY },
];

const CONTROL: readonly Line[] = [
  // Record only: the privacy policy does not state the approval flow.
  { key: "braavolabs", record: braavolabs },
  // Privacy policy only: the record does not mention online AI.
  { key: "lifeos", privacy: LIFEOS_PRIVACY },
];

const PRODUCT_NAME: Record<string, string> = {
  lifeos: "LifeOS",
  braavolabs: "Braavolabs",
  ostinato: "Ostinato",
};

// Burun Farkı is not part of this scene; the rest of the portfolio is listed
// in registry order, status read from each record.
const STAGE_PRODUCTS = projects.filter((p) => p.slug !== "burunfarki");

const OTHERS = ["lissom", "gravita", "choreia", "jablab"]
  .map((slug) => projects.find((p) => p.slug === slug)?.name)
  .filter((n): n is string => Boolean(n))
  .join(", ");

function LineItem({ t, row, line, locale }: { t: Translate; row: string; line: Line; locale: string }) {
  const label = line.record
    ? t("scene6.srcRecord")
    : line.records
      ? t("scene6.srcRecords")
      : null;
  return (
    <li
      data-scene6-line={`${row}.${line.key}`}
      className="border-t border-ink-50/10 pt-3 first:border-t-0 first:pt-0"
    >
      <p className="text-base text-ink-50">
        <strong className="font-semibold">{PRODUCT_NAME[line.key] ?? OTHERS}</strong>
        {": "}
        {t(`scene6.rows.${row}.lines.${line.key}`)}
      </p>
      <p className="mt-1 font-mono text-[10px] tracking-widest uppercase text-ink-300">
        {t("scene6.sourceLabel")}:{" "}
        {label ? (
          <span data-scene6-source={line.record ? `projects/${line.record.slug}` : "projects"}>
            {label}
          </span>
        ) : null}
        {label && line.privacy ? <span aria-hidden="true">{" · "}</span> : null}
        {line.privacy ? (
          <a
            href={localePath(locale, line.privacy.href)}
            data-scene6-privacy={line.privacy.href}
            className="focusable underline underline-offset-4 hover:text-ink-50"
          >
            {t("scene6.srcPrivacy", { product: line.privacy.product })}
          </a>
        ) : null}
      </p>
    </li>
  );
}

/**
 * Body of scene 6 (WEB-P0-03g): four rows (data protection, control and
 * approval, measurable result, transparent product stage). Server rendered,
 * no script, no animation, no new dependency. Data flow is stated per product
 * and per feature; the section never claims a property for all products, and
 * it quotes no number because no outcome measurement is published.
 */
export function Scene6Trust({ t, ts, locale }: { t: Translate; ts: Translate; locale: string }) {
  return (
    <div data-scene6-trust="true" className="mt-12">
      <ul role="list" aria-label={t("scene6.listLabel")} className="grid gap-4">
        <li
          data-scene6-row="protection"
          className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5 md:p-6"
        >
          <h3 className="font-display text-xl font-semibold text-ink-50">
            {t("scene6.rows.protection.title")}
          </h3>
          <p className="mt-2 text-sm text-ink-300">{t("scene6.rows.protection.lead")}</p>
          <ul role="list" aria-label={t("scene6.rows.protection.title")} className="mt-4 grid gap-3">
            {PROTECTION.map((line) => (
              <LineItem key={line.key} t={t} row="protection" line={line} locale={locale} />
            ))}
          </ul>
        </li>

        <li
          data-scene6-row="control"
          className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5 md:p-6"
        >
          <h3 className="font-display text-xl font-semibold text-ink-50">
            {t("scene6.rows.control.title")}
          </h3>
          <p className="mt-2 text-sm text-ink-300">{t("scene6.rows.control.lead")}</p>
          <ul role="list" aria-label={t("scene6.rows.control.title")} className="mt-4 grid gap-3">
            {CONTROL.map((line) => (
              <LineItem key={line.key} t={t} row="control" line={line} locale={locale} />
            ))}
          </ul>
        </li>

        <li
          data-scene6-row="result"
          className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5 md:p-6"
        >
          <h3 className="font-display text-xl font-semibold text-ink-50">
            {t("scene6.rows.result.title")}
          </h3>
          <p data-scene6-result="none" className="mt-3 text-base text-ink-50">
            {t("scene6.rows.result.body")}
          </p>
          <p className="mt-2 text-sm text-ink-300">{t("scene6.rows.result.detail")}</p>
        </li>

        <li
          data-scene6-row="stage"
          className="rounded-2xl border border-ink-50/15 bg-ink-50/[0.04] p-5 md:p-6"
        >
          <h3 className="font-display text-xl font-semibold text-ink-50">
            {t("scene6.rows.stage.title")}
          </h3>
          <p className="mt-2 text-sm text-ink-300">{t("scene6.rows.stage.lead")}</p>
          <ul
            role="list"
            aria-label={t("scene6.rows.stage.title")}
            className="mt-4 flex flex-wrap gap-2"
          >
            {STAGE_PRODUCTS.map((p) => (
              <li
                key={p.slug}
                data-scene6-stage={p.slug}
                data-scene6-status={p.status}
                className="rounded-full border border-ink-50/30 px-3 py-1 text-sm text-ink-50"
              >
                <span className="font-semibold">{p.name}</span>
                <span aria-hidden="true">{" · "}</span>
                <span>{ts(STATUS_KEY[p.status as keyof typeof STATUS_KEY])}</span>
              </li>
            ))}
          </ul>
          <p data-scene6-stage-note="true" className="mt-3 text-sm text-ink-300">
            {t("scene6.rows.stage.note")}
          </p>
        </li>
      </ul>
      <p className="mt-4 max-w-[62ch] text-xs text-ink-300">{t("scene6.note")}</p>
    </div>
  );
}
