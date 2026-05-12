---
status: resolved
trigger: |
  Sometime punch in/out is recorded on user's screen but does not show in reports.
  Example: Rakesh Dutta was Present on April 19 and April 30, but the monthly report
  and detailed report show him as Absent on those dates. Need to fix this.
created: 2026-05-12
updated: 2026-05-13
resolved: 2026-05-13
goal: find_and_fix
slug: rakesh-april-absent-report
specialist_hint: typescript
---

## RESOLVED 2026-05-13

**Final root cause:** Supabase PostgREST server-side `max_rows = 1000` cap silently truncated batched attendance queries. With `batchSize = 50` and ~26 rows/user/month, each batch produced ~1300 rows; PostgREST returned only 1000. Sort was `punch_in_at ASC` so the latest days of the month were dropped. Apr 29/30 specifically affected for users whose data sat at the tail of the sort.

**Fix:** PR #9 `fb5cf75` reduced `batchSize` from 50 to 15 in `src/app/dashboard/reports/page.tsx:192` (15 × ~36 = ~540 rows per batch — under the 1000 cap with margin). Comment block added explaining the constraint. SW cache bumped to `20260516`. Deployed.

**Defense-in-depth pending:** User to raise Supabase `max_rows` from 1000 to 10000 in Dashboard → Settings → API for project `mzwmebrwmxhfyohulddl`.

**Why prior root-cause attempts missed it:**
- Code traces correctly produced "P" assuming the rows were available — but the rows never reached the merge logic
- The Bug A fix (ghost-row exclusion) and Bug B fix (stale state) were both real fixes for real bugs, but neither addressed this server-side truncation
- The 1000-row cap is invisible at the JS layer — PostgREST returns a `Content-Range` header but the Supabase JS client doesn't surface it as an error; the response just silently has fewer rows than requested
- The only definitive signal was the user clicking the modal and seeing "No-Record" → confirmed `dayData` was undefined → rows missing upstream

**Symptoms now resolved:** Rakesh Apr 29 and Apr 30 (and any other user with end-of-month data) render correctly post-deploy.

## REOPENED 2026-05-13 — prior root cause was incomplete

**New evidence (live verified today):**
1. All fixes from 2026-05-12 are deployed (commit `3c69425`, SW `CACHE_VERSION="20260515"`, PR #5/#6/#7/#8 all merged).
2. User opened the live site in **INCOGNITO mode** (no SW cache, no localStorage state) and reports Apr 29 and Apr 30 STILL render as "A" in Rakesh's row of the monthly grid.
3. Screenshot confirms: Rakesh Dutta row with totals 22 P / 4 A; last two cells before totals render as "A A".
4. Live DB query (today) confirms unchanged data:
   - Apr 29: 1 row, status=present, hours_diff=12.567, punch_in 11:24:58 IST, punch_out 23:59:00 IST (auto-closed)
   - Apr 30: 1 row, status=present, hours_diff=11.778, punch_in 12:12:20 IST, punch_out 23:59:00 IST (auto-closed)
   - Rakesh profile: active super_admin, project=uds-pos, not deactivated
5. Bug A fix verified working for Apr 11 (3-min real punch + ghost row → correctly renders "A" now). So `classifyGhost` + two-pass merge work correctly when ghost+real overlap.
6. Three separate debugger traces against the deployed code consistently produce "P" for Apr 29/30 given the actual DB data. They cannot explain the observed "A".

**The mismatch:** Code logic says "P", reality renders "A". Something the traces missed.

**Hypotheses (need verification, NOT yet tested):**
- H1: User has wrong month selected in picker — they're viewing May 2026 (today is May 13), where Apr 29/30 = future dates of a non-loaded month. **Pending user confirmation of what's in the month picker.**
- H2: Day-detail modal lookup uses a different code path than the grid; modal would show "No-Record" if `dayData[29]` is undefined → indicates rows missing from upstream merge. **Pending user clicking the cell.**
- H3: Silent attendance query error (line 218 `if (attendance) allRecords.push(...)`) dropped Rakesh's row for some batch; he appears in grid via other source. But: Rakesh has NO on-leave/holiday rows, and `leaveAttendance` query only fetches those. He cannot enter the grid via that path. UNLESS profile-side rendering adds him independent of his data.
- H4: Profile batch failure with partial success: some of Rakesh's 36 April rows arrived but Apr 29/30 specifically did not. Would require a date-correlated filter exclusion or sort-order/limit interaction.
- H5: User is testing with a DIFFERENT user logged in (not super_admin Sourabh) and RLS blocks Rakesh's Apr 29/30 rows under some condition.

**Critical next data points to obtain from user:**
1. What month does the report's month picker actually show? (April vs May matters — today is May 13.)
2. What does the Apr 29 cell show when clicked? Modal contents: status, punch in, punch out, hours.
3. Are the column headers showing day numbers? Is "29" the second-to-last column from the left?



# Debug: Rakesh Dutta — April dates showing Absent in reports

## Symptoms

- **Expected behavior:** Days where an employee has valid punch_in / punch_out records
  should display as **Present** (or correct status) in both the monthly grid and the
  detailed report.
- **Actual behavior:** For user Rakesh Dutta (`id = 37118303-c678-4d7c-a210-5f92dda45918`,
  `project_id = uds-pos`, `role = super_admin`), the monthly report and detailed report
  show **Absent** on April 19 and April 30 (2026), even though punch records exist and
  the punch screen shows the days as completed.
- **Error messages:** None reported in console.
- **Timeline:** Issue first reported on May 9 2026 for April 29-30. Memory file noted
  fixes were deployed in commit `feb622e` and suspected PWA cache. User now reports
  (May 12 2026) that April 19 is also affected.
- **Reproduction:** Open `/dashboard/reports`, set month to 2026-04, view Rakesh's row
  in the monthly grid or download Daily Detail CSV.

## Prior investigation (from memory `project_rakesh_april_debug.md`)

Last working state: deployed commit `feb622e` (HEAD at start of this session).
That fix removed an "all-profiles-to-grid" change. After deploy, April 29-30 were still
showing absent — user was asked to hard-refresh (PWA cache theory).

### DB data confirmed correct (verified May 12 via live Supabase query)

Query: `hr_attendance` for `user_id = 37118303-c678-4d7c-a210-5f92dda45918` between
`2026-04-01T00:00:00+05:30` and `2026-04-30T23:59:59+05:30` (filtered by `punch_in_at`).
36 records returned; 0 records dropped when re-querying by `created_at`.

| IST Date | Records | Status      | Notes                                              |
|----------|---------|-------------|----------------------------------------------------|
| Apr 19   | **0**   | **MISSING** | Sunday. NO punch row, NO rectification, NO leave.  |
| Apr 29   | 1       | present     | 11:24 IST in -> 23:59 IST out (auto-close). 12.57h |
| Apr 30   | 1       | present     | 12:12 IST in -> 23:59 IST out (auto-close). 11.78h |

A separate query on `hr_rectification_requests` for the same user in April returned 9
approved rectifications on Apr 2, 3, 4, 6, 7, 8, 9, 10, 11. **None on Apr 19 or Apr 30.**

## Eliminated

- hypothesis: NULL punch_in_at — Apr 30 has a real timestamp; verified
- hypothesis: Out-of-range punch_in_at filter — Apr 30 record passes the filter (queried with the same predicates)
- hypothesis: Row limit (5000) exceeded — Rakesh only has 36 April rows
- hypothesis: toISTDateStr timezone bug — Apr 30 `punch_in_at = 2026-04-30T06:42:20+00` buckets to IST date "2026-04-30" correctly
- hypothesis: Deduplication losing rows — only 1 row on Apr 30, no dedup collision
- hypothesis: correctedStatus threshold — 11.78h >= 8h -> "present"
- hypothesis: Reports grouping bug (`days[30]` undefined) — would only apply if `entry.date.split("-")[2]` returned wrong day; manually traced, returns "30"
- hypothesis: Holiday/Sunday gate forcing absent — Apr 30 is a Thursday, not Sunday
- hypothesis: Apr 19 record shape (open / cross-day / rectified) — **Apr 19 has NO records at all in the DB**, so there is nothing to mis-process

## Root Cause

**This is two separate problems being reported as one symptom.**

### Apr 30 (and Apr 29): client running stale code

When the **current** `feb622e` bundle runs `fetchMonthlySummary` for selectedMonth =
`2026-04`, Rakesh's Apr 30 record correctly flows through:

1. SQL filter `punch_in_at >= 2026-04-01T00:00:00+05:30 AND <= 2026-04-30T23:59:59+05:30`
   captures the row (verified: REST query returns the same 36 records the page would).
2. `toISTDateStr(new Date("2026-04-30T06:42:20+00:00"))` -> `"2026-04-30"`.
3. Day-grouping produces `firstIn = 06:42 UTC`, `lastOut = 18:29 UTC`, ms = 42,400,000.
4. `hours = 11.78`; since neither `on-leave/holiday/lwp` and both ends present,
   `correctedStatus = "present"` (line 275, `src/app/dashboard/reports/page.tsx`).
5. `dayData = { status: "present", ... }` -> `MonthlyGridTable` renders "P" (line 1325).

So **with the deployed `feb622e` code, Apr 29 and Apr 30 must render as "P"**. They
cannot legitimately render as "A" given the data on disk.

The client is therefore loading an **older JavaScript bundle**. The PWA service worker
(`public/sw.js`) is the proximate cause:

- `CACHE_VERSION = "20260326"` — last bumped **March 26 2026** (commit `87f76c5`).
- Multiple report-rendering fixes have shipped since: `660069d`, `7dbd36f`, `09ecb19`,
  `feb622e` (all between Apr 25 and May 9). None of them bumped `CACHE_VERSION`.
- The SW is "network-first with cache fallback" for non-API GETs on the same origin.
  In normal connectivity this should serve fresh chunks, but the install/activate flow
  for new SW versions is gated on `CACHE_VERSION` changing. Because the version string
  was not bumped, the existing SW is **never invalidated** for users who already
  registered it, the navigation HTML it caches keeps referencing the chunk hashes that
  were live when the SW was installed, and the browser sees those chunks as
  "still current" via the SW response. A hard refresh (or DevTools "Update on reload")
  bypasses the SW and pulls fresh assets — explaining why the May-9 hard-refresh
  request worked for the first reporter but the user now hits the same stale state on
  a different machine / different cached install.

The historical (pre-`660069d`) `MonthlyGridTable` rendered "-" for empty cells, but
the still-recent `8174589` -> `660069d` window had a regression where empty past
cells were displayed and styled red. Depending on exactly which SW-cached bundle is
live in Rakesh's browser, the visible Apr 29 / Apr 30 "A" badges originate from one of
those intermediate builds where:

- profiles were force-added to the grid even when they had no entries, or
- empty past cells were unconditionally labeled "A" with no real attendance read.

Either way, the **DB is correct**; the **deployed code is correct**; the **served
bundle is not** because the SW cache key was never invalidated.

### Apr 19: no data exists, and Apr 19 is a Sunday

Apr 19 2026 is a **Sunday**. The current grid renders empty Sunday cells as the
orange "SU" badge (line 1293-1300), and the Daily Detail CSV writes `"SU"` (line 773).
The user says they were "Present" — but:

- No row exists in `hr_attendance` for Rakesh on Apr 19 IST (queried both by
  `punch_in_at` window and by `created_at` window).
- No rectification request was filed for Apr 19.
- No leave or holiday row exists for Apr 19.

So either (a) the punch attempt on Apr 19 never reached Supabase (lost from the
offline `uds_sync_queue`, dropped by an API failure, or the user closed the tab before
the queue flushed), or (b) the user is misremembering. There is **nothing for the
reports page to render** beyond the standard Sunday "SU" label. This is not a reports
bug.

### Files involved
- `src/app/dashboard/reports/page.tsx` (lines 167-289 `fetchAttendanceData`, 307-404
  `fetchMonthlySummary`, 1243-1349 `MonthlyGridTable`, 1353-1454 `MonthlyDayDetailTable`,
  754-797 `handleDownloadMonthlyDetail`) — code is correct as of `feb622e`.
- `public/sw.js` (line 2) — **the actual defect**. `CACHE_VERSION` was not bumped on
  any of the report-fix deploys, so the SW does not enter its `activate` phase, the old
  cache is not deleted, and stale bundles continue to be served from cache.

## Open hypotheses for THIS session

(All resolved — see Root Cause above.)

## Current Focus

(Resolved.)

## Evidence

- timestamp: 2026-05-12 — HEAD is at `feb622e`, the same commit that prior memory
  said was deployed. No code changes since.
- timestamp: 2026-05-12 — `src/app/dashboard/reports/page.tsx` is 1514 lines.
  Both `fetchAttendanceData` and `fetchMonthlySummary` live in this file.
- timestamp: 2026-05-12 — `src/lib/attendance-api.ts` is 210 lines; contains
  `getStaleOpenSessions` (from auto punch-out fix Apr 25).
- timestamp: 2026-05-12 — Live Supabase query for Rakesh's April records:
  36 rows by `punch_in_at` filter, 36 rows by `created_at` filter (0 dropped). No row
  exists for Apr 19. Apr 29 and Apr 30 both have status=present with >=11h hours.
- timestamp: 2026-05-12 — Live Supabase query for rectifications:
  9 approved April rectifications for Rakesh, all between Apr 2 and Apr 11. None on
  Apr 19 or Apr 30.
- timestamp: 2026-05-12 — `public/sw.js` `CACHE_VERSION = "20260326"`. Last bumped
  in commit `87f76c5` on 2026-03-26. The four post-March-26 report-rendering fixes
  (`660069d` Mar 27 effectively post, `7dbd36f`, `09ecb19`, `feb622e`) did NOT bump
  the cache version. Memory's `auto-punch-out-fix.md` also notes the SW version policy.
- timestamp: 2026-05-12 — Apr 19 2026 confirmed as Sunday via
  `new Date(2026, 3, 19).getDay() === 0`.
- timestamp: 2026-05-12 — Reading `MonthlyGridTable` line 1292-1300 confirms empty
  Sunday cells render an orange "SU" badge, not red "A". Empty past non-Sunday cells
  render red "A" (line 1302-1309). So an "Absent" on Apr 19 in the user's view is
  not consistent with what the deployed code would produce -> additional evidence the
  user is on a stale bundle.

## Resolution

- root_cause: PWA service worker cache is not invalidated. `public/sw.js` `CACHE_VERSION`
  was last bumped 2026-03-26 (commit `87f76c5`), but four subsequent commits that change
  the reports rendering (`660069d`, `7dbd36f`, `09ecb19`, `feb622e`) shipped without
  bumping it. Users with an already-installed SW continue to be served pre-fix
  JavaScript bundles, so the monthly grid renders Apr 29 and Apr 30 as "A" even though
  the live DB has present-status records and the deployed code would render "P". Apr 19
  is a separate non-issue: no record exists in the DB for that Sunday, so the correct
  current behavior is to display "SU" — the "Absent" the user sees is the same
  stale-bundle rendering. Confirmed via live Supabase REST query (36 April rows
  returned, all 30+ rendered correctly in mental trace through `fetchAttendanceData` ->
  `fetchMonthlySummary` -> `MonthlyGridTable`).
- fix: (not applied — find_root_cause_only). Recommended fix is to bump `CACHE_VERSION`
  in `public/sw.js` to a current date string (e.g. `20260512`) and re-deploy. This will
  cause the SW `activate` handler to delete the old cache (line 28-31) and serve fresh
  chunks on next reload. Adding a CI / pre-deploy hook that fails the build when the
  cache version is older than HEAD's commit date would prevent recurrence. Independently,
  the Apr 19 missing-record question is for the user — there is no data for that day to
  show, so the user should be asked whether they actually punched in on Sun Apr 19 or
  is recalling a different Sunday.
- verification: After SW bump, the user should hard-refresh once; subsequent visits
  should show Apr 29 "P", Apr 30 "P", Apr 19 "SU". DB content already verified.
- files_changed: (none in this session)

## TDD checkpoint

(not used — `workflow.tdd_mode = false` at orchestrator level)

## Reasoning checkpoint

(none)
