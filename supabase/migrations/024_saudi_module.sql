-- 024: Saudi HR Module - Complete Tables
-- Creates the full Saudi compliance HR module with saudi_ prefixed tables.
-- This module is self-contained alongside existing India (hr_*) tables.

-- ==========================================
-- SECTION 1: Enums
-- ==========================================

CREATE TYPE saudi_employment_status AS ENUM ('active', 'terminated', 'suspended', 'on_leave');
CREATE TYPE saudi_gosi_system AS ENUM ('old', 'new');
CREATE TYPE saudi_nationality AS ENUM ('saudi', 'expat');

CREATE TYPE saudi_job_status AS ENUM ('draft', 'open', 'paused', 'closed', 'filled', 'cancelled');
CREATE TYPE saudi_job_type AS ENUM ('full_time', 'part_time', 'contract', 'internship', 'temporary');
CREATE TYPE saudi_candidate_status AS ENUM ('new', 'screening', 'interviewing', 'offer', 'hired', 'rejected', 'withdrawn');
CREATE TYPE saudi_candidate_source AS ENUM ('job_board', 'referral', 'linkedin', 'career_site', 'agency', 'direct', 'other');
CREATE TYPE saudi_application_status AS ENUM ('applied', 'screening', 'phone_screen', 'technical_interview', 'final_interview', 'offer_extended', 'offer_accepted', 'offer_declined', 'hired', 'rejected', 'withdrawn');
CREATE TYPE saudi_interview_type AS ENUM ('phone_screen', 'video', 'in_person', 'technical', 'panel', 'cultural_fit', 'final');
CREATE TYPE saudi_interview_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE saudi_offer_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired', 'withdrawn');
CREATE TYPE saudi_onboarding_status AS ENUM ('not_started', 'in_progress', 'completed', 'overdue');
CREATE TYPE saudi_referral_status AS ENUM ('submitted', 'screening', 'interviewed', 'hired', 'rejected', 'reward_paid');
CREATE TYPE saudi_background_check_status AS ENUM ('pending', 'in_progress', 'clear', 'flagged', 'failed');
CREATE TYPE saudi_reference_check_status AS ENUM ('pending', 'contacted', 'completed', 'positive', 'negative');

CREATE TYPE saudi_goal_type AS ENUM ('okr', 'kpi', 'project', 'development', 'behavioral');
CREATE TYPE saudi_goal_status AS ENUM ('draft', 'active', 'on_track', 'at_risk', 'off_track', 'completed', 'cancelled');
CREATE TYPE saudi_review_cycle_status AS ENUM ('planned', 'open', 'self_review', 'manager_review', 'calibration', 'completed', 'archived');
CREATE TYPE saudi_review_status AS ENUM ('pending', 'in_progress', 'submitted', 'acknowledged', 'completed');
CREATE TYPE saudi_review_type AS ENUM ('annual', 'mid_year', 'probation', 'project', '360');
CREATE TYPE saudi_skill_category AS ENUM ('technical', 'soft', 'leadership', 'domain', 'language', 'certification');
CREATE TYPE saudi_proficiency_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE saudi_learning_type AS ENUM ('course', 'workshop', 'certification', 'mentoring', 'coaching', 'on_the_job', 'conference', 'webinar', 'self_study');
CREATE TYPE saudi_learning_status AS ENUM ('planned', 'enrolled', 'in_progress', 'completed', 'cancelled', 'expired');
CREATE TYPE saudi_career_path_status AS ENUM ('active', 'paused', 'completed', 'archived');
CREATE TYPE saudi_succession_status AS ENUM ('identified', 'developing', 'ready', 'promoted', 'departed');
CREATE TYPE saudi_engagement_survey_status AS ENUM ('draft', 'scheduled', 'open', 'closed', 'analyzed', 'action_planning', 'completed');
CREATE TYPE saudi_stay_interview_status AS ENUM ('scheduled', 'completed', 'action_required', 'closed');
CREATE TYPE saudi_recognition_type AS ENUM ('peer', 'manager', 'company', 'anniversary', 'achievement', 'innovation', 'values', 'wellness');
CREATE TYPE saudi_reward_type AS ENUM ('monetary', 'non_monetary', 'time_off', 'gift', 'experience', 'development', 'public_recognition');

CREATE TYPE saudi_ai_suggestion_type AS ENUM ('salary_benchmark', 'skill_recommendation', 'churn_prediction', 'compliance_risk', 'candidate_match', 'interview_feedback', 'jd_enhancement', 'survey_sentiment', 'career_path', 'learning_recommendation', 'compensation_insight', 'retention_risk', 'general');
CREATE TYPE saudi_ai_suggestion_status AS ENUM ('pending', 'applied', 'dismissed', 'in_progress');
CREATE TYPE saudi_ai_confidence_level AS ENUM ('low', 'medium', 'high', 'very_high');

-- ==========================================
-- SECTION 2: Core Employee Tables
-- ==========================================

CREATE TABLE saudi_departments (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                 TEXT NOT NULL,
  parent_department_id UUID REFERENCES saudi_departments(id) ON DELETE SET NULL,
  head_employee_id     UUID,
  created_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE saudi_employees (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id        UUID REFERENCES saudi_departments(id) ON DELETE SET NULL,
  manager_employee_id  UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  iqama_number_enc     TEXT,
  passport_number_enc  TEXT,
  bank_iban_enc        TEXT,
  nationality          saudi_nationality NOT NULL,
  full_name            TEXT NOT NULL,
  employment_status    saudi_employment_status NOT NULL DEFAULT 'active',
  hire_date            DATE NOT NULL,
  termination_date     DATE,
  gosi_registration_date DATE,
  gosi_system          saudi_gosi_system,
  salary_basic         NUMERIC(12,2) NOT NULL,
  salary_housing       NUMERIC(12,2) NOT NULL DEFAULT '0',
  salary_transport     NUMERIC(12,2) NOT NULL DEFAULT '0',
  rehire_eligible      TEXT,
  rehire_reason        TEXT,
  created_at           TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_employees_dept_idx ON saudi_employees(department_id);
CREATE INDEX saudi_employees_manager_idx ON saudi_employees(manager_employee_id);
CREATE INDEX saudi_employees_status_idx ON saudi_employees(employment_status);

CREATE TABLE saudi_employment_history (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id    UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  event_type     TEXT NOT NULL CHECK (event_type IN ('promotion', 'transfer', 'salary_change', 'termination', 'rehire')),
  effective_date DATE NOT NULL,
  details        JSONB,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_employment_history_emp_idx ON saudi_employment_history(employee_id);

CREATE TABLE saudi_documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('iqama', 'passport', 'work_permit', 'contract', 'certificate', 'other')),
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  expiry_date DATE,
  version     TEXT NOT NULL DEFAULT '1',
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_documents_emp_idx ON saudi_documents(employee_id);
CREATE INDEX saudi_documents_type_idx ON saudi_documents(type);
CREATE INDEX saudi_documents_expiry_idx ON saudi_documents(expiry_date);

-- ==========================================
-- SECTION 3: Leave Management
-- ==========================================

CREATE TABLE saudi_leave_types (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  days_allowed INTEGER NOT NULL,
  rules        JSONB,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE saudi_leave_requests (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id        UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  leave_type_id      UUID NOT NULL REFERENCES saudi_leave_types(id) ON DELETE RESTRICT,
  start_date         DATE NOT NULL,
  end_date           DATE NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by_user_id UUID,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_leave_req_emp_idx ON saudi_leave_requests(employee_id);
CREATE INDEX saudi_leave_req_status_idx ON saudi_leave_requests(status);
CREATE INDEX saudi_leave_req_dates_idx ON saudi_leave_requests(start_date, end_date);

CREATE TABLE saudi_leave_balances (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES saudi_leave_types(id) ON DELETE RESTRICT,
  balance      NUMERIC(5,1) NOT NULL,
  year         INTEGER NOT NULL
);

CREATE INDEX saudi_leave_bal_emp_idx ON saudi_leave_balances(employee_id);
CREATE UNIQUE INDEX saudi_leave_bal_unique_idx ON saudi_leave_balances(employee_id, leave_type_id, year);

-- ==========================================
-- SECTION 4: Payroll, Compliance, Settlements
-- ==========================================

CREATE TABLE saudi_payroll_runs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_month DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pre_check', 'ready', 'completed', 'cancelled')),
  total_amount NUMERIC(14,2),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_payroll_runs_period_idx ON saudi_payroll_runs(period_month);
CREATE INDEX saudi_payroll_runs_status_idx ON saudi_payroll_runs(status);

CREATE TABLE saudi_payslips (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES saudi_payroll_runs(id) ON DELETE CASCADE,
  employee_id    UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  basic          NUMERIC(12,2) NOT NULL,
  housing        NUMERIC(12,2) NOT NULL,
  transport      NUMERIC(12,2) NOT NULL,
  overtime       NUMERIC(12,2) NOT NULL DEFAULT '0',
  gosi_employee  NUMERIC(12,2) NOT NULL DEFAULT '0',
  gosi_employer  NUMERIC(12,2) NOT NULL DEFAULT '0',
  deductions     NUMERIC(12,2) NOT NULL DEFAULT '0',
  net_pay        NUMERIC(12,2) NOT NULL,
  pdf_url        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_payslips_run_idx ON saudi_payslips(payroll_run_id);
CREATE INDEX saudi_payslips_emp_idx ON saudi_payslips(employee_id);

CREATE TABLE saudi_wage_files (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES saudi_payroll_runs(id) ON DELETE CASCADE,
  format         TEXT NOT NULL DEFAULT 'mudad',
  file_url       TEXT,
  submitted_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_wage_files_run_idx ON saudi_wage_files(payroll_run_id);

CREATE TABLE saudi_compliance_checks (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_run_id UUID NOT NULL REFERENCES saudi_payroll_runs(id) ON DELETE CASCADE,
  check_type     TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('passed', 'flagged', 'blocked')),
  flagged_issues JSONB,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_compliance_run_idx ON saudi_compliance_checks(payroll_run_id);

CREATE TABLE saudi_final_settlements (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id          UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  esb_amount           NUMERIC(12,2),
  unpaid_salary        NUMERIC(12,2),
  accrued_leave_payout NUMERIC(12,2),
  exit_reason          TEXT,
  created_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_final_settlements_emp_idx ON saudi_final_settlements(employee_id);

-- ==========================================
-- SECTION 5: Notifications & Audit
-- ==========================================

CREATE TABLE saudi_notifications (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL,
  channel    TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  type       TEXT,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  severity   TEXT,
  metadata   JSONB,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_notifications_user_idx ON saudi_notifications(user_id);
CREATE INDEX saudi_notifications_read_idx ON saudi_notifications(read);

CREATE TABLE saudi_audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_audit_logs_entity_idx ON saudi_audit_logs(entity_type, entity_id);
CREATE INDEX saudi_audit_logs_user_idx ON saudi_audit_logs(user_id);
CREATE INDEX saudi_audit_logs_created_idx ON saudi_audit_logs(created_at);

-- ==========================================
-- SECTION 6: Recruitment
-- ==========================================

CREATE TABLE saudi_job_requisitions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id     UUID REFERENCES saudi_departments(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  requirements      TEXT,
  responsibilities  TEXT,
  status            saudi_job_status NOT NULL DEFAULT 'draft',
  type              saudi_job_type NOT NULL DEFAULT 'full_time',
  location          TEXT,
  is_remote         BOOLEAN DEFAULT false,
  min_salary        NUMERIC(12,2),
  max_salary        NUMERIC(12,2),
  currency          TEXT DEFAULT 'SAR',
  openings          INTEGER DEFAULT 1,
  hiring_manager_id UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  recruiter_id      UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  posted_at         TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_job_req_status_idx ON saudi_job_requisitions(status);
CREATE INDEX saudi_job_req_dept_idx ON saudi_job_requisitions(department_id);
CREATE INDEX saudi_job_req_hiring_mgr_idx ON saudi_job_requisitions(hiring_manager_id);

CREATE TABLE saudi_candidates (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  email              TEXT NOT NULL,
  phone              TEXT,
  linkedin_url       TEXT,
  portfolio_url      TEXT,
  resume_url         TEXT,
  resume_text        TEXT,
  source             TEXT,
  source_details     JSONB,
  nationality        TEXT DEFAULT 'saudi',
  current_location   TEXT,
  notice_period_days INTEGER,
  expected_salary    NUMERIC(12,2),
  current_salary     NUMERIC(12,2),
  availability_date  DATE,
  tags               TEXT[],
  notes              TEXT,
  gdpr_consent       BOOLEAN DEFAULT false,
  gdpr_consent_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX saudi_candidates_email_idx ON saudi_candidates(email);
CREATE INDEX saudi_candidates_source_idx ON saudi_candidates(source);

CREATE TABLE saudi_applications (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_requisition_id     UUID NOT NULL REFERENCES saudi_job_requisitions(id) ON DELETE CASCADE,
  candidate_id           UUID NOT NULL REFERENCES saudi_candidates(id) ON DELETE CASCADE,
  status                 saudi_application_status NOT NULL DEFAULT 'applied',
  applied_at             TIMESTAMPTZ DEFAULT now() NOT NULL,
  screened_at            TIMESTAMPTZ,
  screened_by_id         UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  screening_notes        TEXT,
  current_stage          TEXT DEFAULT 'applied',
  stage_entered_at       TIMESTAMPTZ DEFAULT now(),
  disqualification_reason TEXT,
  referrer_employee_id   UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at             TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_applications_job_idx ON saudi_applications(job_requisition_id);
CREATE INDEX saudi_applications_candidate_idx ON saudi_applications(candidate_id);
CREATE INDEX saudi_applications_status_idx ON saudi_applications(status);
CREATE UNIQUE INDEX saudi_applications_unique_idx ON saudi_applications(job_requisition_id, candidate_id);

CREATE TABLE saudi_interviews (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id      UUID NOT NULL REFERENCES saudi_applications(id) ON DELETE CASCADE,
  type                saudi_interview_type NOT NULL,
  status              saudi_interview_status NOT NULL DEFAULT 'scheduled',
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration_minutes    INTEGER DEFAULT 60,
  location            TEXT,
  meeting_url         TEXT,
  interviewer_ids     UUID[] NOT NULL,
  feedback            JSONB,
  score               INTEGER,
  recommendation      TEXT,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_interviews_app_idx ON saudi_interviews(application_id);
CREATE INDEX saudi_interviews_scheduled_idx ON saudi_interviews(scheduled_at);
CREATE INDEX saudi_interviews_status_idx ON saudi_interviews(status);

CREATE TABLE saudi_offers (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id      UUID NOT NULL REFERENCES saudi_applications(id) ON DELETE CASCADE,
  candidate_id        UUID NOT NULL REFERENCES saudi_candidates(id) ON DELETE CASCADE,
  job_requisition_id  UUID NOT NULL REFERENCES saudi_job_requisitions(id) ON DELETE CASCADE,
  status              saudi_offer_status NOT NULL DEFAULT 'draft',
  base_salary         NUMERIC(12,2) NOT NULL,
  housing_allowance   NUMERIC(12,2) DEFAULT '0',
  transport_allowance NUMERIC(12,2) DEFAULT '0',
  other_allowances    NUMERIC(12,2) DEFAULT '0',
  bonus_structure     TEXT,
  benefits            JSONB,
  start_date          DATE,
  probation_months    INTEGER DEFAULT 3,
  offer_letter_url    TEXT,
  sent_at             TIMESTAMPTZ,
  accepted_at         TIMESTAMPTZ,
  declined_at         TIMESTAMPTZ,
  decline_reason      TEXT,
  expires_at          TIMESTAMPTZ,
  created_by_id       UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  approved_by_id      UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_offers_app_idx ON saudi_offers(application_id);
CREATE INDEX saudi_offers_candidate_idx ON saudi_offers(candidate_id);
CREATE INDEX saudi_offers_status_idx ON saudi_offers(status);

CREATE TABLE saudi_onboarding_plans (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  day_number      INTEGER NOT NULL,
  status          saudi_onboarding_status NOT NULL DEFAULT 'not_started',
  assigned_to_id  UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  completed_by_id UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_onboarding_emp_idx ON saudi_onboarding_plans(employee_id);
CREATE INDEX saudi_onboarding_day_idx ON saudi_onboarding_plans(day_number);
CREATE INDEX saudi_onboarding_status_idx ON saudi_onboarding_plans(status);

CREATE TABLE saudi_referrals (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_employee_id  UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  candidate_id          UUID NOT NULL REFERENCES saudi_candidates(id) ON DELETE CASCADE,
  job_requisition_id    UUID REFERENCES saudi_job_requisitions(id) ON DELETE SET NULL,
  status                saudi_referral_status NOT NULL DEFAULT 'submitted',
  reward_amount         NUMERIC(12,2),
  reward_paid_at        TIMESTAMPTZ,
  reward_paid_by_id     UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  notes                 TEXT,
  submitted_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_referrals_referrer_idx ON saudi_referrals(referrer_employee_id);
CREATE INDEX saudi_referrals_candidate_idx ON saudi_referrals(candidate_id);
CREATE INDEX saudi_referrals_status_idx ON saudi_referrals(status);

CREATE TABLE saudi_background_checks (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id          UUID NOT NULL REFERENCES saudi_candidates(id) ON DELETE CASCADE,
  application_id        UUID REFERENCES saudi_applications(id) ON DELETE SET NULL,
  status                saudi_background_check_status NOT NULL DEFAULT 'pending',
  provider              TEXT,
  provider_reference_id TEXT,
  checks                JSONB,
  result                JSONB,
  initiated_at          TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  cost                  NUMERIC(10,2),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_bg_checks_candidate_idx ON saudi_background_checks(candidate_id);
CREATE INDEX saudi_bg_checks_status_idx ON saudi_background_checks(status);

CREATE TABLE saudi_reference_checks (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id      UUID NOT NULL REFERENCES saudi_candidates(id) ON DELETE CASCADE,
  application_id    UUID REFERENCES saudi_applications(id) ON DELETE SET NULL,
  referee_name      TEXT NOT NULL,
  referee_title     TEXT,
  referee_company   TEXT,
  referee_email     TEXT,
  referee_phone     TEXT,
  relationship      TEXT,
  status            saudi_reference_check_status NOT NULL DEFAULT 'pending',
  feedback          JSONB,
  conducted_at      TIMESTAMPTZ,
  conducted_by_id   UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_ref_checks_candidate_idx ON saudi_reference_checks(candidate_id);
CREATE INDEX saudi_ref_checks_status_idx ON saudi_reference_checks(status);

-- ==========================================
-- SECTION 7: Retention & Talent Management
-- ==========================================

CREATE TABLE saudi_goals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  manager_id      UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  type            saudi_goal_type NOT NULL DEFAULT 'okr',
  status          saudi_goal_status NOT NULL DEFAULT 'draft',
  weight          INTEGER DEFAULT 100,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  progress        INTEGER DEFAULT 0,
  metrics         JSONB,
  parent_goal_id  UUID,
  review_cycle_id UUID,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_goals_emp_idx ON saudi_goals(employee_id);
CREATE INDEX saudi_goals_mgr_idx ON saudi_goals(manager_id);
CREATE INDEX saudi_goals_status_idx ON saudi_goals(status);

CREATE TABLE saudi_goal_key_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id       UUID NOT NULL REFERENCES saudi_goals(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  target_value  NUMERIC(12,2),
  current_value NUMERIC(12,2),
  unit          TEXT,
  weight        INTEGER DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_goal_kr_goal_idx ON saudi_goal_key_results(goal_id);

CREATE TABLE saudi_review_cycles (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                      TEXT NOT NULL,
  description               TEXT,
  type                      saudi_review_type NOT NULL DEFAULT 'annual',
  status                    saudi_review_cycle_status NOT NULL DEFAULT 'planned',
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  self_review_start_date    DATE,
  self_review_end_date      DATE,
  manager_review_start_date DATE,
  manager_review_end_date   DATE,
  calibration_start_date    DATE,
  calibration_end_date      DATE,
  is_archived               BOOLEAN DEFAULT false,
  created_at                TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at                TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_review_cycles_status_idx ON saudi_review_cycles(status);
CREATE INDEX saudi_review_cycles_dates_idx ON saudi_review_cycles(start_date, end_date);

CREATE TABLE saudi_reviews (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_cycle_id  UUID NOT NULL REFERENCES saudi_review_cycles(id) ON DELETE CASCADE,
  employee_id      UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  manager_id       UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  status           saudi_review_status NOT NULL DEFAULT 'pending',
  type             saudi_review_type NOT NULL DEFAULT 'annual',
  self_review      JSONB,
  manager_review   JSONB,
  final_rating     INTEGER,
  calibration_notes TEXT,
  acknowledged_at  TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_reviews_cycle_idx ON saudi_reviews(review_cycle_id);
CREATE INDEX saudi_reviews_emp_idx ON saudi_reviews(employee_id);
CREATE INDEX saudi_reviews_mgr_idx ON saudi_reviews(manager_id);
CREATE INDEX saudi_reviews_status_idx ON saudi_reviews(status);
CREATE UNIQUE INDEX saudi_reviews_unique_idx ON saudi_reviews(review_cycle_id, employee_id);

CREATE TABLE saudi_review_sections (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_cycle_id UUID NOT NULL REFERENCES saudi_review_cycles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  order           INTEGER DEFAULT 0,
  weight          INTEGER DEFAULT 100,
  is_required     BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_review_sections_cycle_idx ON saudi_review_sections(review_cycle_id);

CREATE TABLE saudi_review_responses (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id    UUID NOT NULL REFERENCES saudi_reviews(id) ON DELETE CASCADE,
  section_id   UUID NOT NULL REFERENCES saudi_review_sections(id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  responses    JSONB,
  rating       INTEGER,
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_review_resp_review_idx ON saudi_review_responses(review_id);
CREATE INDEX saudi_review_resp_section_idx ON saudi_review_responses(section_id);
CREATE INDEX saudi_review_resp_reviewer_idx ON saudi_review_responses(reviewer_id);
CREATE UNIQUE INDEX saudi_review_resp_unique_idx ON saudi_review_responses(review_id, section_id, reviewer_id);

CREATE TABLE saudi_skills (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    saudi_skill_category NOT NULL DEFAULT 'technical',
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX saudi_skills_name_idx ON saudi_skills(name);
CREATE INDEX saudi_skills_category_idx ON saudi_skills(category);

CREATE TABLE saudi_employee_skills (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id       UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  skill_id          UUID NOT NULL REFERENCES saudi_skills(id) ON DELETE CASCADE,
  proficiency_level saudi_proficiency_level NOT NULL DEFAULT 'beginner',
  years_experience  INTEGER,
  last_used         DATE,
  is_primary        BOOLEAN DEFAULT false,
  verified_by_id    UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_emp_skills_emp_idx ON saudi_employee_skills(employee_id);
CREATE INDEX saudi_emp_skills_skill_idx ON saudi_employee_skills(skill_id);
CREATE UNIQUE INDEX saudi_emp_skills_unique_idx ON saudi_employee_skills(employee_id, skill_id);

CREATE TABLE saudi_skill_gaps (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  skill_id        UUID NOT NULL REFERENCES saudi_skills(id) ON DELETE CASCADE,
  required_level  saudi_proficiency_level NOT NULL,
  current_level   saudi_proficiency_level NOT NULL,
  gap_reason      TEXT,
  identified_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  target_date     DATE,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_skill_gaps_emp_idx ON saudi_skill_gaps(employee_id);
CREATE INDEX saudi_skill_gaps_skill_idx ON saudi_skill_gaps(skill_id);

CREATE TABLE saudi_learning_programs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  type             saudi_learning_type NOT NULL DEFAULT 'course',
  provider         TEXT,
  url              TEXT,
  duration_hours   INTEGER,
  cost             NUMERIC(12,2),
  currency         TEXT DEFAULT 'SAR',
  skills           UUID[],
  prerequisites    UUID[],
  is_active        BOOLEAN DEFAULT true,
  max_participants INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_learning_progs_type_idx ON saudi_learning_programs(type);
CREATE INDEX saudi_learning_progs_active_idx ON saudi_learning_programs(is_active);

CREATE TABLE saudi_learning_enrollments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  program_id      UUID NOT NULL REFERENCES saudi_learning_programs(id) ON DELETE CASCADE,
  status          saudi_learning_status NOT NULL DEFAULT 'planned',
  enrolled_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  due_date        DATE,
  progress        INTEGER DEFAULT 0,
  score           NUMERIC(5,2),
  certificate_url TEXT,
  feedback        JSONB,
  approved_by_id  UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_learning_enroll_emp_idx ON saudi_learning_enrollments(employee_id);
CREATE INDEX saudi_learning_enroll_prog_idx ON saudi_learning_enrollments(program_id);
CREATE INDEX saudi_learning_enroll_status_idx ON saudi_learning_enrollments(status);

CREATE TABLE saudi_career_roles (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title              TEXT NOT NULL,
  description        TEXT,
  department_id      UUID REFERENCES saudi_departments(id) ON DELETE SET NULL,
  level              INTEGER NOT NULL,
  min_salary         NUMERIC(12,2),
  max_salary         NUMERIC(12,2),
  currency           TEXT DEFAULT 'SAR',
  required_skills    UUID[],
  required_experience JSONB,
  competencies       JSONB,
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX saudi_career_roles_title_idx ON saudi_career_roles(title);
CREATE INDEX saudi_career_roles_dept_idx ON saudi_career_roles(department_id);
CREATE INDEX saudi_career_roles_level_idx ON saudi_career_roles(level);

CREATE TABLE saudi_career_paths (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  from_role_id      UUID REFERENCES saudi_career_roles(id) ON DELETE SET NULL,
  to_role_id        UUID NOT NULL REFERENCES saudi_career_roles(id) ON DELETE CASCADE,
  status            saudi_career_path_status NOT NULL DEFAULT 'active',
  estimated_months  INTEGER,
  required_skills   UUID[],
  required_experience JSONB,
  milestones        JSONB,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_career_paths_from_idx ON saudi_career_paths(from_role_id);
CREATE INDEX saudi_career_paths_to_idx ON saudi_career_paths(to_role_id);
CREATE INDEX saudi_career_paths_status_idx ON saudi_career_paths(status);

CREATE TABLE saudi_employee_career_paths (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id           UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  career_path_id        UUID NOT NULL REFERENCES saudi_career_paths(id) ON DELETE CASCADE,
  status                saudi_career_path_status NOT NULL DEFAULT 'active',
  started_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  target_completion_date DATE,
  completed_at          TIMESTAMPTZ,
  current_milestone     INTEGER DEFAULT 0,
  progress              INTEGER DEFAULT 0,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_emp_career_paths_emp_idx ON saudi_employee_career_paths(employee_id);
CREATE INDEX saudi_emp_career_paths_path_idx ON saudi_employee_career_paths(career_path_id);
CREATE INDEX saudi_emp_career_paths_status_idx ON saudi_employee_career_paths(status);

CREATE TABLE saudi_succession_plans (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id       UUID NOT NULL REFERENCES saudi_career_roles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES saudi_departments(id) ON DELETE SET NULL,
  incumbent_id  UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  status        saudi_succession_status NOT NULL DEFAULT 'identified',
  risk_level    TEXT,
  readiness_date DATE,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_succession_role_idx ON saudi_succession_plans(role_id);
CREATE INDEX saudi_succession_dept_idx ON saudi_succession_plans(department_id);
CREATE INDEX saudi_succession_status_idx ON saudi_succession_plans(status);

CREATE TABLE saudi_succession_candidates (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  succession_plan_id UUID NOT NULL REFERENCES saudi_succession_plans(id) ON DELETE CASCADE,
  employee_id        UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  status             saudi_succession_status NOT NULL DEFAULT 'identified',
  readiness_score    INTEGER,
  development_areas  JSONB,
  development_plan   TEXT,
  nominated_by_id    UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  nominated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_succession_cand_plan_idx ON saudi_succession_candidates(succession_plan_id);
CREATE INDEX saudi_succession_cand_emp_idx ON saudi_succession_candidates(employee_id);
CREATE INDEX saudi_succession_cand_status_idx ON saudi_succession_candidates(status);

CREATE TABLE saudi_engagement_surveys (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  status          saudi_engagement_survey_status NOT NULL DEFAULT 'draft',
  start_date      DATE,
  end_date        DATE,
  questions       JSONB,
  target_audience JSONB,
  is_anonymous    BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_engagement_surveys_status_idx ON saudi_engagement_surveys(status);

CREATE TABLE saudi_survey_responses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id   UUID NOT NULL REFERENCES saudi_engagement_surveys(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  responses   JSONB,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_survey_resp_survey_idx ON saudi_survey_responses(survey_id);
CREATE INDEX saudi_survey_resp_emp_idx ON saudi_survey_responses(employee_id);

CREATE TABLE saudi_stay_interviews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  interviewer_id  UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  scheduled_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          saudi_stay_interview_status NOT NULL DEFAULT 'scheduled',
  responses       JSONB,
  risk_factors    JSONB,
  action_items    JSONB,
  follow_up_date  DATE,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_stay_interviews_emp_idx ON saudi_stay_interviews(employee_id);
CREATE INDEX saudi_stay_interviews_status_idx ON saudi_stay_interviews(status);

CREATE TABLE saudi_recognitions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_employee_id UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  to_employee_id   UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  type            saudi_recognition_type NOT NULL DEFAULT 'peer',
  message         TEXT NOT NULL,
  values          TEXT[],
  is_public       BOOLEAN DEFAULT true,
  reward_id       UUID,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_recognitions_from_idx ON saudi_recognitions(from_employee_id);
CREATE INDEX saudi_recognitions_to_idx ON saudi_recognitions(to_employee_id);
CREATE INDEX saudi_recognitions_type_idx ON saudi_recognitions(type);

CREATE TABLE saudi_rewards (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  type        saudi_reward_type NOT NULL DEFAULT 'non_monetary',
  value       NUMERIC(12,2),
  currency    TEXT DEFAULT 'SAR',
  quantity    INTEGER DEFAULT 1,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_rewards_type_idx ON saudi_rewards(type);
CREATE INDEX saudi_rewards_active_idx ON saudi_rewards(is_active);

CREATE TABLE saudi_reward_redemptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reward_id     UUID NOT NULL REFERENCES saudi_rewards(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  redeemed_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  approved_by_id UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_reward_redemptions_reward_idx ON saudi_reward_redemptions(reward_id);
CREATE INDEX saudi_reward_redemptions_emp_idx ON saudi_reward_redemptions(employee_id);

CREATE TABLE saudi_total_rewards_statements (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id        UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  base_salary        NUMERIC(12,2),
  housing_allowance  NUMERIC(12,2),
  transport_allowance NUMERIC(12,2),
  other_allowances   NUMERIC(12,2),
  bonus              NUMERIC(12,2),
  benefits_value     NUMERIC(12,2),
  equity_value       NUMERIC(12,2),
  total_value        NUMERIC(12,2),
  currency           TEXT DEFAULT 'SAR',
  breakdown          JSONB,
  generated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_total_rewards_emp_idx ON saudi_total_rewards_statements(employee_id);
CREATE INDEX saudi_total_rewards_period_idx ON saudi_total_rewards_statements(period_start, period_end);
CREATE UNIQUE INDEX saudi_total_rewards_unique_idx ON saudi_total_rewards_statements(employee_id, period_start, period_end);

CREATE TABLE saudi_compensation_plans (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  description         TEXT,
  type                TEXT NOT NULL,
  effective_date      DATE NOT NULL,
  end_date            DATE,
  eligibility_criteria JSONB,
  budget              NUMERIC(14,2),
  currency            TEXT DEFAULT 'SAR',
  status              TEXT DEFAULT 'draft',
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_comp_plans_status_idx ON saudi_compensation_plans(status);

CREATE TABLE saudi_compensation_adjustments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id           UUID NOT NULL REFERENCES saudi_compensation_plans(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  adjustment_type   TEXT NOT NULL,
  current_value     NUMERIC(12,2),
  proposed_value    NUMERIC(12,2),
  change_amount     NUMERIC(12,2),
  change_percentage NUMERIC(5,2),
  justification     TEXT,
  status            TEXT DEFAULT 'pending',
  approved_by_id    UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  effective_date    DATE,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_comp_adj_plan_idx ON saudi_compensation_adjustments(plan_id);
CREATE INDEX saudi_comp_adj_emp_idx ON saudi_compensation_adjustments(employee_id);
CREATE INDEX saudi_comp_adj_status_idx ON saudi_compensation_adjustments(status);

CREATE TABLE saudi_talent_reviews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  review_date     DATE NOT NULL,
  status          TEXT DEFAULT 'planned',
  participants    UUID[],
  facilitator_id  UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_talent_reviews_status_idx ON saudi_talent_reviews(status);

CREATE TABLE saudi_talent_review_participants (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_review_id   UUID NOT NULL REFERENCES saudi_talent_reviews(id) ON DELETE CASCADE,
  employee_id        UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  reviewer_id        UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  performance_rating INTEGER,
  potential_rating   INTEGER,
  nine_box_position  TEXT,
  strengths          TEXT,
  development_areas  TEXT,
  next_steps         TEXT,
  is_high_potential  BOOLEAN DEFAULT false,
  retention_risk     TEXT,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_talent_review_part_review_idx ON saudi_talent_review_participants(talent_review_id);
CREATE INDEX saudi_talent_review_part_emp_idx ON saudi_talent_review_participants(employee_id);
CREATE INDEX saudi_talent_review_part_reviewer_idx ON saudi_talent_review_participants(reviewer_id);

-- ==========================================
-- SECTION 8: AI Module
-- ==========================================

CREATE TABLE saudi_ai_assistants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  model         TEXT NOT NULL DEFAULT 'claude-3.5-sonnet',
  system_prompt TEXT,
  capabilities  JSONB DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  config        JSONB,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE saudi_ai_suggestions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   UUID REFERENCES saudi_employees(id) ON DELETE SET NULL,
  department_id UUID REFERENCES saudi_departments(id) ON DELETE SET NULL,
  type          saudi_ai_suggestion_type NOT NULL,
  status        saudi_ai_suggestion_status NOT NULL DEFAULT 'pending',
  title         TEXT NOT NULL,
  description   TEXT,
  suggestion    JSONB NOT NULL,
  reasoning     TEXT,
  confidence    saudi_ai_confidence_level NOT NULL DEFAULT 'medium',
  source        TEXT,
  metadata      JSONB,
  applied_at    TIMESTAMPTZ,
  applied_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_ai_suggestions_emp_idx ON saudi_ai_suggestions(employee_id);
CREATE INDEX saudi_ai_suggestions_type_idx ON saudi_ai_suggestions(type);
CREATE INDEX saudi_ai_suggestions_status_idx ON saudi_ai_suggestions(status);
CREATE INDEX saudi_ai_suggestions_dept_idx ON saudi_ai_suggestions(department_id);

CREATE TABLE saudi_ai_jd_enhancements (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_requisition_id UUID NOT NULL REFERENCES saudi_job_requisitions(id) ON DELETE CASCADE,
  original_content   TEXT NOT NULL,
  enhanced_content   TEXT NOT NULL,
  changes            JSONB,
  suggestions        JSONB,
  model_used         TEXT,
  is_applied         BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_ai_jd_enhancements_job_idx ON saudi_ai_jd_enhancements(job_requisition_id);

CREATE TABLE saudi_ai_candidate_matchings (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id       UUID REFERENCES saudi_candidates(id) ON DELETE SET NULL,
  job_requisition_id UUID REFERENCES saudi_job_requisitions(id) ON DELETE SET NULL,
  match_score        NUMERIC(5,2) NOT NULL,
  skill_match        JSONB,
  experience_match   JSONB,
  education_match    JSONB,
  culture_fit_score  NUMERIC(5,2),
  overall_assessment TEXT,
  strengths          JSONB,
  gaps               JSONB,
  recommendations    JSONB,
  model_used         TEXT,
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_ai_candidate_matchings_candidate_idx ON saudi_ai_candidate_matchings(candidate_id);
CREATE INDEX saudi_ai_candidate_matchings_job_idx ON saudi_ai_candidate_matchings(job_requisition_id);

CREATE TABLE saudi_ai_interview_feedback (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id         UUID REFERENCES saudi_interviews(id) ON DELETE SET NULL,
  transcript_summary   TEXT,
  key_topics           JSONB,
  sentiment_analysis   JSONB,
  skill_assessment     JSONB,
  red_flags            JSONB,
  green_flags          JSONB,
  overall_rating       INTEGER,
  hiring_recommendation TEXT,
  suggested_questions  JSONB,
  model_used           TEXT,
  created_at           TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_ai_interview_feedback_interview_idx ON saudi_ai_interview_feedback(interview_id);

CREATE TABLE saudi_ai_skill_recommendations (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id        UUID NOT NULL REFERENCES saudi_employees(id) ON DELETE CASCADE,
  current_skills     JSONB,
  target_role        TEXT,
  recommended_skills JSONB NOT NULL,
  learning_path      JSONB,
  estimated_timeline TEXT,
  priority           saudi_ai_confidence_level DEFAULT 'medium',
  notes              TEXT,
  status             TEXT DEFAULT 'pending',
  created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX saudi_ai_skill_recommendations_emp_idx ON saudi_ai_skill_recommendations(employee_id);
CREATE INDEX saudi_ai_skill_recommendations_status_idx ON saudi_ai_skill_recommendations(status);

-- ==========================================
-- SECTION 9: Enable Row-Level Security
-- ==========================================

ALTER TABLE saudi_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_employment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_wage_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_final_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_job_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_onboarding_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_background_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_reference_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_goal_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_review_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_skill_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_learning_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_learning_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_career_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_career_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_employee_career_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_succession_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_succession_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_engagement_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_stay_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_total_rewards_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_compensation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_compensation_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_talent_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_talent_review_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_ai_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_ai_jd_enhancements ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_ai_candidate_matchings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_ai_interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_ai_skill_recommendations ENABLE ROW LEVEL SECURITY;
