-- Payroll enhancements: TDS, employer contributions, payment date, employee payroll preferences

-- 1. Extend hr_payroll
ALTER TABLE hr_payroll
  ADD COLUMN IF NOT EXISTS tds_amount   numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_regime   text CHECK (tds_regime IN ('old', 'new')),
  ADD COLUMN IF NOT EXISTS employer_pf  numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_esi numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_date date;

-- 2. Add employee-level payroll preferences to hr_profiles
ALTER TABLE hr_profiles
  ADD COLUMN IF NOT EXISTS uan_number   text,
  ADD COLUMN IF NOT EXISTS tds_regime   text NOT NULL DEFAULT 'new' CHECK (tds_regime IN ('old', 'new')),
  ADD COLUMN IF NOT EXISTS pf_opted_out boolean NOT NULL DEFAULT false;

-- 3. Seed company config (idempotent)
INSERT INTO hr_config (key, value) VALUES
  ('company_full_name', 'Ultimate Digital Solutions'),
  ('company_address',   'EC73, 1442 Rajdanga Main Road, Kolkata, West Bengal 700107'),
  ('company_pf_no',     ''),
  ('company_esic_code', '')
ON CONFLICT (key) DO NOTHING;
