-- Y-P1-004 security correction: durable data-request admission and a
-- server-bound Studio qualification metric. Local candidate only; production
-- application remains a separate founder/manual gate.
BEGIN;

-- PostgreSQL implicitly searches pg_temp first for relations unless it is
-- positioned explicitly. Pin the already-selected migration target ahead of
-- pg_temp so a session-local shadow cannot absorb any unqualified DDL below.
DO $$
DECLARE
    target_schema text := current_schema();
BEGIN
    IF target_schema IS NULL
       OR target_schema IN ('pg_catalog', 'information_schema')
       OR target_schema LIKE 'pg_temp_%'
       OR target_schema LIKE 'pg_toast%' THEN
        RAISE EXCEPTION 'unsafe studio-metric target schema';
    END IF;
    PERFORM set_config(
        'search_path',
        format('%I, pg_catalog, pg_temp', target_schema),
        true
    );
END
$$;

-- Existing rows are the durable admission ledger. These indexes keep the
-- normalized-recipient cooldown and global rolling-window count bounded.
CREATE INDEX IF NOT EXISTS data_requests_recipient_cooldown_idx
    ON data_requests ((lower(btrim(email))), request_type, created_at DESC);
CREATE INDEX IF NOT EXISTS data_requests_global_window_idx
    ON data_requests (created_at DESC);

-- Forward-correct a database that already applied the earlier 0004: the
-- qualified verdict is no longer accepted through anonymous attribution.
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
                     'support_outbound'));
COMMENT ON CONSTRAINT attributions_event_name_check ON attributions
    IS 'yulalab:migration=0005:studio-acceptance-metric';

-- The existing createLead transaction writes the internal route after the
-- lead. Enforce that a qualified route can reference only that accepted
-- Studio lead; aggregate_id alone has no FK because the outbox also serves
-- data requests.
CREATE OR REPLACE FUNCTION enforce_studio_qualified_route() RETURNS trigger AS $$
DECLARE
    accepted_studio_lead boolean;
BEGIN
    IF NEW.event_type = 'lead_internal_route'
       AND NEW.payload_json->>'route' = 'studio-qualified' THEN
        -- The trigger relation owns the target-schema identity. `%I` quotes
        -- that server-supplied identifier, while parameters carry row data;
        -- neither caller search_path nor pg_temp can redirect the lookup.
        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM %I.leads WHERE id = $1 AND intent = ''studio'')',
            TG_TABLE_SCHEMA
        ) INTO accepted_studio_lead USING NEW.aggregate_id;

        IF NEW.payload_json->>'intent' <> 'studio'
           OR NOT accepted_studio_lead THEN
            RAISE EXCEPTION 'studio-qualified route must reference an accepted Studio lead'
                USING ERRCODE = '23514',
                      CONSTRAINT = 'studio_qualified_route_requires_studio_lead';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = pg_catalog, pg_temp;

-- Trigger invocation does not require callers to hold direct EXECUTE on the
-- function. Remove the PostgreSQL default PUBLIC grant so API roles cannot
-- call this enforcement helper as an ordinary function.
REVOKE ALL ON FUNCTION enforce_studio_qualified_route() FROM PUBLIC;
DO $$
DECLARE
    target_schema text := current_schema();
    grantee_name text;
BEGIN
    FOR grantee_name IN
        SELECT role.rolname
          FROM pg_proc proc
          JOIN pg_namespace namespace ON namespace.oid = proc.pronamespace
          CROSS JOIN LATERAL aclexplode(
              coalesce(proc.proacl, acldefault('f', proc.proowner))
          ) acl
          JOIN pg_roles role ON role.oid = acl.grantee
         WHERE namespace.nspname = target_schema
           AND proc.proname = 'enforce_studio_qualified_route'
           AND proc.pronargs = 0
           AND proc.prorettype = 'trigger'::regtype
           AND acl.grantee <> proc.proowner
           AND acl.privilege_type = 'EXECUTE'
    LOOP
        EXECUTE format(
            'REVOKE ALL ON FUNCTION %I.enforce_studio_qualified_route() FROM %I',
            target_schema,
            grantee_name
        );
    END LOOP;
END
$$;

DROP TRIGGER IF EXISTS event_outbox_bind_studio_qualified ON event_outbox;
CREATE TRIGGER event_outbox_bind_studio_qualified
    BEFORE INSERT OR UPDATE OF event_type, aggregate_id, payload_json ON event_outbox
    FOR EACH ROW EXECUTE FUNCTION enforce_studio_qualified_route();

-- createLead's dedupe already returns the winning receipt. This index makes
-- the metric itself independently idempotent if a future retry path reaches
-- the outbox insert again.
CREATE UNIQUE INDEX IF NOT EXISTS event_outbox_studio_qualified_once
    ON event_outbox (aggregate_id)
    WHERE event_type = 'lead_internal_route'
      AND payload_json->>'route' = 'studio-qualified';

-- Fail the migration before commit if later edits weaken the function
-- boundary or detach/disable its trigger.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM pg_proc proc
         WHERE proc.pronamespace = current_schema()::regnamespace
           AND proc.proname = 'enforce_studio_qualified_route'
           AND proc.pronargs = 0
           AND proc.prorettype = 'trigger'::regtype
           AND (
               proc.prosecdef
               OR proc.proconfig IS DISTINCT FROM
                  ARRAY['search_path=pg_catalog, pg_temp']::text[]
               OR EXISTS (
                   SELECT 1
                     FROM aclexplode(coalesce(proc.proacl, acldefault('f', proc.proowner))) acl
                    WHERE acl.grantee <> proc.proowner
                      AND acl.privilege_type = 'EXECUTE'
               )
           )
    ) THEN
        RAISE EXCEPTION 'incompatible studio-qualified function security/search_path/ACL';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint constraint_row
          JOIN pg_class table_class ON table_class.oid = constraint_row.conrelid
         WHERE table_class.relnamespace = current_schema()::regnamespace
           AND table_class.relname = 'attributions'
           AND constraint_row.conname = 'attributions_event_name_check'
           AND pg_get_constraintdef(constraint_row.oid) NOT LIKE
               '%studio_application_qualified%'
    ) THEN
        RAISE EXCEPTION 'studio-qualified attribution constraint postflight failed';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_class index_class
          JOIN pg_index index_row ON index_row.indexrelid = index_class.oid
          JOIN pg_class table_class ON table_class.oid = index_row.indrelid
         WHERE index_class.relnamespace = current_schema()::regnamespace
           AND index_class.relname = 'data_requests_recipient_cooldown_idx'
           AND table_class.relname = 'data_requests'
    ) OR NOT EXISTS (
        SELECT 1
          FROM pg_class index_class
          JOIN pg_index index_row ON index_row.indexrelid = index_class.oid
          JOIN pg_class table_class ON table_class.oid = index_row.indrelid
         WHERE index_class.relnamespace = current_schema()::regnamespace
           AND index_class.relname = 'data_requests_global_window_idx'
           AND table_class.relname = 'data_requests'
    ) THEN
        RAISE EXCEPTION 'data-request admission index postflight failed';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_trigger trigger
          JOIN pg_class table_class ON table_class.oid = trigger.tgrelid
          JOIN pg_proc proc ON proc.oid = trigger.tgfoid
         WHERE table_class.relnamespace = current_schema()::regnamespace
           AND table_class.relname = 'event_outbox'
           AND trigger.tgname = 'event_outbox_bind_studio_qualified'
           AND trigger.tgenabled = 'O'
           AND proc.pronamespace = current_schema()::regnamespace
           AND proc.proname = 'enforce_studio_qualified_route'
    ) THEN
        RAISE EXCEPTION 'studio-qualified trigger postflight failed';
    END IF;
END
$$;

COMMIT;
