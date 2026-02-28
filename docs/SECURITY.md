# Security Documentation

## Authentication

### Login Flow

1. User enters their **phone number** and **password** on the login page.
2. The app constructs an auth email: `{phone}@uds.hr` (e.g., `9876543210@uds.hr`).
3. Calls `supabase.auth.signInWithPassword({ email, password })`.
4. On success, the session is stored in a cookie (`sb-*-auth-token`) with `max-age` computed from `session.expires_at`.
5. The `AuthProvider` context loads the user's `hr_profiles` row and caches it in localStorage.

### Default Credentials

- **Email (auth):** `{phone}@uds.hr`
- **Password:** First 4 characters of name (lowercase, spaces removed) + last 4 digits of phone number.
- Example: Name "Sourabh Bhaumik", Phone "9876543210" → email `9876543210@uds.hr`, password `sour3210`.

All account creation paths (add-employee, onboarding, repair-accounts) enforce this convention.

### Single-Device Enforcement

Only one active session is maintained per user. Logging in on a new device creates a new session; the previous session is implicitly invalidated. Admin actions like password reset and deactivation explicitly invalidate all sessions via `supabaseAdmin.auth.admin.deleteUser()` / session invalidation.

### Stale Session Handling

- **Login page:** On mount, clears any stale Supabase session from localStorage to prevent redirect loops.
- **Middleware:** If the auth cookie JWT is expired or malformed, the cookie is cleared and the user is redirected to `/login`.
- **Auth cookie:** Uses `session.expires_at` (UTC epoch) to compute the remaining lifetime for `max-age`, ensuring the cookie expires when the session does.

### Password Reset

Two mechanisms:
1. **Admin Reset** (`/api/admin/reset-password`): Admin resets an employee's password to the default. Also fixes auth email to `phone@uds.hr` and invalidates all sessions.
2. **Self-Service** (`/api/forgot-password`): Employee verifies their identity using their personal email on file, then password is reset to default.

---

## Authorization

### Role Hierarchy

| Role | Scope | Capabilities |
|------|-------|-------------|
| `employee` | Own data only | Punch, attendance, leave, profile, team view (peers + descendants) |
| `manager` | Direct reports | All employee features + approve/reject leave & rectification, team tracking, reports, analytics |
| `admin` | Project-scoped | All manager features + employee management, leave allotment, onboarding, admin map |
| `super_admin` | All projects | All admin features + role escalation, master data, leave policies, notifications, HR inbox |

### The isUniversal Pattern

A user is "universal" (cross-project access) if:
```typescript
role === "super_admin" || (designation includes "hr" && role is admin or super_admin)
```

Universal users bypass project scoping in all API routes and client-side queries.

### Role Escalation Protection

- Only `super_admin` can assign `admin` or `super_admin` roles (in add-employee, edit-employee, and update-role endpoints).
- HR-designated admins have broad access but **cannot** assign admin-level roles.
- Users cannot change their own role, designation, or project via the edit-employee endpoint.

### Page-Level Access Control

Pages check the user's role from `AuthProvider` context and render "Access Denied" messages for unauthorized roles. This is a UI-level guard — the true enforcement happens at the API layer.

---

## API Route Security

### Authentication Pattern

Every protected API route follows this pattern:

```
1. Extract Bearer token from Authorization header
2. Validate token: supabaseAdmin.auth.getUser(token)
3. Load caller's hr_profiles row
4. Verify caller is not deactivated (.is("deactivated_at", null))
5. Check role/project requirements for the specific endpoint
6. Execute the operation using supabaseAdmin (bypasses RLS)
```

All routes use try/catch on `req.json()` to handle malformed request bodies.

### Project Scoping

Non-universal admin routes filter results by the caller's `project_id`. For example, the dashboard map only returns employees matching the admin's project.

### Approval Authorization

Leave and rectification approval routes verify the caller is either:
- The employee's `reporting_manager_id`, OR
- A `super_admin`, OR
- An admin with HR designation

### Optimistic Concurrency

Leave approval uses optimistic concurrency control on `hr_leave_balances`:
```sql
UPDATE hr_leave_balances SET sick_leave_used = X
WHERE user_id = ? AND year = ? AND sick_leave_used = current_value
```
If the `WHERE` clause matches 0 rows (another approval happened concurrently), the operation returns a 409 conflict error and rolls back.

### Atomic Token Claims

Onboarding token claim uses `.is("used_at", null)` as a WHERE condition:
```sql
UPDATE hr_onboarding_tokens SET used_at = NOW()
WHERE token = ? AND used_at IS NULL
```
This prevents race conditions where two users could claim the same token.

---

## Row-Level Security (RLS)

All 12 tables have RLS enabled. Policies enforce:

- **Own data:** Users can read/write their own records.
- **Manager access:** Managers can read (and sometimes update) records of their direct reports via `hr_is_manager_of()`.
- **Admin access:** Admins and super_admins have full access via `hr_is_admin()`.
- **Public access:** Onboarding tokens allow anonymous SELECT/UPDATE for the public registration form.

**Important:** API route handlers use the **service role key** (`supabaseAdmin`), which bypasses RLS entirely. RLS policies primarily protect against direct client-side Supabase queries from the browser.

### Security-Definer Functions

Two functions use `SECURITY DEFINER` to bypass RLS within policy evaluation (prevents infinite recursion):
- `hr_is_admin()` — checks if the current user has role `admin` or `super_admin`.
- `hr_is_manager_of(employee_id)` — checks if the given employee reports to the current user.

---

## Middleware

**File:** `src/middleware.ts`

Runs on all `/dashboard/*` and `/login` routes at the edge:

1. Parses the Supabase auth cookie.
2. Decodes the JWT and checks expiry locally (no network call for speed).
3. **Unauthenticated on dashboard:** Redirect to `/login`.
4. **Authenticated on login:** Redirect to `/dashboard` (validates token first to prevent redirect loops).
5. **Malformed cookie:** Clears the cookie and redirects to `/login`.

---

## Security Headers

Applied to all routes via `next.config.mjs`:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking by blocking iframe embedding |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer information to same-origin requests |
| `Permissions-Policy` | `geolocation=(self), camera=(self)` | Restricts GPS and camera to the app's own origin |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS for 1 year |
| `X-Powered-By` | (removed) | Hides the tech stack from attackers |

---

## Data Protection

### Deactivated Users

- Deactivation sets `deactivated_at` on the profile (soft delete — data is preserved).
- All active sessions are invalidated immediately.
- Every API route checks `.is("deactivated_at", null)` on the caller's profile before proceeding.
- Deactivated users cannot log in (their auth session is invalidated, and any new token validation will find the deactivated flag).
- Admins can restore deactivated users, which clears `deactivated_at` and allows re-login.

### Session Invalidation

Sessions are invalidated in these scenarios:
- Password reset (admin or self-service)
- Deactivation
- Bulk account repair
- New login from another device (implicit — Supabase single-session behavior)

### Storage Bucket Security

| Bucket | Read | Write | Delete |
|--------|------|-------|--------|
| `avatars` | Public | Own folder only | Own folder only |
| `leave-attachments` | Public | Any authenticated | Any authenticated |
| `policy-documents` | Public | Any authenticated | Any authenticated |

Files in `avatars` are scoped to user ID folders. Leave attachments and policy documents are not user-scoped (any authenticated user can upload/delete).

### Anonymous Messaging

The "Message HR" feature defaults to anonymous mode. When anonymous:
- The message is stored with the `sender_id` (for deduplication) but displayed without the sender's name.
- Only super_admin/HR users can view messages.
- The sender can also view their own messages.

### CSV Injection Protection

The `exportToCsv` utility sanitizes all cell values to prevent CSV injection attacks (cells starting with `=`, `+`, `-`, `@`, `\t`, `\r` are prefixed with a single quote).

---

## Environment Variable Security

| Variable | Exposure | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser (public) | Safe — this is the public project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser (public) | Safe — RLS enforces access control |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never exposed to browser. Used in API routes only. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser (public) | Should be restricted by HTTP referrer in Google Cloud Console |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Browser (public) | Should be restricted by API key restrictions |

The Google Roads API key is **not** exposed to the browser. The `/api/snap-to-roads` route acts as a server-side proxy, keeping the key in the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable on the server.
