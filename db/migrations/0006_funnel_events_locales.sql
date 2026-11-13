-- WEB-P1-03 funnel analytics: three new anonymous funnel events and the 14
-- public site locales on the first-party attribution table. Touches only
-- attributions' two CHECK constraints; no data, index, RLS or grant change.
-- Local candidate only; production application stays a separate founder gate.
--
-- Rollback (only while no row uses a new value; otherwise the ADD below fails
-- by design and the offending rows must be reviewed first): re-run the 0005
-- event_name constraint block and
--   ALTER TABLE attributions DROP CONSTRAINT attributions_locale_check;
--   ALTER TABLE attributions ADD CONSTRAINT attributions_locale_check
--       CHECK (locale IN ('tr', 'en'));
BEGIN;

-- Same pg_temp pinning as 0005: a session-local shadow must not absorb the
-- unqualified DDL below.
DO $$
DECLARE
    target_schema text := current_schema();
BEGIN
    IF target_schema IS NULL
       OR target_schema IN ('pg_catalog', 'information_schema')
       OR target_schema LIKE 'pg_temp_%'
       OR target_schema LIKE 'pg_toast%' THEN
        RAISE EXCEPTION 'unsafe funnel-events target schema';
    END IF;
    PERFORM set_config(
        'search_path',
        format('%I, pg_catalog, pg_temp', target_schema),
        true
    );
END
$$;

ALTER TABLE attributions DROP CONSTRAINT IF EXISTS attributions_event_name_check;
ALTER TABLE attributions ADD CONSTRAINT attributions_event_name_check CHECK (event_name IN
(
                     'home_primary_cta',
                     'products_filter_changed',
                     'product_view',
                     'product_primary_cta',
                     'store_outbound',
                     'demo_request_started',
                     'demo_request_submitted',
                     'case_study_view',
                     'case_study_cta',
                     'studio_view',
                     'studio_application_started',
                     'studio_application_submitted',
                     'support_outbound',
                     'home_view',
                     'lead_form_started',
                     'lead_form_submitted'));
COMMENT ON CONSTRAINT attributions_event_name_check ON attributions
    IS 'yulalab:migration=0006:funnel-events-locales';

ALTER TABLE attributions DROP CONSTRAINT IF EXISTS attributions_locale_check;
ALTER TABLE attributions ADD CONSTRAINT attributions_locale_check CHECK (locale IN
(
                     'tr', 'en', 'ar', 'de', 'es-419', 'fr', 'hi',
                     'id', 'it', 'ja', 'ko', 'pl', 'pt-BR', 'zh-Hans'));
COMMENT ON CONSTRAINT attributions_locale_check ON attributions
    IS 'yulalab:migration=0006:funnel-events-locales';

-- Fail before commit if either constraint is missing or lacks any of the three
-- new event names / the last locale.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint constraint_row
          JOIN pg_class table_class ON table_class.oid = constraint_row.conrelid
         WHERE table_class.relnamespace = current_schema()::regnamespace
           AND table_class.relname = 'attributions'
           AND constraint_row.conname = 'attributions_event_name_check'
           AND pg_get_constraintdef(constraint_row.oid) LIKE '%home_view%'
           AND pg_get_constraintdef(constraint_row.oid) LIKE '%lead_form_started%'
           AND pg_get_constraintdef(constraint_row.oid) LIKE '%lead_form_submitted%'
    ) OR NOT EXISTS (
        SELECT 1
          FROM pg_constraint constraint_row
          JOIN pg_class table_class ON table_class.oid = constraint_row.conrelid
         WHERE table_class.relnamespace = current_schema()::regnamespace
           AND table_class.relname = 'attributions'
           AND constraint_row.conname = 'attributions_locale_check'
           AND pg_get_constraintdef(constraint_row.oid) LIKE '%zh-Hans%'
    ) THEN
        RAISE EXCEPTION 'funnel-events constraint postflight failed';
    END IF;
END
$$;

COMMIT;
