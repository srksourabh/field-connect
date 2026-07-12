export interface SaudiDepartment {
  id: string;
  name: string;
  parent_department_id: string | null;
  head_employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaudiEmployee {
  id: string;
  department_id: string | null;
  manager_employee_id: string | null;
  iqama_number_enc: string | null;
  passport_number_enc: string | null;
  bank_iban_enc: string | null;
  nationality: "saudi" | "expat";
  full_name: string;
  employment_status: "active" | "terminated" | "suspended" | "on_leave";
  hire_date: string;
  termination_date: string | null;
  gosi_registration_date: string | null;
  gosi_system: "old" | "new" | null;
  salary_basic: number;
  salary_housing: number;
  salary_transport: number;
  rehire_eligible: string | null;
  rehire_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaudiLeaveType {
  id: string;
  name: string;
  days_allowed: number;
  rules: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SaudiLeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaudiLeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  balance: number;
  year: number;
}

export interface SaudiPayrollRun {
  id: string;
  period_month: string;
  status: "draft" | "pre_check" | "ready" | "completed" | "cancelled";
  total_amount: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaudiPayslip {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  basic: number;
  housing: number;
  transport: number;
  overtime: number;
  gosi_employee: number;
  gosi_employer: number;
  deductions: number;
  net_pay: number;
  pdf_url: string | null;
  created_at: string;
}

export interface SaudiWageFile {
  id: string;
  payroll_run_id: string;
  format: string;
  file_url: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface SaudiComplianceCheck {
  id: string;
  payroll_run_id: string;
  check_type: string;
  status: "passed" | "flagged" | "blocked";
  flagged_issues: Record<string, unknown> | null;
  created_at: string;
}

export interface SaudiFinalSettlement {
  id: string;
  employee_id: string;
  esb_amount: number | null;
  unpaid_salary: number | null;
  accrued_leave_payout: number | null;
  exit_reason: string | null;
  created_at: string;
}

export interface SaudiDocument {
  id: string;
  employee_id: string;
  type: "iqama" | "passport" | "work_permit" | "contract" | "certificate" | "other";
  file_name: string;
  file_url: string;
  expiry_date: string | null;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface SaudiNotification {
  id: string;
  user_id: string;
  channel: "email" | "sms" | "in_app";
  type: string | null;
  title: string;
  message: string;
  severity: string | null;
  metadata: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export interface SaudiAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface GOSICalculation {
  employeeContribution: number;
  employerContribution: number;
  total: number;
  contributionBase: number;
}

export interface ESBCalculation {
  amount: number;
  serviceYears: number;
  baseSalary: number;
  isResigned: boolean;
}

export interface WageFileRecord {
  employeeId: string;
  iqamaNumber: string;
  fullName: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  grossSalary: number;
  gosiDeduction: number;
  netSalary: number;
  bankIban: string;
}

// ============================================
// Company Registry & Multi-Tenant
// ============================================

export type CompanyContext = "india" | "saudi";
export type DataRegion = "default" | "bahrain" | "dubai" | "kuwait" | "qatar";

export interface CompanyRegistry {
  id: string;
  company_name: string;
  trading_name: string | null;
  cr_number: string | null;
  cr_expiry_date: string | null;
  logo_url: string | null;
  context_type: CompanyContext;
  sub_admin_user_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  is_active: boolean;
  data_region: DataRegion;
  data_region_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Principal Employer & Establishments
// ============================================

export interface SaudiPrincipalEmployer {
  id: string;
  company_id: string;
  legal_name: string;
  cr_number: string;
  cr_issue_date: string | null;
  cr_expiry_date: string | null;
  license_number: string | null;
  license_expiry: string | null;
  economic_activity: string | null;
  nitaqat_activity_code: string | null;
  vat_number: string | null;
  unified_number: string | null;
  is_active: boolean;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

export interface SaudiEstablishment {
  id: string;
  principal_employer_id: string;
  name: string;
  branch_number: string | null;
  cr_number: string | null;
  economic_activity: string | null;
  nitaqat_activity_code: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

// ============================================
// Nitaqat / Saudization
// ============================================

export type NitaqatBand = "platinum" | "high_green" | "mid_green" | "low_green" | "red";

export interface SaudiNitaqatRecord {
  id: string;
  principal_employer_id: string;
  establishment_id: string | null;
  period_month: string;
  band: NitaqatBand;
  saudization_percentage: number;
  total_employees: number;
  saudi_count: number;
  expat_count: number;
  target_percentage: number;
  points: number | null;
  certificate_url: string | null;
  notes: string | null;
  data_region: DataRegion;
  created_at: string;
}

export interface SaudiSaudizationTarget {
  id: string;
  principal_employer_id: string;
  establishment_id: string | null;
  year: number;
  profession_code: string | null;
  target_percentage: number;
  minimum_salary: number | null;
  is_active: boolean;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

export interface SaudiNationalQuota {
  id: string;
  principal_employer_id: string;
  employee_id: string;
  monthly_salary: number;
  counts_as_full: boolean;
  profession_code: string | null;
  contract_authenticated: boolean;
  effective_from: string;
  effective_to: string | null;
  data_region: DataRegion;
  created_at: string;
}

// ============================================
// GOSI Enhanced
// ============================================

export type GOSIFormType = "form_1" | "form_2" | "form_6" | "form_11" | "form_12";

export interface SaudiGOSISubmission {
  id: string;
  principal_employer_id: string;
  period_month: string;
  submission_date: string;
  total_employees: number;
  total_wages: number;
  total_employee_contribution: number;
  total_employer_contribution: number;
  submission_reference: string | null;
  status: string;
  acknowledgment_url: string | null;
  penalty_amount: number | null;
  notes: string | null;
  data_region: DataRegion;
  created_at: string;
}

export interface SaudiGOSIForm {
  id: string;
  principal_employer_id: string;
  employee_id: string;
  form_type: GOSIFormType;
  form_reference: string | null;
  submission_date: string | null;
  effective_date: string;
  details: Record<string, unknown> | null;
  status: string;
  acknowledgment_url: string | null;
  data_region: DataRegion;
  created_at: string;
}

export interface SaudiGOSIPenalty {
  id: string;
  principal_employer_id: string;
  penalty_reference: string;
  penalty_date: string;
  amount: number;
  reason: string;
  period_month: string | null;
  is_appealed: boolean;
  appeal_date: string | null;
  appeal_result: string | null;
  paid_at: string | null;
  data_region: DataRegion;
  created_at: string;
}

// ============================================
// Qiwa Enhanced
// ============================================

export interface SaudiQiwaServiceRequest {
  id: string;
  principal_employer_id: string;
  employee_id: string | null;
  service_type: string;
  qiwa_reference: string | null;
  status: string;
  request_date: string;
  completion_date: string | null;
  details: Record<string, unknown> | null;
  error_message: string | null;
  data_region: DataRegion;
  created_at: string;
}

export type SaudiContractType = "fixed_term" | "unlimited" | "project_based";

export interface SaudiQiwaContract {
  id: string;
  principal_employer_id: string;
  employee_id: string;
  qiwa_contract_id: string | null;
  contract_type: SaudiContractType;
  start_date: string;
  end_date: string | null;
  probation_end_date: string | null;
  salary: number;
  allowances: Record<string, unknown> | null;
  working_hours: string | null;
  is_authenticated: boolean;
  authentication_date: string | null;
  status: string;
  signed_at: string | null;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

// ============================================
// Employment Contracts
// ============================================

export interface SaudiEmploymentContract {
  id: string;
  employee_id: string;
  contract_type: SaudiContractType;
  contract_number: string | null;
  start_date: string;
  end_date: string | null;
  probation_period_days: number;
  probation_end_date: string | null;
  working_hours_per_day: number;
  working_days_per_week: number;
  weekly_rest_day: string;
  notice_period_days: number;
  overtime_rate: number;
  overtime_holiday_rate: number;
  non_compete_clause: boolean;
  non_compete_duration: number | null;
  job_title: string | null;
  job_description: string | null;
  document_url: string | null;
  is_qiwa_registered: boolean;
  qiwa_contract_id: string | null;
  status: string;
  renewal_count: number;
  renewed_at: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

// ============================================
// Health Insurance (CCHI)
// ============================================

export interface SaudiInsurancePolicy {
  id: string;
  principal_employer_id: string;
  policy_number: string;
  provider_name: string;
  policy_type: string;
  coverage_level: string;
  start_date: string;
  end_date: string;
  total_premium: number | null;
  currency: string;
  document_url: string | null;
  is_active: boolean;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

export interface SaudiInsuranceEnrollment {
  id: string;
  policy_id: string;
  employee_id: string;
  card_number: string | null;
  enrollment_date: string;
  effective_date: string;
  expiry_date: string;
  dependent_count: number;
  monthly_premium: number | null;
  status: string;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

// ============================================
// Work Injuries
// ============================================

export type WorkInjurySeverity = "minor" | "moderate" | "severe" | "fatal";

export interface SaudiWorkInjury {
  id: string;
  employee_id: string;
  incident_date: string;
  incident_type: string;
  severity: WorkInjurySeverity;
  description: string;
  location: string | null;
  body_part: string | null;
  medical_treatment: string | null;
  hospital_name: string | null;
  days_off_work: number | null;
  gosi_claim_reference: string | null;
  gosi_claim_amount: number | null;
  gosi_claim_status: string | null;
  is_reported_to_mol: boolean;
  report_date: string | null;
  closed_at: string | null;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

// ============================================
// Disciplinary Actions & Grievances
// ============================================

export type DisciplinaryType = "verbal_warning" | "written_warning" | "final_warning" | "salary_deduction" | "suspension" | "termination";

export interface SaudiDisciplinaryAction {
  id: string;
  employee_id: string;
  action_type: DisciplinaryType;
  reason: string;
  description: string | null;
  issued_by_id: string | null;
  issued_date: string;
  amount: number | null;
  suspension_days: number | null;
  appeal_date: string | null;
  appeal_result: string | null;
  is_expunged: boolean;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

export interface SaudiGrievance {
  id: string;
  employee_id: string;
  grievance_type: string;
  subject: string;
  description: string;
  filed_date: string;
  against_id: string | null;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by_id: string | null;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

// ============================================
// Working Calendar
// ============================================

export interface SaudiPublicHoliday {
  id: string;
  name_en: string;
  name_ar: string | null;
  date_gregorian: string;
  date_hijri: string | null;
  is_annual: boolean;
  hijri_year: number | null;
  is_active: boolean;
  data_region: DataRegion;
  created_at: string;
}

export interface SaudiWorkingHoursConfig {
  id: string;
  principal_employer_id: string;
  name: string;
  is_ramadan: boolean;
  start_time: string;
  end_time: string;
  friday_start: string | null;
  friday_end: string | null;
  daily_hours: number;
  weekly_hours: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

// ============================================
// HRDF / Training
// ============================================

export interface SaudiHRDFProgram {
  id: string;
  principal_employer_id: string;
  employee_id: string | null;
  program_type: string;
  program_name: string;
  provider: string | null;
  start_date: string;
  end_date: string | null;
  cost: number | null;
  subsidy_amount: number | null;
  subsidy_percent: number | null;
  status: string;
  hrdf_reference: string | null;
  completion_date: string | null;
  data_region: DataRegion;
  created_at: string;
  updated_at: string;
}

// ============================================
// Sponsorship Transfer
// ============================================

export interface SaudiSponsorshipTransfer {
  id: string;
  employee_id: string;
  from_employer_id: string;
  to_employer_id: string;
  transfer_date: string;
  transfer_type: string;
  qiwa_reference: string | null;
  absher_reference: string | null;
  old_iqama_expiry: string | null;
  new_iqama_expiry: string | null;
  status: string;
  notes: string | null;
  data_region: DataRegion;
  created_at: string;
}

// ============================================
// Data Region Routing
// ============================================

export interface DataRegionRouting {
  id: string;
  company_id: string;
  data_region: DataRegion;
  database_url_enc: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
