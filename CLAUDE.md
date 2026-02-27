# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

UDS-HR is a mobile-first PWA for field workforce HR management (punch in/out, attendance, leave, live tracking, team management). It shares a Supabase database with the UDS-POS project. Deployed on Vercel.

## Commands

All commands run from the project root:

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (use as verification step)
npm run lint     # ESLint check
npm run start    # Start production server
```

No test runner is configured. Playwright is installed as a devDependency but has no scripts or config.

## Architecture

### Directory Layout (`src/`)

- `app/` — Next.js 14 App Router pages. All dashboard pages are `"use client"`.
- `app/api/` — Server-side route handlers (admin operations, analytics, onboarding). Use Bearer token auth from Supabase.
- `components/` — Feature-organized: `punch/`, `attendance/`, `leave/`, `team/`, `tracking/`, `reports/`, `approvals/`, `onboarding/`, `analytics/`, `ui/` (shared).
- `hooks/` — `usePunchState` (localStorage-backed timer), `useGeolocation` (GPS + Google Maps geocoding), `useOnlineStatus`, `useSyncQueue`, `useLocationTracker` (scheduled GPS capture at 5 daily time slots).
- `lib/` — Data layer (`*-api.ts` files per domain), auth context (`auth.tsx`), Supabase clients, offline sync queue, role helpers, utilities.

### Key Patterns

**Auth**: Email format is `${phone}@uds.hr`. Default password: first 4 chars of name + last 4 digits of phone. Single-device sessions (new login kicks out previous). Auth state managed via `AuthProvider` context wrapping the dashboard layout. Middleware checks `sb-*-auth-token` cookie.

**Supabase**: Two clients — `supabase.ts` (browser, untyped `createClient` without generic) and `supabase-admin.ts` (server-only, uses service role key). All tables prefixed `hr_`. RLS enforced. Types in `database.types.ts`.

**Offline Sync**: Actions queued in localStorage (`uds_sync_queue`), flushed automatically when online via `useSyncQueue` hook. Queue item types: `punch_in`, `punch_out`, `location_log`.

**Roles**: `employee`, `manager`, `admin`, `super_admin`. HR designation grants universal access. Admins scoped to their `project_id` unless super_admin/HR.

**Leaflet Maps**: Uses `react-leaflet@4` for React 18 compat. Must be dynamically imported (SSR-unsafe).

### Database Schema (migrations in `supabase/migrations/`)

9 tables: `hr_profiles`, `hr_attendance`, `hr_leave_balances`, `hr_leave_requests`, `hr_location_logs`, `hr_rectification_requests`, `hr_onboarding_tokens`, `hr_notifications`, `hr_config`.

## Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **CSS classes**: Custom utilities prefixed `uds-` (e.g., `uds-card`, `uds-btn-primary`, `uds-input`) defined in `globals.css`
- **Design tokens**: Primary `#137fec`, Dark BG `#101922`, Light BG `#f6f7f8`, Surface Dark `#1c2a36`. Font: Inter. Cards: `rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50`.
- **Dark mode**: Tailwind `class` strategy (`dark:` variants). No toggle UI currently implemented.
- **Icons**: `lucide-react` exclusively.
- **Dates**: `date-fns` for formatting and manipulation.
- **No state library**: React Context + useState + custom hooks only.
- **No form library**: Vanilla controlled inputs.

## Design Reference

Stitch design screens are at `stitch/images/` (10 PNGs) and `stitch/code/` (10 HTML files). Use these as the source of truth for UI implementation.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project (shared with UDS-POS)
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side admin operations
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Reverse geocoding
- `NEXT_PUBLIC_GEMINI_API_KEY` — AI features
