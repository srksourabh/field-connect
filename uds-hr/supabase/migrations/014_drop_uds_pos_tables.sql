-- ============================================================
-- Migration 014: Remove all UDS-POS tables, views, and functions
-- Keeps: hr_* tables (9) + pincode_master
-- ============================================================

-- 1. Drop all non-HR views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_name FROM information_schema.views
        WHERE table_schema = 'public'
          AND table_name NOT LIKE 'hr_%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
END
$$;

-- 2. Drop all non-HR materialized views
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT matviewname FROM pg_matviews
        WHERE schemaname = 'public'
          AND matviewname NOT LIKE 'hr_%'
    LOOP
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
    END LOOP;
END
$$;

-- 3. Drop all non-HR tables (except pincode_master)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'hr_%'
          AND table_name != 'pincode_master'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
END
$$;

-- 4. Drop all non-HR functions (skip extension-owned functions)
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname NOT LIKE 'hr_%'
          AND NOT EXISTS (
              SELECT 1 FROM pg_depend d
              WHERE d.objid = p.oid
                AND d.deptype = 'e'
          )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
    END LOOP;
END
$$;
