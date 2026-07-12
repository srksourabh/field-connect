# Phase 1 PR TODOs & SQL Migrations

## Overview
Purpose: produce a prioritized set of PRs and SQL migration snippets to implement the MVP Saudi compliance features (data model, payroll logic hooks, WPS export, alerts, Hijri support).

## PRs (ordered)
1. PR: db/migrations/001_add_saudi_fields.sql — add Saudi-specific columns to hr_profiles and hr_employee_salary, create hr_gosi_history, hr_wps_exports.
2. PR: backend/payroll-saudi — extend src/app/api/admin/payroll/route.ts to add ESB, GOSI dual-rate calculation, overtime 1.5x, Ramadan hours flags, and pre-export validation.
3. PR: backend/employee-saudi-fields — extend salary APIs and profile APIs to read/write Qiwa and doc expiry fields.
4. PR: frontend/saudi-ui — add profile UI inputs for iqama/passport/gosi, add Arabic labels and locale toggles in payroll UI.
5. PR: exports/wps — new API route src/app/api/admin/payroll/wps-export/route.ts that produces WPS CSV for manual upload and stores metadata in hr_wps_exports.
6. PR: alerts/doc-expiry — cron route src/app/api/cron/doc-expiry-alerts/route.ts and notification enqueueing.
7. PR: i18n/hijri — add Hijri conversion utility and integrate into payslip/PDF generation.

## SQL migration: 001_add_saudi_fields.sql
-- Add columns and tables for Saudi support
BEGIN;

ALTER TABLE public.hr_profiles
  ADD COLUMN IF NOT EXISTS nationality varchar(50),
  ADD COLUMN IF NOT EXISTS iqama_number varchar(50),
  ADD COLUMN IF NOT EXISTS iqama_expiry date,
  ADD COLUMN IF NOT EXISTS work_permit_expiry date,
  ADD COLUMN IF NOT EXISTS passport_expiry date,
  ADD COLUMN IF NOT EXISTS visa_status varchar(50),
  ADD COLUMN IF NOT EXISTS muqeem_ref varchar(255),
  ADD COLUMN IF NOT EXISTS gosi_registration_date date,
  ADD COLUMN IF NOT EXISTS gosi_scheme varchar(10) DEFAULT 'old',
  ADD COLUMN IF NOT EXISTS qiwa_contract_id varchar(128),
  ADD COLUMN IF NOT EXISTS bank_iban varchar(34),
  ADD COLUMN IF NOT EXISTS bank_name varchar(255);

ALTER TABLE public.hr_employee_salary
  ADD COLUMN IF NOT EXISTS qiwa_contract_salary numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'SAR';

CREATE TABLE IF NOT EXISTS public.hr_gosi_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_profiles(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  contribution_base numeric(12,2) NOT NULL,
  employer_share numeric(12,2) NOT NULL,
  employee_share numeric(12,2) NOT NULL,
  scheme_type varchar(10) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hr_wps_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NULL,
  month varchar(7) NOT NULL,
  file_name varchar(255) NOT NULL,
  checksum varchar(128) NULL,
  exported_by uuid NULL,
  status varchar(20) DEFAULT 'generated',
  created_at timestamptz DEFAULT now()
);

COMMIT;

