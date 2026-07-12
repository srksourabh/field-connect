# Memory - Field Connect Saudi Module

## Project Identity
White-label HR platform (Field Connect) being extended with Saudi labor-law compliance module. India features (`hr_*` tables) stay untouched. Saudi features use `saudi_` prefix in same Supabase project.

## Repo
`C:\Users\soura\Dropbox\AI\Projects\field-connect`
Git remote: `https://github.com/srksourabh/field-connect.git` (branch: main)
Vercel: `srksourabhs-projects/field-connect`

## Key Architecture Decisions
1. **Single Supabase project** for both India + Saudi tables — no migration away from Supabase
2. **No Drizzle ORM** — raw SQL migrations + Supabase client (type-safe via manual interfaces)
3. **Saudi module at `src/saudi/`** — fully self-contained, no India code changes
4. **API routes at `src/app/api/saudi/`** — server-side with `supabaseAdmin` (service_role)
5. **Dashboard pages at `src/app/dashboard/saudi/`** — client-side with `supabase` (anon key)
6. **Admin pages at `src/app/dashboard/admin/companies/`** — multi-tenant onboarding

## Database

### Migration Chain (applied up to 023)
```
001-023: India core tables (hr_profiles, hr_attendance, hr_payroll, etc.)
006: Saudi columns on existing tables (gosi_*, qiwa_*) — duplicate numbering, pre-existing
024: Saudi core (56 tables, 27 enums) — NOT APPLIED (no DB password)
025: Saudi enterprise (22 tables) — NOT APPLIED (depends on 024)
```

### Migrations 024 Schema
- `saudi_employees`, `saudi_departments`, `saudi_leave_types`, `saudi_leave_requests`, `saudi_leave_balances`
- `saudi_payroll_runs`, `saudi_payslips`, `saudi_wage_files`, `saudi_compliance_checks`, `saudi_final_settlements`
- `saudi_documents`, `saudi_notifications`, `saudi_audit_logs`
- 27 PostgreSQL enums for status, type, severity, channel, etc.

### Migration 025 Schema (New)
- `company_registry` — multi-tenant onboarding (context_type, data_region, sub_admin_user_id)
- `saudi_principal_employers` — CR, VAT, unified number, Nitaqat activity code
- `saudi_establishments` — branches under principal employer
- `saudi_nitaqat_records` — monthly Nitaqat band snapshot
- `saudi_saudization_targets` — annual targets per profession
- `saudi_saudi_nationals_quota` — per-employee quota
- `saudi_gosi_submissions` — monthly batch submissions
- `saudi_gosi_forms` — Form 1/2/6/11/12 per employee
- `saudi_gosi_penalties` — penalties + appeals
- `saudi_qiwa_service_requests` — Qiwa API audit log
- `saudi_qiwa_contracts_saudi` — authenticated contracts
- `saudi_employment_contracts` — full lifecycle
- `saudi_insurance_policies` / `saudi_insurance_enrollments` — CCHI
- `saudi_work_injuries` — incident + GOSI claim
- `saudi_disciplinary_actions` / `saudi_grievances`
- `saudi_public_holidays` / `saudi_working_hours_config`
- `saudi_hrdf_programs` — training subsidies
- `saudi_sponsorship_transfers` — Qiwa/Absher references
- `saudi_data_region_routing` — per-company regional shard config

## Files Created/Modified

### New (All this session)
| File | Purpose |
|------|---------|
| `supabase/migrations/025_saudi_enterprise.sql` | All 22 enterprise tables |
| `src/app/dashboard/admin/companies/page.tsx` | Company list with search |
| `src/app/dashboard/admin/companies/new/page.tsx` | New company form |
| `src/app/dashboard/admin/companies/[id]/page.tsx` | Edit company detail |
| `docs/saudi/SAUDI_COMPLIANCE_GUIDE.md` | Full compliance documentation |
| `memory.md` | This file |

### Modified (This session)
| File | Change |
|------|--------|
| `src/lib/saudi/types.ts` | Added 25+ enterprise interfaces |
| `src/components/ui/Sidebar.tsx` | Added Companies link for super_admin |
| `src/app/api/admin/payroll/route.ts` | Fixed ESLint errors (any types, catch clause) |
| Various saudi dashboard pages | Fixed unused imports, any types, undefined vars |

### Previously Created (prior session, still relevant)
| File | Purpose |
|------|---------|
| `supabase/migrations/024_saudi_module.sql` | 56 core Saudi tables |
| `src/lib/saudi/types.ts` | Core type interfaces |
| `src/lib/saudi/utils.ts` | GOSI, ESB, wage file, leave calc, SAR format |
| `src/lib/saudi/api.ts` | Client API wrapper |
| `src/app/api/saudi/employees/route.ts` | Employees CRUD API |
| `src/app/api/saudi/employees/[id]/route.ts` | Single employee API |
| `src/app/api/saudi/departments/route.ts` | Departments API |
| `src/app/api/saudi/leave/route.ts` | Leave requests API |
| `src/app/api/saudi/payroll/route.ts` | Payroll runs API |
| `src/app/api/saudi/documents/route.ts` | Documents API |
| `src/app/dashboard/saudi/layout.tsx` | Saudi sidebar nav |
| `src/app/dashboard/saudi/page.tsx` | Metrics overview |
| `src/app/dashboard/saudi/employees/page.tsx` | Employee list |
| `src/app/dashboard/saudi/employees/[id]/page.tsx` | Employee detail |
| `src/app/dashboard/saudi/employees/new/page.tsx` | New employee form |
| `src/app/dashboard/saudi/departments/page.tsx` | Departments |
| `src/app/dashboard/saudi/leave/page.tsx` | Leave management |
| `src/app/dashboard/saudi/payroll/page.tsx` | Payroll runs |
| `src/app/dashboard/saudi/compliance/page.tsx` | Compliance + expiring docs |
| `src/lib/payroll-saudi.ts` | ESB + GOSI helpers (used by admin payroll) |
| `supabase/migrations/006_add_saudi_fields.sql` | Saudi fields on India tables |

## Blocked
- Migration 024 NOT applied to Supabase — need DB password or `SUPABASE_ACCESS_TOKEN` in `.env.local`
- Migration 025 NOT applied — depends on 024
- No Qiwa/GOSI API connectors yet — they'll write to `saudi_qiwa_service_requests` etc.

## Build Status
`npm run build` passes. 2 warnings (useEffect deps in leave page, anonymous default export in payroll-saudi) — non-blocking.

## How to Resume
1. Fix blocked migrations (set SUPABASE_ACCESS_TOKEN or run `psql` manually)
2. Apply 024 then 025 against the Supabase project
3. Build Qiwa API service layer
4. Build GOSI file generation (Form 1/2/6/11/12)
5. Add Nitaqat band dashboard
6. Wire data-region sharding middleware
