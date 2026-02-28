


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "archive";


ALTER SCHEMA "archive" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."account_status" AS ENUM (
    'pending_approval',
    'active',
    'suspended',
    'inactive'
);


ALTER TYPE "public"."account_status" OWNER TO "postgres";


CREATE TYPE "public"."aggregate_period_type" AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'yearly',
    'all_time'
);


ALTER TYPE "public"."aggregate_period_type" OWNER TO "postgres";


CREATE TYPE "public"."alert_severity" AS ENUM (
    'info',
    'warning',
    'critical',
    'urgent'
);


ALTER TYPE "public"."alert_severity" OWNER TO "postgres";


CREATE TYPE "public"."alert_status" AS ENUM (
    'active',
    'acknowledged',
    'resolved',
    'dismissed'
);


ALTER TYPE "public"."alert_status" OWNER TO "postgres";


CREATE TYPE "public"."alert_type" AS ENUM (
    'low_stock',
    'device_overdue',
    'faulty_device',
    'missing_device',
    'warranty_expiring',
    'maintenance_due',
    'engineer_idle',
    'call_overdue'
);


ALTER TYPE "public"."alert_type" OWNER TO "postgres";


CREATE TYPE "public"."call_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."call_priority" OWNER TO "postgres";


CREATE TYPE "public"."call_status" AS ENUM (
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."call_status" OWNER TO "postgres";


CREATE TYPE "public"."call_type" AS ENUM (
    'installation',
    'swap',
    'deinstallation',
    'maintenance',
    'breakdown'
);


ALTER TYPE "public"."call_type" OWNER TO "postgres";


CREATE TYPE "public"."device_status" AS ENUM (
    'warehouse',
    'issued',
    'installed',
    'faulty',
    'returned'
);


ALTER TYPE "public"."device_status" OWNER TO "postgres";


CREATE TYPE "public"."import_status" AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed'
);


ALTER TYPE "public"."import_status" OWNER TO "postgres";


CREATE TYPE "public"."movement_type" AS ENUM (
    'status_change',
    'assignment',
    'transfer',
    'return',
    'issuance'
);


ALTER TYPE "public"."movement_type" OWNER TO "postgres";


CREATE TYPE "public"."photo_type" AS ENUM (
    'before',
    'after',
    'damage',
    'serial_number',
    'installation'
);


ALTER TYPE "public"."photo_type" OWNER TO "postgres";


CREATE TYPE "public"."staff_department" AS ENUM (
    'super_admin',
    'senior_manager',
    'manager',
    'stock_manager',
    'senior_coordinator',
    'coordinator',
    'stock_coordinator',
    'back_office_executive',
    'engineer'
);


ALTER TYPE "public"."staff_department" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'super_admin',
    'admin',
    'engineer',
    'senior_manager',
    'manager',
    'coordinator',
    'stock_coordinator',
    'project_head',
    'zonal_head',
    'regional_manager',
    'logistics_manager',
    'logistics_executive',
    'spoc_customer',
    'stock_manager',
    'stock_executive'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'pending_approval',
    'active',
    'suspended',
    'inactive'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM hr_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$;


ALTER FUNCTION "public"."hr_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_is_manager_of"("employee_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM hr_profiles WHERE id = employee_id AND reporting_manager_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."hr_is_manager_of"("employee_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hr_update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."hr_update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "archive"."uds_archive_call" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "call_no" character varying(50) NOT NULL,
    "customer_name" character varying(100) NOT NULL,
    "tid" character varying(50) NOT NULL,
    "merchant_id" "uuid",
    "device_id" "uuid",
    "device_model" character varying(100),
    "call_type" character varying(20),
    "priority" character varying(10) DEFAULT 'MEDIUM'::character varying,
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "form_config" "jsonb",
    "created_by" "uuid",
    "engineer_id" "uuid",
    "assigned_at" timestamp without time zone,
    "scheduled_date" "date",
    "completed_at" timestamp without time zone,
    "distance_traveled" numeric(10,2),
    "travel_start_location" "jsonb",
    "travel_end_location" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "archive"."uds_archive_call" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "archive"."uds_archive_device" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "serial_number" character varying(100) NOT NULL,
    "brand" character varying(50),
    "model" character varying(50),
    "device_type" character varying(50),
    "status" character varying(20) DEFAULT 'GOOD'::character varying,
    "current_tid" character varying(50),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "archive"."uds_archive_device" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "archive"."uds_archive_merchant" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_code" character varying(50) NOT NULL,
    "merchant_name" character varying(200) NOT NULL,
    "customer_name" character varying(100) NOT NULL,
    "business_type" character varying(50),
    "address" "text",
    "city" character varying(100),
    "state" character varying(100),
    "pincode" character varying(10),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "contact_person" character varying(100),
    "phone" character varying(20),
    "email" character varying(100),
    "gst_number" character varying(30),
    "status" character varying(20) DEFAULT 'ACTIVE'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "archive"."uds_archive_merchant" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "archive"."uds_archive_stock" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_name" character varying(100) NOT NULL,
    "transaction_no" character varying(50) NOT NULL,
    "transaction_type" character varying(20),
    "from_entity_type" character varying(20),
    "from_entity_id" "uuid",
    "to_entity_type" character varying(20),
    "to_entity_id" "uuid",
    "tid" character varying(50),
    "item_id" "uuid",
    "quantity" integer NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "requested_by" "uuid",
    "approved_by" "uuid",
    "request_remarks" "text",
    "approval_remarks" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "approved_at" timestamp without time zone
);


ALTER TABLE "archive"."uds_archive_stock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "archive"."uds_archive_tid" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tid" character varying(50) NOT NULL,
    "customer_name" character varying(100) NOT NULL,
    "mid" character varying(50),
    "status" character varying(20) DEFAULT 'AVAILABLE'::character varying,
    "device_id" "uuid",
    "installation_date" "date",
    "faulty_date" "date",
    "disposal_date" "date",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "archive"."uds_archive_tid" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "punch_in_at" timestamp with time zone,
    "punch_out_at" timestamp with time zone,
    "punch_in_lat" double precision,
    "punch_in_long" double precision,
    "punch_out_lat" double precision,
    "punch_out_long" double precision,
    "total_distance_km" double precision,
    "status" "text" DEFAULT 'present'::"text" NOT NULL,
    "synced" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hr_attendance_status_check" CHECK (("status" = ANY (ARRAY['present'::"text", 'absent'::"text", 'late'::"text", 'half-day'::"text", 'on-leave'::"text", 'holiday'::"text", 'lwp'::"text"])))
);


ALTER TABLE "public"."hr_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_leave_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "sick_leave_total" integer DEFAULT 5,
    "sick_leave_used" integer DEFAULT 0,
    "casual_leave_total" integer DEFAULT 10,
    "casual_leave_used" integer DEFAULT 0,
    "compoff_total" integer DEFAULT 0,
    "compoff_used" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "privilege_leave_total" integer DEFAULT 0 NOT NULL,
    "privilege_leave_used" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."hr_leave_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_leave_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sick_leave_count" integer DEFAULT 0 NOT NULL,
    "casual_leave_count" integer DEFAULT 0 NOT NULL,
    "privilege_leave_count" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_leave_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_leave_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "attachment_url" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewer_comment" "text",
    CONSTRAINT "hr_leave_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'withdrawn'::"text"]))),
    CONSTRAINT "hr_leave_requests_type_check" CHECK (("type" = ANY (ARRAY['sick'::"text", 'casual'::"text", 'compoff'::"text", 'privilege'::"text"])))
);


ALTER TABLE "public"."hr_leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_location_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attendance_id" "uuid",
    "lat" double precision NOT NULL,
    "long" double precision NOT NULL,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_location_logs_source_check" CHECK (("source" = ANY (ARRAY['punch_in'::"text", 'punch_out'::"text", 'scheduled'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."hr_location_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_master_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "external_url" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_master_data_type_check" CHECK (("type" = ANY (ARRAY['project'::"text", 'department'::"text", 'designation'::"text"])))
);


ALTER TABLE "public"."hr_master_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_anonymous" boolean DEFAULT true NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hr_messages_category_check" CHECK (("category" = ANY (ARRAY['complaint'::"text", 'suggestion'::"text", 'feedback'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."hr_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "type" "text" NOT NULL,
    "reference_id" "uuid",
    "reference_type" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "hr_notifications_type_check" CHECK (("type" = ANY (ARRAY['leave_request'::"text", 'leave_approved'::"text", 'leave_rejected'::"text", 'leave_withdrawn'::"text", 'rectification_request'::"text", 'rectification_approved'::"text", 'rectification_rejected'::"text", 'system'::"text", 'announcement'::"text"])))
);


ALTER TABLE "public"."hr_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_onboarding_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "created_by" "uuid",
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hr_onboarding_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hr_profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "designation" "text",
    "reporting_manager_id" "uuid",
    "project_id" "text",
    "department" "text",
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "avatar_url" "text",
    "phone" "text",
    "email" "text",
    "date_of_joining" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "employee_code" "text",
    "address" "text",
    "city" "text",
    "state" "text",
    "pincode" "text",
    "deactivated_at" timestamp with time zone,
    "leave_policy_id" "uuid",
    "kyc_data" "jsonb",
    CONSTRAINT "hr_profiles_role_check" CHECK (("role" = ANY (ARRAY['employee'::"text", 'manager'::"text", 'admin'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."hr_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."hr_profiles"."kyc_data" IS 'KYC and bank details: {aadhaar, pan, bank_name, account_no, ifsc}';



CREATE TABLE IF NOT EXISTS "public"."hr_rectification_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "attendance_date" "date" NOT NULL,
    "attendance_id" "uuid",
    "rectification_type" "text" NOT NULL,
    "original_punch_in" timestamp with time zone,
    "original_punch_out" timestamp with time zone,
    "corrected_punch_in" timestamp with time zone,
    "corrected_punch_out" timestamp with time zone,
    "corrected_status" "text",
    "reason" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewer_comment" "text",
    CONSTRAINT "hr_rectification_requests_corrected_status_check" CHECK (("corrected_status" = ANY (ARRAY['present'::"text", 'late'::"text", 'half-day'::"text"]))),
    CONSTRAINT "hr_rectification_requests_rectification_type_check" CHECK (("rectification_type" = ANY (ARRAY['missed_punch_in'::"text", 'missed_punch_out'::"text", 'wrong_time'::"text", 'other'::"text"]))),
    CONSTRAINT "hr_rectification_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."hr_rectification_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pincode_master" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pincode" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "region" "text" NOT NULL,
    "sla_hours" integer DEFAULT 48 NOT NULL,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "is_serviceable" boolean DEFAULT true,
    "zone" "text",
    "district" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "area_name" character varying(200),
    "primary_coordinator_id" "uuid",
    "service_priority" character varying(20) DEFAULT 'normal'::character varying,
    "created_by" "uuid",
    "updated_by" "uuid",
    "warehouse_id" "uuid",
    CONSTRAINT "pincode_master_service_priority_check" CHECK ((("service_priority")::"text" = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'priority'::character varying])::"text"[])))
);


ALTER TABLE "public"."pincode_master" OWNER TO "postgres";


COMMENT ON TABLE "public"."pincode_master" IS 'Master table for pincode to region/SLA mapping for auto-population during data entry';



COMMENT ON COLUMN "public"."pincode_master"."warehouse_id" IS 'The warehouse/office responsible for this pincode area';



ALTER TABLE ONLY "archive"."uds_archive_call"
    ADD CONSTRAINT "uds_archive_call_call_no_key" UNIQUE ("call_no");



ALTER TABLE ONLY "archive"."uds_archive_call"
    ADD CONSTRAINT "uds_archive_call_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "archive"."uds_archive_device"
    ADD CONSTRAINT "uds_archive_device_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "archive"."uds_archive_device"
    ADD CONSTRAINT "uds_archive_device_serial_number_key" UNIQUE ("serial_number");



ALTER TABLE ONLY "archive"."uds_archive_merchant"
    ADD CONSTRAINT "uds_archive_merchant_merchant_code_key" UNIQUE ("merchant_code");



ALTER TABLE ONLY "archive"."uds_archive_merchant"
    ADD CONSTRAINT "uds_archive_merchant_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "archive"."uds_archive_stock"
    ADD CONSTRAINT "uds_archive_stock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "archive"."uds_archive_stock"
    ADD CONSTRAINT "uds_archive_stock_transaction_no_key" UNIQUE ("transaction_no");



ALTER TABLE ONLY "archive"."uds_archive_tid"
    ADD CONSTRAINT "uds_archive_tid_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "archive"."uds_archive_tid"
    ADD CONSTRAINT "uds_archive_tid_tid_key" UNIQUE ("tid");



ALTER TABLE ONLY "public"."hr_attendance"
    ADD CONSTRAINT "hr_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_config"
    ADD CONSTRAINT "hr_config_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."hr_config"
    ADD CONSTRAINT "hr_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_leave_balances"
    ADD CONSTRAINT "hr_leave_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_leave_balances"
    ADD CONSTRAINT "hr_leave_balances_user_id_year_key" UNIQUE ("user_id", "year");



ALTER TABLE ONLY "public"."hr_leave_policies"
    ADD CONSTRAINT "hr_leave_policies_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."hr_leave_policies"
    ADD CONSTRAINT "hr_leave_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_leave_requests"
    ADD CONSTRAINT "hr_leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_location_logs"
    ADD CONSTRAINT "hr_location_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_master_data"
    ADD CONSTRAINT "hr_master_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_master_data"
    ADD CONSTRAINT "hr_master_data_type_name_key" UNIQUE ("type", "name");



ALTER TABLE ONLY "public"."hr_messages"
    ADD CONSTRAINT "hr_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_notifications"
    ADD CONSTRAINT "hr_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_onboarding_tokens"
    ADD CONSTRAINT "hr_onboarding_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_onboarding_tokens"
    ADD CONSTRAINT "hr_onboarding_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."hr_profiles"
    ADD CONSTRAINT "hr_profiles_employee_code_key" UNIQUE ("employee_code");



ALTER TABLE ONLY "public"."hr_profiles"
    ADD CONSTRAINT "hr_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hr_rectification_requests"
    ADD CONSTRAINT "hr_rectification_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pincode_master"
    ADD CONSTRAINT "pincode_master_pincode_key" UNIQUE ("pincode");



ALTER TABLE ONLY "public"."pincode_master"
    ADD CONSTRAINT "pincode_master_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_hr_attendance_user_date" ON "public"."hr_attendance" USING "btree" ("user_id", "created_at");



CREATE INDEX "idx_hr_leave_requests_user" ON "public"."hr_leave_requests" USING "btree" ("user_id", "status");



CREATE INDEX "idx_hr_profiles_manager" ON "public"."hr_profiles" USING "btree" ("reporting_manager_id");



CREATE INDEX "idx_hr_rectification_date" ON "public"."hr_rectification_requests" USING "btree" ("attendance_date");



CREATE INDEX "idx_hr_rectification_user" ON "public"."hr_rectification_requests" USING "btree" ("user_id", "status");



CREATE INDEX "idx_location_logs_attendance" ON "public"."hr_location_logs" USING "btree" ("attendance_id");



CREATE INDEX "idx_location_logs_user_captured" ON "public"."hr_location_logs" USING "btree" ("user_id", "captured_at");



CREATE INDEX "idx_pincode_master_coordinator" ON "public"."pincode_master" USING "btree" ("primary_coordinator_id");



CREATE INDEX "idx_pincode_master_pincode" ON "public"."pincode_master" USING "btree" ("pincode");



CREATE INDEX "idx_pincode_master_priority" ON "public"."pincode_master" USING "btree" ("service_priority");



CREATE INDEX "idx_pincode_master_region" ON "public"."pincode_master" USING "btree" ("region");



CREATE INDEX "idx_pincode_master_state" ON "public"."pincode_master" USING "btree" ("state");



CREATE INDEX "idx_pincode_master_warehouse_id" ON "public"."pincode_master" USING "btree" ("warehouse_id");



CREATE OR REPLACE TRIGGER "hr_leave_balances_updated_at" BEFORE UPDATE ON "public"."hr_leave_balances" FOR EACH ROW EXECUTE FUNCTION "public"."hr_update_updated_at"();



CREATE OR REPLACE TRIGGER "hr_profiles_updated_at" BEFORE UPDATE ON "public"."hr_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."hr_update_updated_at"();



ALTER TABLE ONLY "public"."hr_attendance"
    ADD CONSTRAINT "hr_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."hr_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_config"
    ADD CONSTRAINT "hr_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hr_leave_balances"
    ADD CONSTRAINT "hr_leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."hr_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_leave_requests"
    ADD CONSTRAINT "hr_leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."hr_profiles"("id");



ALTER TABLE ONLY "public"."hr_leave_requests"
    ADD CONSTRAINT "hr_leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."hr_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_location_logs"
    ADD CONSTRAINT "hr_location_logs_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."hr_attendance"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_location_logs"
    ADD CONSTRAINT "hr_location_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."hr_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_messages"
    ADD CONSTRAINT "hr_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hr_notifications"
    ADD CONSTRAINT "hr_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."hr_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_onboarding_tokens"
    ADD CONSTRAINT "hr_onboarding_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."hr_profiles"
    ADD CONSTRAINT "hr_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hr_profiles"
    ADD CONSTRAINT "hr_profiles_leave_policy_id_fkey" FOREIGN KEY ("leave_policy_id") REFERENCES "public"."hr_leave_policies"("id");



ALTER TABLE ONLY "public"."hr_profiles"
    ADD CONSTRAINT "hr_profiles_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "public"."hr_profiles"("id");



ALTER TABLE ONLY "public"."hr_rectification_requests"
    ADD CONSTRAINT "hr_rectification_requests_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."hr_attendance"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."hr_rectification_requests"
    ADD CONSTRAINT "hr_rectification_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."hr_profiles"("id");



ALTER TABLE ONLY "public"."hr_rectification_requests"
    ADD CONSTRAINT "hr_rectification_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."hr_profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create onboarding tokens" ON "public"."hr_onboarding_tokens" FOR INSERT TO "authenticated" WITH CHECK ("public"."hr_is_admin"());



CREATE POLICY "Admins can delete onboarding tokens" ON "public"."hr_onboarding_tokens" FOR DELETE TO "authenticated" USING ("public"."hr_is_admin"());



CREATE POLICY "Admins can insert config" ON "public"."hr_config" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "auth"."uid"()) AND ("hr_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can modify all profiles" ON "public"."hr_profiles" USING ("public"."hr_is_admin"());



CREATE POLICY "Admins can read all profiles" ON "public"."hr_profiles" FOR SELECT USING ("public"."hr_is_admin"());



CREATE POLICY "Admins can read messages" ON "public"."hr_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "auth"."uid"()) AND ("hr_profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can update config" ON "public"."hr_config" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "auth"."uid"()) AND ("hr_profiles"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "auth"."uid"()) AND ("hr_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update messages" ON "public"."hr_messages" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "auth"."uid"()) AND ("hr_profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can view onboarding tokens" ON "public"."hr_onboarding_tokens" FOR SELECT TO "authenticated" USING ("public"."hr_is_admin"());



CREATE POLICY "Admins full access attendance" ON "public"."hr_attendance" USING ("public"."hr_is_admin"());



CREATE POLICY "Admins full access leave balances" ON "public"."hr_leave_balances" USING ("public"."hr_is_admin"());



CREATE POLICY "Admins full access leave requests" ON "public"."hr_leave_requests" USING ("public"."hr_is_admin"());



CREATE POLICY "Admins full access notifications" ON "public"."hr_notifications" USING ("public"."hr_is_admin"());



CREATE POLICY "Admins full access rectification requests" ON "public"."hr_rectification_requests" USING ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "auth"."uid"()) AND ("hr_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow authenticated read pincode_master" ON "public"."pincode_master" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can mark token as used" ON "public"."hr_onboarding_tokens" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can validate onboarding tokens" ON "public"."hr_onboarding_tokens" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Authenticated can insert notifications" ON "public"."hr_notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated can read config" ON "public"."hr_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Managers can update team leave balances" ON "public"."hr_leave_balances" FOR UPDATE USING ("public"."hr_is_manager_of"("user_id"));



CREATE POLICY "Managers can update team leave requests" ON "public"."hr_leave_requests" FOR UPDATE USING ("public"."hr_is_manager_of"("user_id"));



CREATE POLICY "Managers can update team rectification requests" ON "public"."hr_rectification_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "hr_rectification_requests"."user_id") AND ("hr_profiles"."reporting_manager_id" = "auth"."uid"())))));



CREATE POLICY "Managers can view reports" ON "public"."hr_profiles" FOR SELECT USING (("reporting_manager_id" = "auth"."uid"()));



CREATE POLICY "Managers can view team attendance" ON "public"."hr_attendance" FOR SELECT USING ("public"."hr_is_manager_of"("user_id"));



CREATE POLICY "Managers can view team leave balances" ON "public"."hr_leave_balances" FOR SELECT USING ("public"."hr_is_manager_of"("user_id"));



CREATE POLICY "Managers can view team leave requests" ON "public"."hr_leave_requests" FOR SELECT USING ("public"."hr_is_manager_of"("user_id"));



CREATE POLICY "Managers can view team rectification requests" ON "public"."hr_rectification_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "hr_rectification_requests"."user_id") AND ("hr_profiles"."reporting_manager_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own attendance" ON "public"."hr_attendance" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own leave requests" ON "public"."hr_leave_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own messages" ON "public"."hr_messages" FOR INSERT TO "authenticated" WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own rectification requests" ON "public"."hr_rectification_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own messages" ON "public"."hr_messages" FOR SELECT TO "authenticated" USING (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can update own attendance" ON "public"."hr_attendance" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own leave balance" ON "public"."hr_leave_balances" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."hr_notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own pending leave requests" ON "public"."hr_leave_requests" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND ("status" = 'pending'::"text"))) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."hr_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own attendance" ON "public"."hr_attendance" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own leave balance" ON "public"."hr_leave_balances" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own leave requests" ON "public"."hr_leave_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."hr_notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."hr_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own rectification requests" ON "public"."hr_rectification_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "admin_all" ON "public"."hr_leave_policies" USING (true);



CREATE POLICY "admin_all" ON "public"."hr_master_data" USING (true);



ALTER TABLE "public"."hr_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leave_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leave_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_leave_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_location_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_master_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_onboarding_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hr_rectification_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "location_logs_admin_all" ON "public"."hr_location_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "auth"."uid"()) AND ("hr_profiles"."role" = 'admin'::"text")))));



CREATE POLICY "location_logs_insert_own" ON "public"."hr_location_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "location_logs_select_manager" ON "public"."hr_location_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."hr_profiles"
  WHERE (("hr_profiles"."id" = "hr_location_logs"."user_id") AND ("hr_profiles"."reporting_manager_id" = "auth"."uid"())))));



CREATE POLICY "location_logs_select_own" ON "public"."hr_location_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."pincode_master" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pincode_master_select_policy" ON "public"."pincode_master" FOR SELECT TO "authenticated" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_is_manager_of"("employee_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."hr_is_manager_of"("employee_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_is_manager_of"("employee_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."hr_update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."hr_update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hr_update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."hr_attendance" TO "anon";
GRANT ALL ON TABLE "public"."hr_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."hr_config" TO "anon";
GRANT ALL ON TABLE "public"."hr_config" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_config" TO "service_role";



GRANT ALL ON TABLE "public"."hr_leave_balances" TO "anon";
GRANT ALL ON TABLE "public"."hr_leave_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_leave_balances" TO "service_role";



GRANT ALL ON TABLE "public"."hr_leave_policies" TO "anon";
GRANT ALL ON TABLE "public"."hr_leave_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_leave_policies" TO "service_role";



GRANT ALL ON TABLE "public"."hr_leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."hr_leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."hr_location_logs" TO "anon";
GRANT ALL ON TABLE "public"."hr_location_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_location_logs" TO "service_role";



GRANT ALL ON TABLE "public"."hr_master_data" TO "anon";
GRANT ALL ON TABLE "public"."hr_master_data" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_master_data" TO "service_role";



GRANT ALL ON TABLE "public"."hr_messages" TO "anon";
GRANT ALL ON TABLE "public"."hr_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_messages" TO "service_role";



GRANT ALL ON TABLE "public"."hr_notifications" TO "anon";
GRANT ALL ON TABLE "public"."hr_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."hr_onboarding_tokens" TO "anon";
GRANT ALL ON TABLE "public"."hr_onboarding_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_onboarding_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."hr_profiles" TO "anon";
GRANT ALL ON TABLE "public"."hr_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."hr_rectification_requests" TO "anon";
GRANT ALL ON TABLE "public"."hr_rectification_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."hr_rectification_requests" TO "service_role";



GRANT ALL ON TABLE "public"."pincode_master" TO "anon";
GRANT ALL ON TABLE "public"."pincode_master" TO "authenticated";
GRANT ALL ON TABLE "public"."pincode_master" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































