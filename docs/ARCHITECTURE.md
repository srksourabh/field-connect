# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  React App  │  │  SW.js   │  │  localStorage     │  │
│  │  (Next.js)  │  │  (Cache) │  │  (Sync Queue,     │  │
│  │             │  │          │  │   Punch State,     │  │
│  │             │  │          │  │   Offline Cache)   │  │
│  └──────┬──────┘  └──────────┘  └───────────────────┘  │
└─────────┼───────────────────────────────────────────────┘
          │ HTTPS
          ▼
┌─────────────────────────────────────────────────────────┐
│                 Vercel (Edge + Serverless)                │
│  ┌─────────────┐  ┌─────────────────────────────────┐   │
│  │ Middleware   │  │  API Route Handlers             │   │
│  │ (JWT check) │  │  /api/admin/*, /api/team, etc.  │   │
│  └─────────────┘  └──────────────┬──────────────────┘   │
└──────────────────────────────────┼──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────┐
          ▼                        ▼                ▼
┌──────────────┐  ┌────────────────────┐  ┌──────────────┐
│  Supabase    │  │  Supabase          │  │  Supabase    │
│  Auth        │  │  PostgreSQL        │  │  Storage     │
│  (Users,     │  │  (12 hr_* tables,  │  │  (avatars,   │
│   Sessions)  │  │   RLS policies,    │  │   leave-     │
│              │  │   functions)       │  │   attachments│
└──────────────┘  └────────────────────┘  │   policy-    │
                                          │   documents) │
                                          └──────────────┘
          ┌─────────────────────────────────┐
          │  External APIs                   │
          │  • Google Maps (reverse geocode) │
          │  • Google Roads (snap to roads)  │
          └─────────────────────────────────┘
```

## Directory Layout

```
Field Connect/
├── docs/                    # Documentation (this folder)
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker (network-first, cache fallback)
│   ├── register-sw.js       # SW registration script
│   ├── offline.html         # Offline fallback page
│   └── icons/               # PWA icons
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout (fonts, metadata, SW registration)
│   │   ├── page.tsx         # Landing page (public marketing)
│   │   ├── login/           # Login page
│   │   ├── onboard/[token]/ # Public self-onboarding form
│   │   ├── dashboard/
│   │   │   ├── layout.tsx   # Auth guard, sidebar, bottom nav
│   │   │   ├── page.tsx     # Main dashboard (punch, clock, activity)
│   │   │   ├── attendance/  # Calendar view + rectification form
│   │   │   ├── leave/       # Leave balance, apply, history
│   │   │   ├── profile/     # User profile + settings
│   │   │   ├── team/        # Organogram, tracking map, approvals
│   │   │   ├── reports/     # CSV report generation
│   │   │   ├── analytics/   # Charts, trends, insights
│   │   │   ├── admin/       # Employee mgmt, map, notifications
│   │   │   ├── onboarding/  # Token generation
│   │   │   ├── organisation/# Master data, leave policies, HR inbox
│   │   │   ├── my-projects/ # Project list
│   │   │   ├── message-hr/  # Anonymous HR messaging
│   │   │   └── qr/          # QR check-in (placeholder)
│   │   └── api/             # Server-side route handlers (21 routes)
│   ├── components/
│   │   ├── punch/           # PunchCard, AnalogClock, SessionTimeline
│   │   ├── attendance/      # AttendanceCalendar, DayDetail
│   │   ├── leave/           # LeaveForm, LeaveHistory, BalanceCards
│   │   ├── team/            # Organogram, EmployeeDetailSheet
│   │   ├── tracking/        # LiveMap, AdminLiveMap, EmployeeInfoCard
│   │   ├── reports/         # ReportFilters, ReportTable
│   │   ├── approvals/       # LeaveRequestCard, RectificationCard
│   │   ├── onboarding/      # OnboardingForm steps
│   │   ├── analytics/       # Charts (Trend, Distribution, Breakdown)
│   │   └── ui/              # Shared: Dialog, Toast, PWAInstall, etc.
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Data layer, auth, utilities
│   └── styles/
│       └── globals.css      # Tailwind + custom uds-* utilities
├── supabase/
│   └── migrations/          # 16 SQL migration files
├── stitch/                  # Design reference (PNGs + HTML mockups)
├── next.config.mjs          # Security headers, image domains
├── vercel.json              # Deployment config
├── package.json
├── tsconfig.json
└── CLAUDE.md                # AI assistant instructions
```

## Key Patterns

### Authentication Flow

1. **Login:** User enters phone number + password. The app constructs the auth email as `{phone}@fieldconnect.local` and calls `supabase.auth.signInWithPassword()`.
2. **Cookie sync:** On successful login, `AuthProvider` encodes the session as a base64 cookie (`sb-*-auth-token`) with `max-age` derived from `session.expires_at`.
3. **Middleware:** Edge middleware on `/dashboard/*` routes parses the cookie, decodes the JWT, checks expiry. Expired/missing tokens redirect to `/login`.
4. **Profile fetch:** `AuthProvider` fetches the user's `hr_profiles` row and caches it in localStorage for offline use.
5. **Single-device enforcement:** New login creates a new session; old sessions on other devices are invalidated by Supabase's default session behavior.
6. **Logout:** Clears the Supabase session, removes the auth cookie, and redirects to `/login`.

### Role System (isUniversal Pattern)

Four roles exist: `employee`, `manager`, `admin`, `super_admin`.

The `isUniversal` check grants cross-project access:
```typescript
const isUniversal =
  profile?.role === "super_admin" ||
  (profile?.designation?.toLowerCase().includes("hr") &&
    ["admin", "super_admin"].includes(profile?.role || ""));
```

- **Super Admin:** Full access to everything, all projects.
- **HR-designated Admin:** Same access as Super Admin for organization/policy features, but cannot assign `admin`/`super_admin` roles.
- **Admin:** Project-scoped — sees only employees in their `project_id`.
- **Manager:** Sees direct reports (employees whose `reporting_manager_id` matches).
- **Employee:** Sees only their own data.

### Offline Sync

The app works offline through three mechanisms:

1. **Service Worker (sw.js):** Caches static assets and the app shell. Navigation falls back to cached pages; API calls are network-only.
2. **Sync Queue (localStorage):** When offline, punch-in/out, location logs, and leave requests are queued in `uds_sync_queue`. The `useSyncQueue` hook flushes the queue when online (on mount, on reconnect, every 30 seconds). Items that fail 5 times are moved to dead-letter storage.
3. **Offline Cache:** Profile data, leave balances, and punch state are cached per-user in localStorage. The app restores from cache when the server is unreachable.

### PWA Service Worker

- **Cache version:** `20260226` (update on each deploy)
- **Install:** Pre-caches `/`, `/dashboard`, manifest, icons, offline fallback
- **Fetch strategy:** Network-first for navigation and static assets with cache fallback. API routes (`/api/`) are network-only (never cached).
- **Activation:** Old caches are cleaned on activate.

### Location Tracking

GPS is captured at multiple points:

1. **Punch in/out:** GPS coordinates stored with the attendance record.
2. **Scheduled captures:** The `useLocationTracker` hook captures GPS at 5 daily time slots (09:30, 10:00, 13:00, 16:00, 19:00 IST) with a 5-minute tolerance window. Only active while punched in.
3. **Manual refresh:** User can trigger a location refresh from the dashboard.

Location logs are written to `hr_location_logs`. If offline, they're queued for sync.

## Data Flows

### Punch In

```
User slides "Punch In"
  → useGeolocation captures GPS + reverse geocode
  → createPunchIn() inserts hr_attendance row
  → insertLocationLog() inserts hr_location_logs row (source: punch_in)
  → usePunchState starts 1-second UI timer
  → localStorage persists punch state every 60 seconds
  → useLocationTracker begins scheduled GPS captures
```

### Leave Approval

```
Employee submits leave request
  → hr_leave_requests row created (status: pending)
  → Notification sent to reporting manager

Manager approves
  → POST /api/admin/leave-action { requestId, action: "approve" }
  → Check for overlapping approved leaves
  → Deduct days from hr_leave_balances (optimistic concurrency)
  → Create hr_attendance records with status "on-leave" for each leave day
  → Send notification to employee
  → If balance deduction fails (concurrent edit) → roll back approval, return 409
```

### Rectification

```
Employee requests attendance correction
  → hr_rectification_requests row created (status: pending)
  → Notification sent to reporting manager

Manager approves
  → POST /api/admin/rectification-action { requestId, action: "approve" }
  → Update (or insert) hr_attendance with corrected times + status
  → Propagate corrected status to all sessions on the same date
  → Send notification to employee
```

## Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser | Supabase anonymous/public key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase admin key (bypasses RLS) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser | Reverse geocoding addresses from GPS |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Browser | AI features |

## Deployment (Vercel)

**Config (`vercel.json`):**
```json
{ "framework": "nextjs" }
```

**`next.config.mjs` security headers (applied to all routes):**

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(self), camera=(self)` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Powered-By` | Removed |

**Image domains:** `mzwmebrwmxhfyohulddl.supabase.co` (Supabase Storage)

**Auto-deploy:** Pushes to `main` branch trigger automatic Vercel deployment.
