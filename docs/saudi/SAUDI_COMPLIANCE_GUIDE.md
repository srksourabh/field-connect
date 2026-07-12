# Saudi HR Compliance Guide

## Overview

Field-Connect supports Saudi labor law compliance for white-label deployments across India and Saudi markets. The Saudi module lives in `src/saudi/` and uses a `saudi_` table prefix alongside existing `hr_*` India tables in the same Supabase project. Multi-tenant company onboarding with data-region awareness enables per-tenant isolation and future regional sharding.

---

## Architecture

### Folder Layout

```
src/
  lib/saudi/
    types.ts          — All TypeScript interfaces for Saudi entities
    utils.ts          — GOSI calc, ESB calc, wage file gen, Hijri dates
    api.ts            — Client API wrapper (fetchJson helper)
  app/
    api/saudi/        — API routes (employees, departments, leave, payroll, documents)
    dashboard/saudi/  — Dashboard pages (overview, employees, departments, leave, payroll, compliance)
    dashboard/admin/companies/  — Company onboarding (list, new, edit)
components/
  ui/Sidebar.tsx     — Updated with Companies link for super_admin
```

### Database

- **Migration 024**: Saudi module core (56 tables, 27 enums) — `saudi_employees`, `saudi_departments`, `saudi_leave_types`, `saudi_leave_requests`, `saudi_leave_balances`, `saudi_payroll_runs`, `saudi_payslips`, `saudi_wage_files`, `saudi_compliance_checks`, `saudi_final_settlements`, `saudi_documents`, `saudi_notifications`, `saudi_audit_logs`
- **Migration 025**: Saudi enterprise (22 new tables) — company registry, principal employers, establishments, Nitaqat, GOSI submissions/forms, Qiwa contracts, employment contracts, insurance, work injuries, disciplinary actions, HRDF programs, sponsorship transfers, data region routing
- **Migration application blocked**: Requires DB password / SUPABASE_ACCESS_TOKEN to apply

---

## Multi-Tenant Company Onboarding

### Company Registry (`company_registry`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `company_name` | TEXT | Legal company name |
| `cr_number` | TEXT UNIQUE | Commercial Registration number |
| `context_type` | ENUM (`india`/`saudi`) | Market context — controls compliance rules and UI labels |
| `data_region` | ENUM (`default`/`bahrain`/`dubai`/`kuwait`/`qatar`) | Future: routes this tenant's data to the selected region |
| `sub_admin_user_id` | UUID FK → auth.users | Designated sub-admin for this company |
| `is_active` | BOOLEAN | Soft-deactivate without data loss |

### Admin UI

- **List**: `/dashboard/admin/companies` — searchable, shows context/region badges
- **New**: `/dashboard/admin/companies/new` — form with context toggle (India/Saudi) and region selector
- **Edit**: `/dashboard/admin/companies/[id]` — full edit, deactivate, context/region management
- **Visibility**: Companies link appears only for `super_admin` role in sidebar

### Data Residency

Each company has a `data_region` tag. On creation, a `saudi_data_region_routing` record is inserted specifying the target region and (optionally) an encrypted database URL. In future, a middleware layer can route per-company queries to regional shards.

---

## Saudi Compliance Models

### Principal Employer & Establishments

- `saudi_principal_employers` — Legal entity holding CR, VAT, unified number, Nitaqat activity code
- `saudi_establishments` — Branches/outlets under a principal employer, each with its own Nitaqat band
- Every `saudi_employee` can be linked to a principal employer and establishment

### Nitaqat / Saudization

- `saudi_nitaqat_records` — Monthly snapshot: band (platinum → red), saudization %, total/saudi/expat counts
- `saudi_saudization_targets` — Annual target percentages per profession code
- `saudi_saudi_nationals_quota` — Per-employee quota tracking with salary threshold checks
- Bands: `platinum`, `high_green`, `mid_green`, `low_green`, `red`

### GOSI (General Organization for Social Insurance)

- `saudi_gosi_submissions` — Monthly batch submission records with totals, reference numbers, penalty tracking
- `saudi_gosi_forms` — Individual Form 1/2/6/11/12 tracking per employee, with Qiwa acknowledgment
- `saudi_gosi_penalties` — Penalty appeals and payment tracking
- Utility: `calcGOSI()` in `utils.ts` — supports `old` (9.5% employee, 2% employer) and `new` contribution systems with SAR 45,000 cap

### Qiwa Integration

- `saudi_qiwa_service_requests` — Audit log of all Qiwa API calls (service type, reference, status, errors)
- `saudi_qiwa_contracts_saudi` — Authenticated contract records with allowances, probation, working hours
- `saudi_employment_contracts` — Full contract lifecycle (non-compete, overtime rates, renewal count, termination)

### Health Insurance (CCHI)

- `saudi_insurance_policies` — Group policy tracking by provider, coverage level, premium
- `saudi_insurance_enrollments` — Per-employee enrollment with card number, dependent count, expiry alerts

### Labour & Ministry Compliance

- `saudi_work_injuries` — Incident reporting, GOSI claim tracking, MOL notification
- `saudi_disciplinary_actions` — Progressive discipline (verbal warning → termination), appeals
- `saudi_grievances` — Employee grievance filing and resolution tracking
- `saudi_sponsorship_transfers` — Qiwa/Absher reference tracking for sponsorship transfers

### Working Calendar

- `saudi_public_holidays` — Gregorian + Hijri dates for annual holidays
- `saudi_working_hours_config` — Per-establishment config for standard/Ramadan hours, Friday schedule

### HRDF / Training

- `saudi_hrdf_programs` — Program type, provider, cost, subsidy tracking with HRDF reference

---

## Onboarding Checklist

### For Each New Company

1. Create company via `/dashboard/admin/companies/new`
   - Set context (India/Saudi) and data region
   - Enter CR number, trading name, contact info
2. Apply migrations (024 + 025) to Supabase
3. Create principal employer record
4. Set up establishments (at least one)
5. Configure Nitaqat activity codes
6. Import/enter employee data
7. Set up GOSI registration for each employee
8. Upload employment contracts to Qiwa
9. Configure working hours (standard + Ramadan)
10. Add insurance policy and enroll employees

---

## Soft-Launch Readiness

### Done
- All 22 enterprise compliance tables defined (025 migration)
- Company onboarding UI (list, new, edit)
- Context toggle (India vs Saudi)
- Data region routing architecture
- Sub-admin user FK for delegated management
- Principal employer + establishment structure
- Nitaqat/Saudization tracking
- GOSI monthly submissions, forms, penalties
- Qiwa service requests and contracts
- Full contract lifecycle
- Health insurance policies and enrollments
- Work injury reporting
- Disciplinary actions and grievances
- Sponsorship transfer tracking
- HRDF training programs
- Public holidays and working hours config

### Blocked
- Migration 024 not applied to Supabase (missing DB password)
- Migration 025 not applied (depends on 024)

### Next
- Apply both migrations via supabase CLI or psql
- Create Saudi employee import wizard
- Build dashboard alerts for expiring documents (iqama/passport)
- Build Nitaqat band dashboard
- Add Qiwa API service connectors
- Add GOSI file generation (Form 1/2/6/11/12)
- Add data-region sharding middleware
