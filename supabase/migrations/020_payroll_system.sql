-- Payroll System: salary components, employee salary assignments, payroll records
-- Migration 020

-- 1. Salary Components — master list of earning/deduction types
CREATE TABLE hr_salary_components (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('earning', 'deduction')),
  is_statutory boolean NOT NULL DEFAULT false,
  calc_rule   text,          -- e.g. "12% of basic", "fixed", "slab"
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hr_salary_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read salary components"
  ON hr_salary_components FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role can manage salary components"
  ON hr_salary_components FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 2. Employee Salary — per-employee, per-component amounts
CREATE TABLE hr_employee_salary (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid NOT NULL REFERENCES hr_profiles(id),
  component_id    uuid NOT NULL REFERENCES hr_salary_components(id),
  amount          numeric(12,2) NOT NULL,
  effective_from  date NOT NULL,
  effective_to    date,          -- null = currently active
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, component_id, effective_from)
);

ALTER TABLE hr_employee_salary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read own salary"
  ON hr_employee_salary FOR SELECT
  TO authenticated USING (auth.uid() = employee_id);

CREATE POLICY "Service role can manage employee salary"
  ON hr_employee_salary FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- 3. Payroll — one row per employee per month
CREATE TABLE hr_payroll (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           uuid NOT NULL REFERENCES hr_profiles(id),
  month                 text NOT NULL,  -- format: "2026-04"
  gross_earnings        numeric(12,2) NOT NULL,
  total_deductions      numeric(12,2) NOT NULL,
  net_payable           numeric(12,2) NOT NULL,
  working_days          integer NOT NULL,
  days_present          integer NOT NULL,
  days_absent           integer NOT NULL,
  lwp_days              integer NOT NULL DEFAULT 0,
  leave_days            integer NOT NULL DEFAULT 0,
  earnings_breakdown    jsonb NOT NULL DEFAULT '{}',
  deductions_breakdown  jsonb NOT NULL DEFAULT '{}',
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid')),
  processed_by          uuid REFERENCES hr_profiles(id),
  processed_at          timestamptz,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month)
);

ALTER TABLE hr_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can read own payroll"
  ON hr_payroll FOR SELECT
  TO authenticated USING (auth.uid() = employee_id);

CREATE POLICY "Service role can manage payroll"
  ON hr_payroll FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Seed default salary components
INSERT INTO hr_salary_components (name, type, is_statutory, calc_rule, description) VALUES
  ('Basic Salary',          'earning',    false, 'fixed',          'Base salary component'),
  ('HRA',                   'earning',    false, 'fixed',          'House Rent Allowance'),
  ('DA',                    'earning',    false, 'fixed',          'Dearness Allowance'),
  ('Conveyance Allowance',  'earning',    false, 'fixed',          'Transport/travel allowance'),
  ('Special Allowance',     'earning',    false, 'fixed',          'Balancing/special allowance'),
  ('Medical Allowance',     'earning',    false, 'fixed',          'Medical reimbursement allowance'),
  ('PF',                    'deduction',  true,  '12% of basic',   'Provident Fund — 12% of Basic (employee share)'),
  ('ESI',                   'deduction',  true,  '0.75% of gross', 'Employee State Insurance — 0.75% if gross ≤ ₹21,000'),
  ('Professional Tax',      'deduction',  true,  'slab',           'State-wise professional tax');
