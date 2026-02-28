# Database Schema

All tables are in the `public` schema with Row-Level Security (RLS) enabled. Supabase project: `mzwmebrwmxhfyohulddl`. Migrations are in `supabase/migrations/` (16 files).

---

## Tables

### hr_profiles

Core employee record. One row per user, linked to Supabase Auth via `id`.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | — | PK, FK → auth.users(id) ON DELETE CASCADE |
| `full_name` | TEXT | — | NOT NULL |
| `designation` | TEXT | NULL | — |
| `reporting_manager_id` | UUID | NULL | FK → hr_profiles(id) (self-ref) |
| `project_id` | TEXT | NULL | — |
| `department` | TEXT | NULL | — |
| `role` | TEXT | `'employee'` | NOT NULL, CHECK IN (employee, manager, admin, super_admin) |
| `avatar_url` | TEXT | NULL | — |
| `phone` | TEXT | NULL | — |
| `email` | TEXT | NULL | Personal email (not auth email) |
| `date_of_joining` | DATE | NULL | — |
| `employee_code` | TEXT | NULL | UNIQUE |
| `address` | TEXT | NULL | — |
| `city` | TEXT | NULL | — |
| `state` | TEXT | NULL | — |
| `pincode` | TEXT | NULL | — |
| `deactivated_at` | TIMESTAMPTZ | NULL | Soft-delete timestamp |
| `leave_policy_id` | UUID | NULL | FK → hr_leave_policies(id) |
| `created_at` | TIMESTAMPTZ | NOW() | — |
| `updated_at` | TIMESTAMPTZ | NOW() | Auto-updated by trigger |

**Indexes:** `idx_hr_profiles_manager` ON (reporting_manager_id)

**Trigger:** `hr_profiles_updated_at` — BEFORE UPDATE → `hr_update_updated_at()`

---

### hr_attendance

One row per punch-in/out session. Multiple rows per user per day are allowed (multi-session).

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `user_id` | UUID | — | NOT NULL, FK → hr_profiles(id) ON DELETE CASCADE |
| `punch_in_at` | TIMESTAMPTZ | NULL | — |
| `punch_out_at` | TIMESTAMPTZ | NULL | NULL = still punched in |
| `punch_in_lat` | DOUBLE PRECISION | NULL | — |
| `punch_in_long` | DOUBLE PRECISION | NULL | — |
| `punch_out_lat` | DOUBLE PRECISION | NULL | — |
| `punch_out_long` | DOUBLE PRECISION | NULL | — |
| `total_distance_km` | DOUBLE PRECISION | NULL | — |
| `status` | TEXT | `'present'` | NOT NULL, CHECK IN (present, absent, late, half-day, on-leave, holiday, lwp) |
| `synced` | BOOLEAN | TRUE | — |
| `created_at` | TIMESTAMPTZ | NOW() | — |

**Indexes:** `idx_hr_attendance_user_date` ON (user_id, created_at)

---

### hr_leave_balances

Leave quota and usage per employee per calendar year.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `user_id` | UUID | — | NOT NULL, FK → hr_profiles(id) ON DELETE CASCADE |
| `year` | INTEGER | — | NOT NULL |
| `sick_leave_total` | INTEGER | 5 | — |
| `sick_leave_used` | INTEGER | 0 | — |
| `casual_leave_total` | INTEGER | 10 | — |
| `casual_leave_used` | INTEGER | 0 | — |
| `compoff_total` | INTEGER | 0 | — |
| `compoff_used` | INTEGER | 0 | — |
| `privilege_leave_total` | INTEGER | 0 | NOT NULL |
| `privilege_leave_used` | INTEGER | 0 | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOW() | — |
| `updated_at` | TIMESTAMPTZ | NOW() | Auto-updated by trigger |

**Constraints:** UNIQUE (user_id, year)

**Trigger:** `hr_leave_balances_updated_at` — BEFORE UPDATE → `hr_update_updated_at()`

---

### hr_leave_requests

Employee leave applications with approval workflow.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `user_id` | UUID | — | NOT NULL, FK → hr_profiles(id) ON DELETE CASCADE |
| `type` | TEXT | — | NOT NULL, CHECK IN (sick, casual, compoff, privilege) |
| `start_date` | DATE | — | NOT NULL |
| `end_date` | DATE | — | NOT NULL |
| `reason` | TEXT | NULL | — |
| `attachment_url` | TEXT | NULL | — |
| `status` | TEXT | `'pending'` | NOT NULL, CHECK IN (pending, approved, rejected, withdrawn) |
| `reviewed_by` | UUID | NULL | FK → hr_profiles(id) |
| `reviewed_at` | TIMESTAMPTZ | NULL | — |
| `reviewer_comment` | TEXT | NULL | — |
| `created_at` | TIMESTAMPTZ | NOW() | — |

**Indexes:** `idx_hr_leave_requests_user` ON (user_id, status)

---

### hr_rectification_requests

Requests to correct attendance records (missed punch, wrong time, etc.).

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `user_id` | UUID | — | NOT NULL, FK → hr_profiles(id) ON DELETE CASCADE |
| `attendance_date` | DATE | — | NOT NULL |
| `attendance_id` | UUID | NULL | FK → hr_attendance(id) ON DELETE SET NULL |
| `rectification_type` | TEXT | — | NOT NULL, CHECK IN (missed_punch_in, missed_punch_out, wrong_time, other) |
| `original_punch_in` | TIMESTAMPTZ | NULL | — |
| `original_punch_out` | TIMESTAMPTZ | NULL | — |
| `corrected_punch_in` | TIMESTAMPTZ | NULL | — |
| `corrected_punch_out` | TIMESTAMPTZ | NULL | — |
| `corrected_status` | TEXT | NULL | CHECK IN (present, late, half-day) |
| `reason` | TEXT | — | NOT NULL |
| `status` | TEXT | `'pending'` | NOT NULL, CHECK IN (pending, approved, rejected) |
| `reviewed_by` | UUID | NULL | FK → hr_profiles(id) |
| `reviewed_at` | TIMESTAMPTZ | NULL | — |
| `reviewer_comment` | TEXT | NULL | — |
| `created_at` | TIMESTAMPTZ | NOW() | — |

**Indexes:** `idx_hr_rectification_user` ON (user_id, status), `idx_hr_rectification_date` ON (attendance_date)

---

### hr_location_logs

GPS captures tied to attendance sessions.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `user_id` | UUID | — | NOT NULL, FK → hr_profiles(id) ON DELETE CASCADE |
| `attendance_id` | UUID | NULL | FK → hr_attendance(id) ON DELETE SET NULL |
| `lat` | DOUBLE PRECISION | — | NOT NULL |
| `long` | DOUBLE PRECISION | — | NOT NULL |
| `captured_at` | TIMESTAMPTZ | now() | NOT NULL |
| `source` | TEXT | — | NOT NULL, CHECK IN (punch_in, punch_out, scheduled, manual) |
| `created_at` | TIMESTAMPTZ | now() | NOT NULL |

**Indexes:** `idx_location_logs_user_captured` ON (user_id, captured_at), `idx_location_logs_attendance` ON (attendance_id)

---

### hr_notifications

In-app notifications for leave/rectification events and announcements.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `user_id` | UUID | — | NOT NULL, FK → hr_profiles(id) ON DELETE CASCADE |
| `title` | TEXT | — | NOT NULL |
| `body` | TEXT | NULL | — |
| `type` | TEXT | — | NOT NULL, CHECK IN (leave_request, leave_approved, leave_rejected, leave_withdrawn, rectification_request, rectification_approved, rectification_rejected, system, announcement) |
| `reference_id` | UUID | NULL | — |
| `reference_type` | TEXT | NULL | — |
| `is_read` | BOOLEAN | false | — |
| `created_at` | TIMESTAMPTZ | now() | — |

---

### hr_onboarding_tokens

One-time tokens for employee self-registration links (7-day expiry).

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `token` | TEXT | — | NOT NULL, UNIQUE |
| `created_by` | UUID | NULL | FK → auth.users(id) |
| `expires_at` | TIMESTAMPTZ | NOW() + 7 days | NOT NULL |
| `used_at` | TIMESTAMPTZ | NULL | — |
| `created_at` | TIMESTAMPTZ | NOW() | NOT NULL |

---

### hr_config

Key-value store for application settings (e.g., HR policy PDF URL).

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `key` | TEXT | — | NOT NULL, UNIQUE |
| `value` | TEXT | NULL | — |
| `updated_by` | UUID | NULL | FK → auth.users(id) |
| `updated_at` | TIMESTAMPTZ | NOW() | NOT NULL |

---

### hr_master_data

Master lists for projects, departments, and designations.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `type` | TEXT | — | NOT NULL, CHECK IN (project, department, designation) |
| `name` | TEXT | — | NOT NULL |
| `external_url` | TEXT | NULL | — |
| `is_active` | BOOLEAN | true | NOT NULL |
| `created_at` | TIMESTAMPTZ | now() | NOT NULL |

**Constraints:** UNIQUE (type, name)

---

### hr_leave_policies

Named leave quota templates assignable to employees.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `name` | TEXT | — | NOT NULL, UNIQUE |
| `sick_leave_count` | INTEGER | 0 | NOT NULL |
| `casual_leave_count` | INTEGER | 0 | NOT NULL |
| `privilege_leave_count` | INTEGER | 0 | NOT NULL |
| `is_active` | BOOLEAN | true | NOT NULL |
| `created_at` | TIMESTAMPTZ | now() | NOT NULL |

---

### hr_messages

Anonymous or identified messages from employees to HR.

| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `sender_id` | UUID | — | NOT NULL, FK → auth.users(id) |
| `category` | TEXT | — | NOT NULL, CHECK IN (complaint, suggestion, feedback, other) |
| `subject` | TEXT | — | NOT NULL |
| `message` | TEXT | — | NOT NULL |
| `is_anonymous` | BOOLEAN | true | NOT NULL |
| `is_read` | BOOLEAN | false | NOT NULL |
| `created_at` | TIMESTAMPTZ | now() | NOT NULL |

---

### pincode_master

Pre-loaded Indian pincode reference data (24,860 rows). Used for address lookups. Not HR-managed.

---

## Entity Relationships

```
hr_profiles
  ├── id (PK) ← hr_attendance.user_id
  ├── id (PK) ← hr_leave_balances.user_id
  ├── id (PK) ← hr_leave_requests.user_id
  ├── id (PK) ← hr_rectification_requests.user_id
  ├── id (PK) ← hr_location_logs.user_id
  ├── id (PK) ← hr_notifications.user_id
  ├── reporting_manager_id → hr_profiles.id (self-referential)
  └── leave_policy_id → hr_leave_policies.id

hr_attendance
  ├── id (PK) ← hr_rectification_requests.attendance_id
  └── id (PK) ← hr_location_logs.attendance_id

hr_leave_requests
  └── reviewed_by → hr_profiles.id

hr_rectification_requests
  └── reviewed_by → hr_profiles.id

hr_messages
  └── sender_id → auth.users.id

hr_onboarding_tokens
  └── created_by → auth.users.id
```

---

## RLS Policies Summary

All tables have RLS enabled. API route handlers use the **service role key** (bypasses RLS), so these policies primarily affect direct client-side Supabase queries.

| Table | Own Data | Manager Access | Admin Access | Public Access |
|-------|----------|----------------|--------------|---------------|
| hr_profiles | SELECT, UPDATE own row | SELECT reports | ALL via hr_is_admin() | — |
| hr_attendance | SELECT, INSERT, UPDATE own | SELECT reports | ALL via hr_is_admin() | — |
| hr_leave_balances | SELECT, UPDATE own | SELECT, UPDATE reports | ALL via hr_is_admin() | — |
| hr_leave_requests | SELECT, INSERT own; UPDATE own pending | SELECT, UPDATE reports | ALL via hr_is_admin() | — |
| hr_rectification_requests | SELECT, INSERT own | SELECT, UPDATE reports | ALL via hr_is_admin() | — |
| hr_location_logs | SELECT, INSERT own | SELECT reports | ALL (admin role check) | — |
| hr_notifications | SELECT, UPDATE own | — | ALL via hr_is_admin() | INSERT (any authenticated) |
| hr_onboarding_tokens | — | — | INSERT, SELECT, DELETE | SELECT, UPDATE (anon — for token validation) |
| hr_config | SELECT (any authenticated) | — | INSERT, UPDATE (admin role) | — |
| hr_master_data | ALL (open policy) | ALL (open policy) | ALL (open policy) | — |
| hr_leave_policies | ALL (open policy) | ALL (open policy) | ALL (open policy) | — |
| hr_messages | INSERT own, SELECT own | — | SELECT, UPDATE (admin/super_admin) | — |

---

## Database Functions

### hr_update_updated_at()

- **Returns:** TRIGGER
- **Language:** plpgsql
- **Purpose:** Sets `NEW.updated_at = NOW()` on every row update.
- **Used by:** Triggers on `hr_profiles` and `hr_leave_balances`.

### hr_is_admin()

- **Returns:** BOOLEAN
- **Language:** SQL, SECURITY DEFINER, STABLE
- **Purpose:** Returns `true` if the current authenticated user has role `admin` or `super_admin`. Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion when called from RLS policies.

### hr_is_manager_of(employee_id UUID)

- **Returns:** BOOLEAN
- **Language:** SQL, SECURITY DEFINER, STABLE
- **Purpose:** Returns `true` if the given employee's `reporting_manager_id` equals `auth.uid()`.

---

## Storage Buckets

### avatars (public read)

User profile photos. Files organized by user ID folder.

| Policy | Who | Rule |
|--------|-----|------|
| INSERT | Authenticated | Own folder only (path starts with auth.uid()) |
| SELECT | Public | Anyone can read |
| UPDATE | Authenticated | Own folder only |
| DELETE | Authenticated | Own folder only |

### leave-attachments (public read)

Documents attached to leave requests.

| Policy | Who | Rule |
|--------|-----|------|
| INSERT | Authenticated | Any authenticated user |
| SELECT | Public | Anyone can read |
| DELETE | Authenticated | Any authenticated user |

### policy-documents (public read)

HR policy PDFs uploaded by admins.

| Policy | Who | Rule |
|--------|-----|------|
| INSERT | Authenticated | Any authenticated user |
| SELECT | Public | Anyone can read |
| DELETE | Authenticated | Any authenticated user |

---

## Migration History

| # | File | Summary |
|---|------|---------|
| 001 | Initial schema | Core tables: profiles, attendance, leave_balances, leave_requests, location_logs |
| 002 | Rectification + notifications | Added hr_rectification_requests, hr_notifications |
| 003 | Profile fields | Added employee_code, address, city, state, pincode to profiles |
| 004 | RLS refinements | Updated policies for manager/admin access patterns |
| 005 | Review comments | Added reviewer_comment to leave_requests and rectification_requests |
| 006 | Leave defaults swap | Corrected sick=5, casual=10 (was reversed) |
| 007 | Onboarding tokens | Added hr_onboarding_tokens, hr_config; avatars + leave-attachments buckets |
| 008 | Onboarding anon access | Added anon SELECT/UPDATE policies on onboarding_tokens |
| 009 | Privilege leave | Added privilege_leave_total/used to leave_balances |
| 010 | Privilege default zero | Changed privilege_leave_total default from 15 to 0 |
| 011 | Soft delete + deactivation | Added deactivated_at to profiles; updated hr_is_admin() for super_admin |
| 012 | Onboarding policy fix | Fixed duplicate/conflicting RLS on onboarding_tokens |
| 013 | Onboarding cleanup | Final cleanup of onboarding_tokens policies |
| 014 | POS cleanup | Dropped 75 legacy POS tables, views, and ~100 RPC functions |
| 015 | Leave policies + master data | Added hr_leave_policies, hr_master_data, hr_messages; leave_policy_id on profiles; policy-documents bucket |
| 016 | (Latest) | Additional refinements |
