-- Y-P1-002 — leads, consent, outbox and data requests.
--
-- HOW THIS IS APPLIED: same as 0001, by hand until a runner exists.
--     psql "$DATABASE_URL" -f db/migrations/0002_leads_consents_outbox.sql
-- Idempotent throughout; safe to re-run.
--
-- ⚠️ THIS IS THE FIRST TABLE IN THIS DATABASE THAT HOLDS PERSONAL DATA.
--
-- `attributions` (0001) was built so that PII could not enter it: a closed
-- event vocabulary, no free text, a rotating pseudonym instead of an
-- identifier. None of that is available here — a lead IS a name, an email
-- and a message, and the whole point is to reply to a person. So the
-- protections are different in kind: explicit consent recorded alongside the
-- record, a retention date on every row from the moment it is written, and
-- redaction at every log site. Do not copy the "no PII by construction"
-- reasoning from 0001 onto this file; it does not apply.

CREATE TABLE IF NOT EXISTS leads (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      timestamptz NOT NULL DEFAULT now(),

    name            text        NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    email           text        NOT NULL CHECK (
                        length(email) BETWEEN 3 AND 254
                        AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    company         text        NULL CHECK (company IS NULL OR length(company) <= 160),

    intent          text        NOT NULL CHECK (intent IN
                        ('product', 'studio', 'partnership', 'press', 'privacy')),
    -- Only meaningful for a product intent; enforced as a pair below so a
    -- routing rule can never read a product slug that was never asked for.
    product_slug    text        NULL CHECK (product_slug IS NULL OR product_slug ~ '^[a-z0-9-]{1,64}$'),

    message         text        NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 4000),
    locale          text        NOT NULL CHECK (locale IN ('tr', 'en')),

    status          text        NOT NULL DEFAULT 'new' CHECK (status IN
                        ('new', 'qualified', 'unqualified', 'closed')),

    -- Written on every row at insert time, never left to a later job to
    -- decide. A record with no expiry is a record nobody ever deletes.
    -- 180 days is the roadmap's unqualified-lead retention; a lead that
    -- becomes an active conversation gets extended deliberately, under legal
    -- review, rather than by defaulting to forever.
    retention_until timestamptz NOT NULL DEFAULT (now() + interval '180 days'),

    -- sha256 of (email | message | intent | submission date), computed by the
    -- application. UNIQUE, so a double-click or a retried request is resolved
    -- by the DATABASE rather than by a check-then-insert in the app, which
    -- loses the race under concurrency and produces two leads and two
    -- receipts for one person. The date is part of the key so the same person
    -- genuinely writing again tomorrow is a new lead, not a swallowed one.
    dedupe_key      text        NOT NULL UNIQUE CHECK (dedupe_key ~ '^[0-9a-f]{64}$'),

    CONSTRAINT product_slug_only_for_product_intent CHECK (
        product_slug IS NULL OR intent = 'product'),
    CONSTRAINT retention_after_creation CHECK (retention_until > created_at)
);

-- Consent is a separate row, not a boolean column on the lead.
--
-- A boolean records THAT someone agreed; it cannot answer "to what, and
-- when?" — which is the only question that matters if the notice text
-- changes. Storing the notice version means a later edit to the privacy
-- copy cannot retroactively re-describe what a person actually agreed to.
CREATE TABLE IF NOT EXISTS lead_consents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id       uuid        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    notice_version text       NOT NULL CHECK (notice_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
    accepted_at   timestamptz NOT NULL DEFAULT now(),
    lawful_basis  text        NOT NULL CHECK (lawful_basis IN ('consent', 'legitimate_interest', 'contract')),
    UNIQUE (lead_id, notice_version)
);

-- Outbox rather than sending inline.
--
-- Writing the lead and sending the mail are different failure modes: a mail
-- provider being down must not lose the lead, and a lead being rejected must
-- not send a receipt. Both rows go in one transaction; delivery is a
-- separate, retryable step that reads this table.
CREATE TABLE IF NOT EXISTS event_outbox (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type    text        NOT NULL CHECK (event_type IN
                      ('lead_receipt', 'lead_internal_route', 'data_request_verification')),
    aggregate_id  uuid        NOT NULL,
    payload_json  jsonb       NOT NULL,
    attempts      integer     NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    delivered_at  timestamptz NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT delivered_after_creation CHECK (delivered_at IS NULL OR delivered_at >= created_at)
);

CREATE TABLE IF NOT EXISTS data_requests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email              text        NOT NULL CHECK (
                           length(email) BETWEEN 3 AND 254
                           AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    request_type       text        NOT NULL CHECK (request_type IN ('access', 'delete', 'correct')),
    -- A request is not actionable until the address is proven. Acting on an
    -- unverified "delete my data" is itself a way to delete someone else's.
    verification_state text        NOT NULL DEFAULT 'pending' CHECK (verification_state IN
                           ('pending', 'verified', 'expired')),
    created_at         timestamptz NOT NULL DEFAULT now(),
    completed_at       timestamptz NULL,
    CONSTRAINT completed_only_when_verified CHECK (
        completed_at IS NULL OR verification_state = 'verified'),
    CONSTRAINT completed_after_creation CHECK (completed_at IS NULL OR completed_at >= created_at)
);

CREATE INDEX IF NOT EXISTS leads_retention_idx      ON leads (retention_until);
CREATE INDEX IF NOT EXISTS leads_created_idx        ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS outbox_undelivered_idx   ON event_outbox (created_at) WHERE delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS data_requests_email_idx  ON data_requests (email, created_at DESC);
