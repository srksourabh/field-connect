# API Reference

All API routes are under `src/app/api/`. Server-side route handlers run on Vercel serverless functions. Unless noted, all routes require a Bearer token in the `Authorization` header (the Supabase access token).

Auth verification pattern: The route extracts the token, calls `supabaseAdmin.auth.getUser(token)` to validate, then loads the caller's `hr_profiles` row to check role, project, and deactivation status.

---

## Auth & Public

### POST /api/forgot-password

Self-service password reset (no auth required).

**Step 1 — Lookup:**
```json
// Request
{ "phone": "9876543210", "step": "lookup" }

// Response 200
{ "masked_email": "so***bh@gm***il.com" }
```

**Step 2 — Verify:**
```json
// Request
{ "phone": "9876543210", "email": "user@gmail.com", "step": "verify" }

// Response 200
{ "success": true }
```

Resets password to default format (first 4 of name + last 4 of phone) and invalidates all sessions.

| Error | When |
|-------|------|
| 400 | Invalid phone, no personal email on file, email mismatch, invalid step |
| 404 | No account found for phone |
| 500 | Server error |

---

### POST /api/onboard

Employee self-registration via one-time token (no auth required).

```json
// Request
{
  "token": "abc123",
  "personal": { "fullName": "Jane Doe", "email": "jane@gmail.com", "phone": "9876543210", "address": "..." },
  "kyc": { "aadhaar": "...", "pan": "...", "bankName": "...", "accountNo": "...", "ifsc": "..." },
  "job": { "department": "Engineering", "project": "Site A", "designation": "Supervisor", "joiningDate": "2026-03-01" }
}

// Response 200
{ "success": true, "message": "Account created for Jane Doe." }
```

Creates Supabase auth user (`phone@uds.hr`), profile row (always `employee` role), and blank leave balance. Token is atomically claimed (prevents race conditions).

| Error | When |
|-------|------|
| 400 | Missing fields, invalid/expired/used token, name or phone too short |
| 500 | Server error (orphaned auth user cleaned up on failure) |

---

## Employee Management

### POST /api/admin/add-employee

**Auth:** admin+ (super_admin required to assign admin/super_admin roles)

```json
// Request
{
  "fullName": "Jane Doe", "email": "jane@gmail.com", "phone": "9876543210",
  "designation": "Supervisor", "department": "Engineering", "project": "Site A",
  "role": "employee", "reportingManagerId": "uuid"
}

// Response 200
{ "success": true, "message": "Jane Doe added successfully." }
```

Creates auth user, profile, and blank leave balance.

| Error | When |
|-------|------|
| 400 | Missing required fields, name or phone too short |
| 403 | Not admin, or role escalation attempt by non-super_admin |
| 500 | Auth or DB error |

---

### PATCH /api/admin/edit-employee

**Auth:** admin+ (project-scoped for regular admin)

```json
// Request
{
  "userId": "uuid",
  "full_name": "Jane Smith", "phone": "9876543211", "designation": "Manager",
  "department": "Operations", "project_id": "Site B", "role": "manager",
  "email": "jane@gmail.com", "reporting_manager_id": "uuid",
  "date_of_joining": "2025-01-15", "employee_code": "EMP001",
  "address": "...", "city": "Mumbai", "state": "MH", "pincode": "400001",
  "leave_policy_id": "uuid"
}

// Response 200
{ "success": true }
```

If `phone` changes, syncs auth email to `newPhone@uds.hr`. If `leave_policy_id` is set, upserts leave balances from the policy.

| Error | When |
|-------|------|
| 400 | Missing userId, invalid role, no valid fields |
| 403 | Not admin, role escalation, self-edit restricted fields |
| 500 | Server error |

---

### POST /api/admin/update-role

**Auth:** admin+ (super_admin required for admin/super_admin assignment)

```json
// Request
{ "userId": "uuid", "newRole": "manager" }

// Response 200
{ "success": true, "role": "manager" }
```

| Error | When |
|-------|------|
| 400 | Missing/invalid fields |
| 403 | Role escalation attempt |

---

### POST /api/admin/deactivate-employee

**Auth:** admin+ (project-scoped for regular admin)

```json
// Request
{ "userId": "uuid", "restore": false }

// Response 200
{ "success": true, "message": "Employee deactivated" }
```

Soft-deactivates by setting `deactivated_at`. Pass `restore: true` to reactivate. Invalidates all sessions on deactivation.

| Error | When |
|-------|------|
| 400 | Missing userId, self-deactivation attempt |
| 403 | Not admin |

---

### POST /api/admin/reset-password

**Auth:** admin+ (non-super_admin cannot reset super_admin passwords)

```json
// Request
{ "userId": "uuid" }

// Response 200
{ "success": true }
```

Resets to default password, fixes auth email to `phone@uds.hr`, invalidates sessions.

| Error | When |
|-------|------|
| 400 | Missing userId, name or phone too short |
| 404 | User not found |

---

### POST /api/admin/repair-accounts

**Auth:** super_admin only

```json
// Response 200
{
  "summary": { "total": 131, "fixed": 120, "skipped": 5, "failed": 6 },
  "details": [{ "name": "Jane", "phone": "9876543210", "status": "fixed", "oldEmail": "...", "newEmail": "..." }]
}
```

Bulk-repairs all auth accounts. Run via curl (times out on Vercel for large user counts).

---

## Leave Management

### POST /api/admin/leave-action

**Auth:** Caller must be the employee's reporting manager, super_admin, or HR.

```json
// Request
{ "requestId": "uuid", "action": "approve", "comment": "Approved for family event" }

// Response 200
{ "success": true }
```

On approval: checks overlapping leaves, deducts from balance with optimistic concurrency, creates `on-leave` attendance records, notifies employee. On reject: updates status and notifies.

| Error | When |
|-------|------|
| 400 | Invalid action, overlapping leave, insufficient balance, not pending |
| 403 | Not authorized to approve |
| 409 | Concurrent balance update detected |

---

### GET /api/admin/leave-allotment

**Auth:** admin+

```
GET /api/admin/leave-allotment?year=2026
```

Returns all employees with their leave balance for the given year.

---

### POST /api/admin/leave-allotment

**Auth:** admin+

```json
// Request — bulk create missing balances
{ "year": 2026, "sick_total": 5, "casual_total": 10, "privilege_total": 15 }

// Response 200
{ "message": "Created 5 balance records", "created": 5 }
```

---

### PUT /api/admin/leave-allotment

**Auth:** admin+ (regular admins limited to compoff fields only)

```json
// Request — batch update
{
  "balance_ids": ["uuid1", "uuid2"],
  "updates": { "sick_leave_total": 10, "casual_leave_total": 12, "compoff_total": 2 }
}

// Response 200
{ "updated": 3, "failed": 0 }
```

---

### PATCH /api/admin/leave-allotment

**Auth:** admin+ (same field restrictions as PUT)

```json
// Request — single update
{ "balance_id": "uuid", "sick_leave_total": 10, "compoff_total": 1 }

// Response 200
{ "balance": { "...balance row..." } }
```

---

### GET /api/admin/leave-policies

**Auth:** super_admin or HR

```
GET /api/admin/leave-policies          # active only
GET /api/admin/leave-policies?all=true  # include inactive
```

Returns policies with employee count per policy.

---

### POST /api/admin/leave-policies

**Auth:** super_admin or HR

```json
// Request
{ "name": "Standard", "sick_leave_count": 5, "casual_leave_count": 10, "privilege_leave_count": 15 }

// Response 200
{ "policy": { "...policy row..." } }
```

---

### PATCH /api/admin/leave-policies

**Auth:** super_admin or HR

```json
// Request
{ "id": "uuid", "name": "Updated", "sick_leave_count": 7, "is_active": false }

// Response 200
{ "policy": { "...policy row..." } }
```

---

## Attendance & Rectification

### POST /api/admin/rectification-action

**Auth:** Caller must be the employee's reporting manager, super_admin, or HR.

```json
// Request
{ "requestId": "uuid", "action": "approve", "comment": "Verified with site supervisor" }

// Response 200
{ "success": true }
```

On approval: updates (or creates) attendance record with corrected times and status, propagates status to all sessions on the same date, notifies employee.

| Error | When |
|-------|------|
| 400 | Invalid action, not pending |
| 403 | Not authorized |
| 404 | Request not found |

---

## Tracking & Maps

### GET /api/admin/dashboard-map

**Auth:** admin+ (project-scoped for regular admin)

Returns all active employees with current GPS position, punch status, hours worked, distance traveled, and full GPS trail for today. Used by the admin map page.

```json
// Response 200
{
  "employees": [{
    "id": "uuid", "name": "Jane", "designation": "Supervisor",
    "lat": 28.6139, "lng": 77.2090, "status": "online",
    "totalHoursToday": 7.5, "totalDistanceKm": 12.3,
    "trail": [{ "lat": 28.6139, "lng": 77.2090, "time": "2026-02-28T09:30:00Z" }],
    "punchedInSince": "2026-02-28T09:00:00Z"
  }],
  "summary": { "total": 50, "present": 40, "onLeave": 3, "absent": 7 }
}
```

---

### GET /api/admin/team-locations

**Auth:** Any active user (scoped by role — peers + descendants via BFS)

Returns visible team members with GPS position, punch-in status, GPS trail, and `lastSeen` string. Used by the team tracking map.

```json
// Response 200
{
  "employees": [{
    "id": "uuid", "name": "Jane", "designation": "Supervisor",
    "lat": 28.6139, "lng": 77.2090, "status": "online",
    "lastSeen": "5 min ago", "punchedIn": true,
    "trail": [{ "lat": 28.6139, "lng": 77.2090 }]
  }]
}
```

---

### POST /api/snap-to-roads

**Auth:** Any active user

Server-side proxy for Google Roads API (keeps API key server-side).

```json
// Request
{ "positions": [[28.6139, 77.2090], [28.6150, 77.2100]] }

// Response 200
{ "snapped": [[28.6140, 77.2091], [28.6151, 77.2101]] }
```

Batches requests in groups of 100 points. Returns original positions on API error.

---

## Team & Organization

### GET /api/team

**Auth:** Any active user

Returns profile list for the organogram. Super_admin/HR get full tree; others get peers + descendants within their project.

```json
// Response 200
{
  "profiles": [{
    "id": "uuid", "full_name": "Jane", "designation": "Manager",
    "reporting_manager_id": "uuid", "phone": "987...",
    "city": "Mumbai", "department": "Ops", "project_id": "Site A"
  }],
  "scope": "full"
}
```

---

### GET /api/admin/master-data

**Auth:** admin+ (write operations require super_admin/HR)

```
GET /api/admin/master-data                      # all active items
GET /api/admin/master-data?type=project         # filter by type
GET /api/admin/master-data?all=true             # include inactive
```

### POST /api/admin/master-data

```json
{ "type": "project", "name": "Site A", "external_url": "https://..." }
```

### PATCH /api/admin/master-data

```json
{ "id": "uuid", "name": "Updated Name", "is_active": false }
```

### DELETE /api/admin/master-data

```json
{ "id": "uuid" }
```

Soft-deletes by setting `is_active = false`.

---

## Notifications

### POST /api/admin/broadcast-notification

**Auth:** super_admin or HR

```json
// Request
{
  "title": "Holiday Notice",
  "body": "Office closed on March 1st",
  "projects": ["Site A"],
  "designations": ["all"]
}

// Response 200
{ "success": true, "recipientCount": 42, "message": "Notification sent to 42 employees" }
```

| Error | When |
|-------|------|
| 400 | Missing title/body |
| 404 | No matching employees |

---

## HR Policy

### GET /api/admin/hr-policy

**Auth:** super_admin or HR

Returns current HR policy PDF URL.

### POST /api/admin/hr-policy

**Auth:** super_admin or HR

Upload: `multipart/form-data` with `file` field (PDF only, max 10 MB).

### DELETE /api/admin/hr-policy

**Auth:** super_admin or HR

Removes PDF from storage and clears config.

---

## Messaging

### POST /api/messages

**Auth:** Any active user

```json
{ "category": "complaint", "subject": "Safety concern", "message": "...", "is_anonymous": true }

// Response 200
{ "success": true, "id": "uuid" }
```

### GET /api/messages

**Auth:** super_admin or HR

```
GET /api/messages              # all messages
GET /api/messages?filter=unread&limit=50
```

### PATCH /api/messages

**Auth:** super_admin or HR

```json
{ "id": "uuid" }
```

Marks message as read.

---

## Analytics

### GET /api/analytics

**Auth:** manager+ (managers see direct reports; admins project-scoped; super_admin/HR see all)

```
GET /api/analytics?period=this_month
GET /api/analytics?period=last_month
GET /api/analytics?period=last_3_months
```

```json
// Response 200
{
  "summary": { "totalEmployees": 50, "presentToday": 40, "absentToday": 7, "onLeaveToday": 3, "inFieldNow": 12 },
  "attendance": { "avgHoursWorked": 7.2, "avgPunchInTime": "09:45", "lateCount": 8, "perfectAttendanceCount": 5 },
  "employeeStats": [{ "id": "uuid", "name": "Jane", "presentDays": 20, "absentDays": 2, "lateDays": 1, "avgHours": 7.5 }],
  "trends": [{ "date": "2026-01-15", "count": 38 }],
  "insights": [{ "type": "warning", "text": "5 employees punched in after 10 AM today" }],
  "punchInDistribution": [{ "hour": 9, "count": 25 }],
  "dayOfWeekPattern": [{ "day": "Mon", "avgPresent": 38, "avgHours": 7.1 }],
  "projectBreakdown": [{ "name": "Site A", "records": 100, "avgHours": 7.0, "latePercent": 15, "employees": 30 }],
  "departmentBreakdown": [{ "name": "Engineering", "records": 80, "avgHours": 7.2, "employees": 20 }],
  "weeklyComparison": [{ "week": "2026-01-13", "presentCount": 35, "avgHours": 6.9 }]
}
```

Late threshold: punch-in after 10:00 AM IST.

---

## Route Summary

| Route | Method(s) | Auth Required | Minimum Role |
|-------|-----------|---------------|-------------|
| `/api/forgot-password` | POST | No | Public |
| `/api/onboard` | POST | No | Public (token-based) |
| `/api/admin/add-employee` | POST | Yes | admin |
| `/api/admin/edit-employee` | PATCH | Yes | admin |
| `/api/admin/update-role` | POST | Yes | admin |
| `/api/admin/deactivate-employee` | POST | Yes | admin |
| `/api/admin/reset-password` | POST | Yes | admin |
| `/api/admin/repair-accounts` | POST | Yes | super_admin |
| `/api/admin/leave-action` | POST | Yes | reporting manager |
| `/api/admin/leave-allotment` | GET, POST, PUT, PATCH | Yes | admin |
| `/api/admin/leave-policies` | GET, POST, PATCH | Yes | super_admin / HR |
| `/api/admin/rectification-action` | POST | Yes | reporting manager |
| `/api/admin/dashboard-map` | GET | Yes | admin |
| `/api/admin/team-locations` | GET | Yes | any (scoped) |
| `/api/admin/master-data` | GET, POST, PATCH, DELETE | Yes | admin (GET) / super_admin (write) |
| `/api/admin/broadcast-notification` | POST | Yes | super_admin / HR |
| `/api/admin/hr-policy` | GET, POST, DELETE | Yes | super_admin / HR |
| `/api/messages` | GET, POST, PATCH | Yes | any (POST) / super_admin (GET, PATCH) |
| `/api/analytics` | GET | Yes | manager |
| `/api/snap-to-roads` | POST | Yes | any |
| `/api/team` | GET | Yes | any (scoped) |
