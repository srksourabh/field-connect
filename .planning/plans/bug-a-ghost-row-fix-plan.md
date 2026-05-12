# Implementation Plan: Bug A — Ghost-row merge inflation in attendance reports

**Author:** planner agent
**Date:** 2026-05-12
**Status:** READY for review (read-only investigation complete; live DB counts pending — see Investigation §5)

---

## 1. Investigation findings

### 1.1 Ghost-row creation pathways (4 distinct creators, 2 distinct signatures)

I traced every code path that INSERTs into `hr_attendance`. There are exactly 4 server-side creators outside the real-punch path (`src/lib/attendance-api.ts:createPunchIn`). Two of them produce "ghost" rows that can collide with real punch rows on the same IST date.

| # | File:line | Creator | Signature on insert | Status values used | Can co-exist with real punch? |
|---|-----------|---------|---------------------|--------------------|-------------------------------|
| 1 | `src/app/api/admin/leave-action/route.ts:198-205` | Manager approves leave (admin route) | `created_at` = `${date}T00:00:00+05:30`, `punch_in_at` = same (= **18:30 UTC prev day**), `punch_out_at` = **NULL** | `'on-leave'` (regular) or `'present'` (WFH, type=`wfh`) | YES — see plan |
| 2 | `src/lib/leave-api.ts:185-217` | Client-side leave approval (legacy path) | Same as #1 | `'on-leave'` only | Same as #1 |
| 3 | `src/app/api/admin/rectification-action/route.ts:114-158` | Manager approves rectification with no `corrected_punch_in/out` | `punch_in_at` = `${date}T09:00:00+05:30` (= **03:30 UTC**), `punch_out_at` = `${date}T18:00:00+05:30` (= **12:30 UTC**), `created_at` = `${date}T00:00:00+05:30` | `corrected_status \|\| 'present'` | **YES — this is the exact Apr 11 signature.** |
| 4 | `src/lib/rectification-api.ts:155-207` | Client-side rectification approval (legacy path) | Same as #3 | Same as #3 | Same as #3 |
| 5 | `src/app/api/admin/attendance-override/route.ts:121-135` | Manager/admin overrides status with no existing row | `punch_in_at` = `${date}T00:00:00+05:30` (= 18:30 UTC prev day), `punch_out_at` = NULL | various | Mostly safe |
| 6 | `src/app/api/cron/auto-punch-out/route.ts:58-62` | Vercel cron (00:00 IST) | UPDATEs existing open sessions only | n/a | n/a |

**Conclusion on creators:** The Apr 11 Rakesh signature is the **rectification-approval fallback path** (#3/#4), not WFH/leave. The user's hypothesis was slightly off — Bug A is primarily rectification ghosts.

### 1.2 `hr_attendance` schema — full column list

```
id, user_id, punch_in_at, punch_out_at,
punch_in_lat, punch_in_long, punch_out_lat, punch_out_long, total_distance_km,
status (CHECK: 'present','absent','late','half-day','on-leave','holiday','lwp'),
synced, created_at
```

**No distinguishing column exists.** No `source`/`record_type`/`created_by`/`auto_closed`. Status only partially helps for leave rows.

### 1.3 Merge logic in `reports/page.tsx` — exact failure mode

In `fetchAttendanceData` lines 230-255: min/max is taken across ALL rows for a (user, date) pair regardless of whether each row is a real punch or a ghost. 3-minute real punch + 9-hour rectification ghost merges to `firstIn = 03:30 UTC, lastOut = 12:30 UTC, hours = 9.0`. Then lines 272-278: `hours >= 8 → "present"`.

### 1.4 Other consumers — all affected to varying degrees

- `src/lib/attendance-api.ts:updateAttendanceStatus` — partially affected (same-day rectifications rare)
- `src/app/api/analytics/route.ts:81-100` — fully affected
- `src/app/api/admin/payroll/route.ts:188-218` — different bug shape (day-status first-write-wins), still has the issue
- `src/app/dashboard/profile/page.tsx:31-35` — mildly affected (counts only)

### 1.5 Live DB counts — TO BE EXECUTED BY PARENT AGENT (see prompt)

---

## 2. Options — comparison

| Dimension | Option A: Timestamp signature filter | Option B: Existing column | Option C: New `source` column | Option D: Fix creators |
|-----------|--------------------------------------|----------------------------|-------------------------------|------------------------|
| Schema change | No | No | Yes | No |
| Migration | No | No | Yes | Optional backfill |
| Files | 1-3 | n/a (column doesn't exist) | 6-8 | 2-4 |
| LOC | ~80-120 | n/a | ~250-350 | ~40-80 |
| Risk | Low | n/a | Medium | Low-Medium |
| Brittleness | Medium (creator drift) | n/a | Low | Low |
| Time to ship | ~2 hours | n/a | ~1 day | ~3 hours |

### Why ruled out: Option B (no column exists) ✗  Option D alone (doesn't fix historical ghosts) ✗  Option C (overkill for now) deferred

---

## 3. Recommendation: **Option A — ship now**, plus follow-up Option D in next sprint

Option A delivers an immediate, low-risk, reversible fix with ~80-120 LOC, brittleness mitigated by tying timestamps to a shared constant.

---

## 4. Detailed implementation plan — Option A

### 4.1 New utility `src/lib/attendance-ghost.ts` (~40 LOC)
`classifyGhost(rec): 'rectification' | 'leave' | 'wfh' | null` based on timestamp signature.

### 4.2 Merge fix in `reports/page.tsx` lines 229-289 (~60 LOC delta)
Two-pass merge: partition rows into realPunches and ghosts. If realPunches exist, use ONLY them for firstIn/lastOut/hours. If no real punches, fall back to ghost row's status.

### 4.3 Analytics route `src/app/api/analytics/route.ts` (~30 LOC delta)
Apply same classifyGhost filter to total hours / averages / present counts.

### 4.4 Payroll route — **defensive note only, no change in this PR**
Add `// TODO: see Bug A plan — payroll needs same ghost filter` comment. Payroll changes have financial implications and need explicit sign-off; deferred to follow-up.

### 4.5 No DB migration. No data deletion. No type changes.

### 4.6 Commits (3 commits, 1 PR)
1. `feat: add classifyGhost utility for non-real-punch detection`
2. `fix: exclude ghost rows from firstIn/lastOut merge in reports (Bug A)`
3. `fix: exclude ghost rows from analytics aggregation (Bug A)`
Plus 4th commit: SW cache bump.

### 4.7 Test plan
Unit tests in `scripts/test-classifyGhost.mjs` covering: real punch, rectification ghost, leave/WFH ghost, edge cases (real punch at exact 09:00:00.000 IST without 18:00 IST out → null).
Manual: Rakesh Apr 11 should now show correct status; spot-check 3 other users; verify WFH days still show present.

### 4.8 Rollback
Revert 3 commits. No DB state. SW cache bump forces refresh.

### 4.9 Deploy
1. Feature branch off `main`
2. Local build + lint
3. Code review
4. PR + admin merge (Vercel preview is pre-existing project-wide failure)
5. Watch Vercel production deploy
6. Verify Rakesh Apr 11 renders correctly post-deploy

---

## 5. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Real punch at exactly 09:00:00.000 IST + 18:00:00.000 IST, misclassified | Very low (~1/1e6) | Medium | Unit test confirms; requires both bookends |
| Creator drift (someone changes fallback time) | Medium | High | Shared constant imported by both creators and classifier |
| Leave/WFH CSV cosmetic ("12:00 AM" → blank for leave rows) | Likely | Low (cosmetic) | Acceptable |
| Payroll inconsistency with reports | Certain | Medium (financial) | Documented; follow-up ticket |
| Analytics dashboard shows different numbers post-deploy | Certain | Low (more correct) | Release notes |
| PWA stale cache | High | Medium | SW cache bump in deploy |

---

## 6. Out of scope (explicit)
- Option C (schema column)
- Fixing rectification creator (Option D, Phase 2 — separate ticket)
- Fixing payroll route (separate ticket — financial implications)
- Deleting historical ghost rows from DB
- New test framework
- Touching `attendance-api.ts` (toast-PR boundary)
- Modifying cron logic

---

## 7. Migration plan
**Not applicable** — Option A requires no migration.
