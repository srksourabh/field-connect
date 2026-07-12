-- Migration: 006_add_saudi_fields.sql
-- Add Saudi-specific fields and tables: Qiwa contracts, GOSI history, iqama/work-permit tracking, bank IBAN

-- hr_profiles: add Saudi identifiers and contact fields
ALTER TABLE hr_profiles
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS is_saudi BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS iqama_number TEXT,
  ADD COLUMN IF NOT EXISTS iqama_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS work_permit_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS passport_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS bank_iban TEXT,
  ADD COLUMN IF NOT EXISTS gosi_registration_date DATE,
  ADD COLUMN IF NOT EXISTS gosi_system TEXT; -- 'old' | 'new' | 'expat'

-- hr_qiwa_contracts: store Qiwa contract metadata (one-to-one with employee or many revisions)
CREATE TABLE IF NOT EXISTS hr_qiwa_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr_profiles(id) ON DELETE CASCADE,
  qiwa_contract_id TEXT,
  contract_status TEXT,
  contract_salary NUMERIC,
  allowances jsonb,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- hr_gosi_history: record each monthly report / change
CREATE TABLE IF NOT EXISTS hr_gosi_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES hr_profiles(id) ON DELETE CASCADE,
  report_month TEXT NOT NULL, -- YYYY-MM
  employer_contribution NUMERIC,
  employee_contribution NUMERIC,
  contribution_base NUMERIC,
  gosi_system TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add informational fields to hr_payroll if not present
ALTER TABLE hr_payroll
  ADD COLUMN IF NOT EXISTS gosi_employer NUMERIC,
  ADD COLUMN IF NOT EXISTS gosi_employee NUMERIC,
  ADD COLUMN IF NOT EXISTS gosi_total NUMERIC,
  ADD COLUMN IF NOT EXISTS esb_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS qiwa_contract_id uuid REFERENCES hr_qiwa_contracts(id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hr_profiles_iqama_expires_at ON hr_profiles(iqama_expires_at);
CREATE INDEX IF NOT EXISTS idx_hr_profiles_work_permit_expires_at ON hr_profiles(work_permit_expires_at);
CREATE INDEX IF NOT EXISTS idx_hr_gosi_history_employee_month ON hr_gosi_history(employee_id, report_month);

-- Note: after running this migration, run a data-mapping script to populate `is_saudi` and `gosi_system`.
