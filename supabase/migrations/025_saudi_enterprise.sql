-- 025: Saudi Enterprise - Company Registry, Principal Employer & Compliance Models
-- This migration adds multi-tenant company onboarding, principal employer/establishment
-- management, Nitaqat/Saudization tracking, GOSI/Qiwa enhancements, and all Saudi
-- labor law compliance models for white-label deployment across India & Saudi markets.
-- Data residency: Each entity carries a data_region tag for future regional sharding.

-- ==========================================
-- SECTION 1: Enums
-- ==========================================

CREATE TYPE saudi_company_context AS ENUM ('india', 'saudi');
CREATE TYPE saudi_data_region AS ENUM ('default', 'bahrain', 'dubai', 'kuwait', 'qatar');
CREATE TYPE saudi_nitaqat_band AS ENUM ('platinum', 'high_green', 'mid_green', 'low_green', 'red');
CREATE TYPE saudi_gosi_form_type AS ENUM ('form_1', 'form_2', 'form_6', 'form_11', 'form_12');
CREATE TYPE saudi_contract_type AS ENUM ('fixed_term', 'unlimited', 'project_based');
CREATE TYPE saudi_work_injury_severity AS ENUM ('minor', 'moderate', 'severe', 'fatal');
CREATE TYPE saudi_disciplinary_type AS ENUM ('verbal_warning', 'written_warning', 'final_warning', 'salary_deduction', 'suspension', 'termination');

-- ==========================================
-- SECTION 2: Company Registry & Multi-Tenant Core
-- ==========================================

CREATE TABLE company_registry (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name      TEXT NOT NULL,
  trading_name      TEXT,
  cr_number         TEXT UNIQUE,
  cr_expiry_date    DATE,
  logo_url          TEXT,
  context_type      saudi_company_context NOT NULL DEFAULT 'india',
  sub_admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_email     TEXT,
  contact_phone     TEXT,
  address           TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'Saudi Arabia',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  data_region       saudi_data_region NOT NULL DEFAULT 'default',
  data_region_config JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX company_registry_context_idx ON company_registry(context_type);
CREATE INDEX company_registry_region_idx ON company_registry(data_region);
CREATE INDEX company_registry_active_idx ON company_registry(is_active);

ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company_registry(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS hr_profiles_company_idx ON hr_profiles(company_id);

-- ==========================================
-- SECTION 3: Principal Employer & Establishments
-- ==========================================

CREATE TABLE saudi_principal_employers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id        UUID NOT NULL REFERENCES company_registry(id) ON DELETE CASCADE,
  legal_name        TEXT NOT NULL,
  cr_number         TEXT NOT NULL,
  cr_issue_date     DATE,
  cr_expiry_date    DATE,
  license_number    TEXT,
  license_expiry    DATE,
  economic_activity TEXT,
  nitaqat_activity_code TEXT,
  vat_number        TEXT,
  unified_number    TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  data_region       saudi_data_region NOT NULL DEFAULT 'default',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX saudi_principal_employers_cr_idx ON saudi_principal_employers(cr_number);
CREATE INDEX saudi_principal_employers_company_idx ON saudi_principal_employers(company_id);

CREATE TABLE saudi_establishments (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id   UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  branch_number           TEXT,
  cr_number               TEXT,
  economic_activity       TEXT,
  nitaqat_activity_code   TEXT,
  city                    TEXT,
  address                 TEXT,
  phone                   TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  data_region             saudi_data_region NOT NULL DEFAULT 'default',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_establishments_principal_idx ON saudi_establishments(principal_employer_id);

ALTER TABLE saudi_employees ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES saudi_establishments(id) ON DELETE SET NULL;
ALTER TABLE saudi_employees ADD COLUMN IF NOT EXISTS principal_employer_id UUID REFERENCES saudi_principal_employers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS saudi_employees_establishment_idx ON saudi_employees(establishment_id);

-- ==========================================
-- SECTION 4: Nitaqat / Saudization Tracking
-- ==========================================

CREATE TABLE saudi_nitaqat_records (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  establishment_id      UUID REFERENCES saudi_establishments(id) ON DELETE SET NULL,
  period_month          DATE NOT NULL,
  band                  saudi_nitaqat_band NOT NULL,
  saudization_percentage NUMERIC(5,2) NOT NULL,
  total_employees       INTEGER NOT NULL,
  saudi_count           INTEGER NOT NULL,
  expat_count           INTEGER NOT NULL,
  target_percentage     NUMERIC(5,2) NOT NULL,
  points                INTEGER,
  certificate_url       TEXT,
  notes                 TEXT,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_nitaqat_principal_idx ON saudi_nitaqat_records(principal_employer_id);
CREATE INDEX saudi_nitaqat_month_idx ON saudi_nitaqat_records(period_month);
CREATE UNIQUE INDEX saudi_nitaqat_unique_idx ON saudi_nitaqat_records(principal_employer_id, COALESCE(establishment_id, '00000000-0000-0000-0000-000000000000'), period_month);

CREATE TABLE saudi_saudization_targets (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  establishment_id      UUID REFERENCES saudi_establishments(id) ON DELETE SET NULL,
  year                  INTEGER NOT NULL,
  profession_code       TEXT,
  target_percentage     NUMERIC(5,2) NOT NULL,
  minimum_salary        NUMERIC(12,2),
  is_active             BOOLEAN DEFAULT true,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_saudization_targets_principal_idx ON saudi_saudization_targets(principal_employer_id);

CREATE TABLE saudi_saudi_nationals_quota (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  monthly_salary        NUMERIC(12,2) NOT NULL,
  counts_as_full        BOOLEAN NOT NULL DEFAULT true,
  profession_code       TEXT,
  contract_authenticated BOOLEAN DEFAULT false,
  effective_from        DATE NOT NULL,
  effective_to          DATE,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_saudi_nationals_quota_principal_idx ON saudi_saudi_nationals_quota(principal_employer_id);
CREATE INDEX saudi_saudi_nationals_quota_emp_idx ON saudi_saudi_nationals_quota(employee_id);

-- ==========================================
-- SECTION 5: GOSI Enhanced
-- ==========================================

CREATE TABLE saudi_gosi_submissions (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  period_month          DATE NOT NULL,
  submission_date       DATE NOT NULL,
  total_employees       INTEGER NOT NULL,
  total_wages           NUMERIC(14,2) NOT NULL,
  total_employee_contribution NUMERIC(14,2) NOT NULL,
  total_employer_contribution  NUMERIC(14,2) NOT NULL,
  submission_reference  TEXT,
  status                TEXT NOT NULL DEFAULT 'submitted',
  acknowledgment_url    TEXT,
  penalty_amount        NUMERIC(12,2),
  notes                 TEXT,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_gosi_submissions_principal_idx ON saudi_gosi_submissions(principal_employer_id);
CREATE INDEX saudi_gosi_submissions_month_idx ON saudi_gosi_submissions(period_month);

CREATE TABLE saudi_gosi_forms (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  form_type             saudi_gosi_form_type NOT NULL,
  form_reference        TEXT,
  submission_date       DATE,
  effective_date        DATE NOT NULL,
  details               JSONB,
  status                TEXT NOT NULL DEFAULT 'pending',
  acknowledgment_url    TEXT,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_gosi_forms_emp_idx ON saudi_gosi_forms(employee_id);
CREATE INDEX saudi_gosi_forms_type_idx ON saudi_gosi_forms(form_type);

CREATE TABLE saudi_gosi_penalties (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  penalty_reference     TEXT NOT NULL,
  penalty_date          DATE NOT NULL,
  amount                NUMERIC(12,2) NOT NULL,
  reason                TEXT NOT NULL,
  period_month          DATE,
  is_appealed           BOOLEAN DEFAULT false,
  appeal_date           DATE,
  appeal_result         TEXT,
  paid_at               TIMESTAMPTZ,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_gosi_penalties_principal_idx ON saudi_gosi_penalties(principal_employer_id);

-- ==========================================
-- SECTION 6: Qiwa Enhanced
-- ==========================================

CREATE TABLE saudi_qiwa_service_requests (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  employee_id           UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  service_type          TEXT NOT NULL,
  qiwa_reference        TEXT,
  status                TEXT NOT NULL DEFAULT 'submitted',
  request_date          DATE NOT NULL,
  completion_date       DATE,
  details               JSONB,
  error_message         TEXT,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_qiwa_requests_principal_idx ON saudi_qiwa_service_requests(principal_employer_id);
CREATE INDEX saudi_qiwa_requests_status_idx ON saudi_qiwa_service_requests(status);

CREATE TABLE saudi_qiwa_contracts_saudi (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  qiwa_contract_id      TEXT,
  contract_type         saudi_contract_type NOT NULL DEFAULT 'fixed_term',
  start_date            DATE NOT NULL,
  end_date              DATE,
  probation_end_date    DATE,
  salary                NUMERIC(12,2) NOT NULL,
  allowances            JSONB,
  working_hours         TEXT,
  is_authenticated      BOOLEAN DEFAULT false,
  authentication_date   DATE,
  status                TEXT NOT NULL DEFAULT 'active',
  signed_at             TIMESTAMPTZ,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_qiwa_contracts_emp_idx ON saudi_qiwa_contracts_saudi(employee_id);
CREATE INDEX saudi_qiwa_contracts_status_idx ON saudi_qiwa_contracts_saudi(status);

-- ==========================================
-- SECTION 7: Employment Contracts
-- ==========================================

CREATE TABLE saudi_employment_contracts (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id           UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  contract_type         saudi_contract_type NOT NULL DEFAULT 'fixed_term',
  contract_number       TEXT,
  start_date            DATE NOT NULL,
  end_date              DATE,
  probation_period_days INTEGER DEFAULT 90,
  probation_end_date    DATE,
  working_hours_per_day NUMERIC(4,2) DEFAULT 8,
  working_days_per_week INTEGER DEFAULT 5,
  weekly_rest_day       TEXT DEFAULT 'Friday',
  notice_period_days    INTEGER DEFAULT 30,
  overtime_rate         NUMERIC(4,2) DEFAULT 1.50,
  overtime_holiday_rate NUMERIC(4,2) DEFAULT 2.00,
  non_compete_clause    BOOLEAN DEFAULT false,
  non_compete_duration  INTEGER,
  job_title             TEXT,
  job_description       TEXT,
  document_url          TEXT,
  is_qiwa_registered    BOOLEAN DEFAULT false,
  qiwa_contract_id      TEXT,
  status                TEXT NOT NULL DEFAULT 'active',
  renewal_count         INTEGER DEFAULT 0,
  renewed_at            TIMESTAMPTZ,
  terminated_at         TIMESTAMPTZ,
  termination_reason    TEXT,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_emp_contracts_emp_idx ON saudi_employment_contracts(employee_id);
CREATE INDEX saudi_emp_contracts_status_idx ON saudi_employment_contracts(status);

-- ==========================================
-- SECTION 8: Health Insurance (CCHI)
-- ==========================================

CREATE TABLE saudi_insurance_policies (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  policy_number         TEXT NOT NULL,
  provider_name         TEXT NOT NULL,
  policy_type           TEXT NOT NULL,
  coverage_level        TEXT NOT NULL,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  total_premium         NUMERIC(14,2),
  currency              TEXT DEFAULT 'SAR',
  document_url          TEXT,
  is_active             BOOLEAN DEFAULT true,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_insurance_policies_principal_idx ON saudi_insurance_policies(principal_employer_id);

CREATE TABLE saudi_insurance_enrollments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id         UUID NOT NULL REFERENCES saudi_insurance_policies(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  card_number       TEXT,
  enrollment_date   DATE NOT NULL,
  effective_date    DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  dependent_count   INTEGER DEFAULT 0,
  monthly_premium   NUMERIC(12,2),
  status            TEXT NOT NULL DEFAULT 'active',
  data_region       saudi_data_region NOT NULL DEFAULT 'default',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_insurance_enroll_policy_idx ON saudi_insurance_enrollments(policy_id);
CREATE INDEX saudi_insurance_enroll_emp_idx ON saudi_insurance_enrollments(employee_id);
CREATE INDEX saudi_insurance_enroll_expiry_idx ON saudi_insurance_enrollments(expiry_date);

-- ==========================================
-- SECTION 9: Work Injuries & OHS
-- ==========================================

CREATE TABLE saudi_work_injuries (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id           UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  incident_date         TIMESTAMPTZ NOT NULL,
  incident_type         TEXT NOT NULL,
  severity              saudi_work_injury_severity NOT NULL,
  description           TEXT NOT NULL,
  location              TEXT,
  body_part             TEXT,
  medical_treatment     TEXT,
  hospital_name         TEXT,
  days_off_work         INTEGER,
  gosi_claim_reference  TEXT,
  gosi_claim_amount     NUMERIC(12,2),
  gosi_claim_status     TEXT,
  is_reported_to_mol    BOOLEAN DEFAULT false,
  report_date           DATE,
  closed_at             DATE,
  data_region           saudi_data_region NOT NULL DEFAULT 'default',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_work_injuries_emp_idx ON saudi_work_injuries(employee_id);

-- ==========================================
-- SECTION 10: Disciplinary Actions & Grievances
-- ==========================================

CREATE TABLE saudi_disciplinary_actions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  action_type     saudi_disciplinary_type NOT NULL,
  reason          TEXT NOT NULL,
  description     TEXT,
  issued_by_id    UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  issued_date     DATE NOT NULL,
  amount          NUMERIC(12,2),
  suspension_days INTEGER,
  appeal_date     DATE,
  appeal_result   TEXT,
  is_expunged     BOOLEAN DEFAULT false,
  data_region     saudi_data_region NOT NULL DEFAULT 'default',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_disciplinary_emp_idx ON saudi_disciplinary_actions(employee_id);

CREATE TABLE saudi_grievances (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  grievance_type  TEXT NOT NULL,
  subject         TEXT NOT NULL,
  description     TEXT NOT NULL,
  filed_date      DATE NOT NULL,
  against_id      UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'open',
  resolution      TEXT,
  resolved_at     TIMESTAMPTZ,
  resolved_by_id  UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  data_region     saudi_data_region NOT NULL DEFAULT 'default',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_grievances_emp_idx ON saudi_grievances(employee_id);
CREATE INDEX saudi_grievances_status_idx ON saudi_grievances(status);

-- ==========================================
-- SECTION 11: Saudi Working Calendar
-- ==========================================

CREATE TABLE saudi_public_holidays (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT,
  date_gregorian  DATE NOT NULL,
  date_hijri      TEXT,
  is_annual       BOOLEAN DEFAULT true,
  hijri_year      INTEGER,
  is_active       BOOLEAN DEFAULT true,
  data_region     saudi_data_region NOT NULL DEFAULT 'default',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_public_holidays_date_idx ON saudi_public_holidays(date_gregorian);

CREATE TABLE saudi_working_hours_config (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_ramadan      BOOLEAN DEFAULT false,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  friday_start    TIME,
  friday_end      TIME,
  daily_hours     NUMERIC(4,2) NOT NULL,
  weekly_hours    NUMERIC(4,2) NOT NULL,
  effective_from  DATE NOT NULL,
  effective_to    DATE,
  is_active       BOOLEAN DEFAULT true,
  data_region     saudi_data_region NOT NULL DEFAULT 'default',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_working_hours_principal_idx ON saudi_working_hours_config(principal_employer_id);

-- ==========================================
-- SECTION 12: HRDF / Training Programs
-- ==========================================

CREATE TABLE saudi_hrdf_programs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  principal_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  program_type    TEXT NOT NULL,
  program_name    TEXT NOT NULL,
  provider        TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE,
  cost            NUMERIC(12,2),
  subsidy_amount  NUMERIC(12,2),
  subsidy_percent NUMERIC(5,2),
  status          TEXT NOT NULL DEFAULT 'applied',
  hrdf_reference  TEXT,
  completion_date DATE,
  data_region     saudi_data_region NOT NULL DEFAULT 'default',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_hrdf_programs_principal_idx ON saudi_hrdf_programs(principal_employer_id);
CREATE INDEX saudi_hrdf_programs_emp_idx ON saudi_hrdf_programs(employee_id);

-- ==========================================
-- SECTION 13: Sponsorship Transfer & Visa
-- ==========================================

CREATE TABLE saudi_sponsorship_transfers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  from_employer_id UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  to_employer_id   UUID NOT NULL REFERENCES saudi_principal_employers(id) ON DELETE CASCADE,
  transfer_date   DATE NOT NULL,
  transfer_type   TEXT NOT NULL,
  qiwa_reference  TEXT,
  absher_reference TEXT,
  old_iqama_expiry DATE,
  new_iqama_expiry DATE,
  status          TEXT NOT NULL DEFAULT 'initiated',
  notes           TEXT,
  data_region     saudi_data_region NOT NULL DEFAULT 'default',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saudi_sponsorship_transfers_emp_idx ON saudi_sponsorship_transfers(employee_id);

-- ==========================================
-- SECTION 14: Data Residency Routing
-- ==========================================

CREATE TABLE saudi_data_region_routing (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES company_registry(id) ON DELETE CASCADE,
  data_region     saudi_data_region NOT NULL,
  database_url_enc TEXT,
  is_primary      BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX saudi_data_region_routing_unique_idx ON saudi_data_region_routing(company_id, data_region);

-- ==========================================
-- SECTION 15: Enable Row-Level Security
-- ==========================================

ALTER TABLE company_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_principal_employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_nitaqat_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_saudization_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_saudi_nationals_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_gosi_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_gosi_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_gosi_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_qiwa_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_qiwa_contracts_saudi ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_employment_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_insurance_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_work_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_disciplinary_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_working_hours_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_hrdf_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_sponsorship_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_data_region_routing ENABLE ROW LEVEL SECURITY;
