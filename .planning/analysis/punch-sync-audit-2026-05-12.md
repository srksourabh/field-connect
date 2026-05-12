# Analysis Report — UDS-HR (punch + offline-sync audit)

**Generated:** 2026-05-12
**Scope:** punch / offline-sync code paths (see "Files audited" below)
**Files audited:** 16 (no sampling — well under --max-files 300)
**Primary language:** TypeScript (Next.js 14 App Router)
**Frameworks:** Next.js, React 18, Supabase, react-leaflet
**Diff base:** unset (per user instruction — no proposed change; analysing current code state)
**K3 status:** N/A (no diff base; nothing to vet against a "stated task")
**Rules audited:** K1, K2, K4 + E1, E2, E3, E4, E5, E6, E7, E8
**Severity threshold:** low (overridden from default `medium` per user request)

**Apr-19 framing:** All findings are weighted toward the user's stated symptom — punch succeeded on-device but no DB row exists. Error-swallowing, lost queue items, and race conditions in the punch/sync flow are surfaced at HIGH or CRITICAL.

**Files in scope:**

| # | File | Notes |
|---|---|---|
| 1 | `src/hooks/usePunchState.ts` | localStorage timer state |
| 2 | `src/lib/sync-queue.ts` | localStorage queue persistence |
| 3 | `src/hooks/useSyncQueue.ts` | Queue flush + retry orchestrator |
| 4 | `src/hooks/useLocationTracker.ts` | Scheduled GPS capture |
| 5 | `src/lib/attendance-api.ts` | Supabase punch CRUD |
| 6 | `src/lib/location-api.ts` | Location log CRUD + road snap |
| 7 | `src/components/punch/PunchToggle.tsx` | Slide-to-punch UI |
| 8 | `src/components/punch/PunchCard.tsx` | Card wrapper |
| 9 | `src/components/punch/PunchTimer.tsx` | Elapsed display |
| 10 | `src/components/punch/SyncStatusBanner.tsx` | Online/offline banner |
| 11 | `src/components/punch/LocationWidget.tsx` | Address display |
| 12 | `src/components/punch/TodayActivityGrid.tsx` | Stats grid |
| 13 | `src/components/punch/SessionTimelineModal.tsx` | Timeline modal |
| 14 | `src/components/punch/AnalogClock.tsx` | Analog clock (no IO) |
| 15 | `src/components/punch/RouteMapModal.tsx` | Modal shell |
| 16 | `src/components/punch/RouteMapInner.tsx` | Leaflet route map |
| + | `src/app/api/cron/auto-punch-out/route.ts` | Server-side cron (only punch-related API route) |
| + | `src/app/dashboard/page.tsx` | Primary call site — orchestrates punch flow |
| + | `src/lib/utils.ts` (logError only) | Production-silent logger — load-bearing |
| + | `src/hooks/useOnlineStatus.ts` | navigator.onLine wrapper |
| + | `src/hooks/useMidnightAutoClose.ts` | IST midnight day-change hook |

**Note on scope:** `src/lib/punch-api.ts` was listed in the user's scope but does not exist in the repo. Skipped silently per skill rules.

---

## Summary

| Severity | K1 | K2 | K3 | K4 | E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| critical | 0 | 0 | n/a | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 3 |
| high | 1 | 0 | n/a | 1 | 1 | 3 | 0 | 2 | 0 | 0 | 4 | 1 | 13 |
| medium | 2 | 1 | n/a | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 2 | 1 | 11 |
| low | 1 | 1 | n/a | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 1 | 7 |

Total findings: 34
Below threshold (counted, not detailed): 0 (threshold is `low` — everything appears in body)

**Apr-19 plausibility map** (which findings could explain "punched in on device, no DB row"):
- E7-1, E7-2, E7-3 (createPunchIn / updatePunchOut return `null` on Supabase error; caller code partially handles this but the offline path and the location-log path do not).
- E2-1 (no idempotency key — retried queue items can create duplicates or, paired with E7-4, can be silently dropped on schema errors).
- E7-4 (queue items dropped to dead-letter after 5 silent failures with no visibility while `logError` is muted in prod).
- E4-1 (no `fetch`/Supabase timeouts — a hung request blocks the queue forever).
- K1-1 (silent `logError` in production gate is the root force-multiplier — every "swallow" finding below becomes a literal void in prod).

---

## Findings

### K1 — Think Before Coding

#### high · `src/lib/utils.ts:78-82`

> ```ts
> export function logError(message: string, ...args: unknown[]): void {
>   if (process.env.NODE_ENV !== "production") {
>     console.error(message, ...args);
>   }
> }
> ```

**Why this matters:** This is the single most load-bearing finding in the audit. Every `catch` block in `attendance-api.ts`, `location-api.ts`, `useSyncQueue.ts`, and `useLocationTracker.ts` funnels through `logError`. In production (where users live) this function is a no-op. There is no Sentry, no telemetry, no fallback. The Apr 19 user could have hit any of a dozen `logError` paths and produced **zero observable signal** — neither to the user, nor to the developer. The assumption "we'll see it in the logs" is silently false in prod.

**Suggested remediation (advisory only):** Decide whether `logError` should always emit (downgraded `console.warn` is fine in prod), or wire it to a server-side telemetry endpoint when offline-permissible. The current branch silently drops all error context in production — that contradicts the verbose error handling everywhere else.

---

#### medium · `src/hooks/usePunchState.ts:36-57`

> ```ts
> function loadState(userId: string): PunchState {
>   if (typeof window === "undefined" || !userId) return defaultState();
>   try {
>     const stored = localStorage.getItem(storageKey(userId));
>     if (stored) {
>       const parsed = JSON.parse(stored) as PunchState;
>       ...
> ```

**Why this matters:** `parsed` is type-asserted (`as PunchState`) with zero runtime validation. A corrupted localStorage blob (e.g., partial write from a tab close mid-save, downgrade across schema versions) returns a half-formed object and the spread `{ ...defaultState(), ...parsed }` blends junk fields into runtime state. The assumption "localStorage contents match our type" is undocumented and unenforced.

**Suggested remediation (advisory only):** Validate the parsed shape (Zod or a hand-rolled type guard) and discard with a warning if it doesn't match. Note the project rules already mandate Zod for boundaries.

---

#### medium · `src/hooks/useSyncQueue.ts:19`

> ```ts
> const FLUSH_INTERVAL_MS = 30_000;
> ```

**Why this matters:** Magic constant. Why 30s? On a flaky mobile connection a 30s flush gap means a user can punch in, lose connection, close the tab inside 30s, reopen — and the queue is still untouched. The choice between aggressive flush (battery, request volume) and lazy flush (data loss window) isn't documented, isn't configurable, and isn't surfaced to the user.

**Suggested remediation (advisory only):** Add an inline comment justifying the value, or surface a "last flush attempt" timestamp in the SyncStatusBanner so the user can see how stale their queue is.

---

#### low · `src/components/punch/AnalogClock.tsx:18-20`

> ```ts
> const istOffset = 5.5 * 60 * 60 * 1000;
> const utc = time.getTime() + time.getTimezoneOffset() * 60000;
> const ist = new Date(utc + istOffset);
> ```

**Why this matters:** Hand-rolled IST conversion in three different places across the codebase (also in `useMidnightAutoClose.ts:34-35` and the cron route). When DST rules change (India proposed it in 2017, the topic recurs), each copy must change. Three identical magic constants is an undocumented assumption that IST is permanently UTC+5:30.

**Suggested remediation (advisory only):** Consolidate IST conversion into a single util in `src/lib/utils.ts` (alongside `todayIST` / `endOfDayIST`).

---

### K2 — Simplicity First

#### medium · `src/hooks/usePunchState.ts:106-119`

> ```ts
> // Persist to localStorage every 60 seconds (not every tick) for offline resilience
> useEffect(() => {
>   if (state.isPunchedIn && userId) {
>     saveIntervalRef.current = setInterval(() => {
>       setState((prev) => {
>         saveState(userId, prev);
>         return prev;
>       });
>     }, 60000);
>   }
> ```

**Why this matters:** This `setState` updater that returns `prev` unchanged exists solely to read the latest state inside the interval. It is a workaround for not having a `useRef` mirror. Also, every other state mutation in the file (`punchIn`, `punchOut`, `initFromServer`, `initFromCache`, `clearAutoClose`) already calls `saveState` synchronously inside the updater — so a separate 60s timer is only useful for in-flight elapsed-time drift, which is a non-feature (a tab close at second 59 loses one tick). The complexity isn't earning anything.

**Suggested remediation (advisory only):** Either remove the 60s timer (the synchronous saves on every mutation are sufficient) or replace it with a `useRef<PunchState>` mirror updated alongside `setState` so the interval can read `stateRef.current` directly.

---

#### medium · `src/components/punch/AnalogClock.tsx:9-263`

> 250+ lines of SVG / gradient definitions for a decorative clock.

**Why this matters:** The clock is decorative — it ticks every second causing a full SVG re-render (cheap, but noticeable on low-end Android devices that are the field workforce's primary device). The Karpathy "200 lines vs 50 lines" smell applies: 19 gradient stops, 12 numerals, 60 tick marks, 4 filter defs, all re-rendered every second. A `<canvas>` or a CSS-keyframe-animated SVG would be simpler.

**Suggested remediation (advisory only):** Out of scope for the Apr 19 bug, but flag for a future simplification pass. If the user only wanted a clock, the digital `PunchTimer.tsx` already serves it.

---

#### low · `src/lib/sync-queue.ts:25-29`

> ```ts
> export function addToQueue(item: SyncQueueItem) {
>   const queue = getQueue();
>   queue.push({ ...item, retryCount: item.retryCount ?? 0 });
>   localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
> }
> ```

**Why this matters:** `localStorage.setItem` here has no `try/catch`, but `getQueue` does. The asymmetry is undocumented. `getQueue` swallows JSON parse errors silently; `addToQueue` and `removeFromQueue` let storage errors throw to callers — but the callers (in `useSyncQueue.flush`) don't catch them.

**Suggested remediation (advisory only):** Decide on one policy (throw consistently, or swallow consistently with a logged warning) and apply it across the file.

---

### K4 — Goal-Driven Execution

#### high · entire scope

> No tests exist for any file in scope. `playwright.config.ts` is missing; `npm run test` is not configured. The only verification gate before deploy is `npm run build` + `npm run lint`.

**Why this matters:** The user's stated goal ("user thinks they punched in but no DB record exists") is a strong test contract: spec an offline punch-in, simulate flaky network, assert the queue eventually persists or surfaces an error. None of that exists. The Apr 19 bug shipped because there was no executable goal to flag the regression. CLAUDE.md notes "No test runner is configured" — that's the bug behind the bug.

**Suggested remediation (advisory only):** A single integration test that exercises `useSyncQueue.flush` against a mocked `createPunchIn` returning `null` would have surfaced E7-1 immediately. Treat the lack of a test runner as the highest-leverage fix.

---

#### medium · `src/lib/attendance-api.ts:120-135`

> ```ts
> export async function updateAttendanceStatus(userId: string): Promise<void> {
>   const sessions = await getTodayAllSessions(userId);
>   if (!sessions) return; // Server unreachable — skip
>   ...
>   await supabase
>     .from("hr_attendance")
>     .update({ status })
>     ...
> ```

**Why this matters:** Function returns `void`. The `.update()` Supabase call is not awaited for its `{ error }`, so a failure to persist the status update is silent and untestable. The function name promises a goal ("update attendance status") but provides no way to verify it succeeded.

**Suggested remediation (advisory only):** Return the error or a typed result so the caller in `dashboard/page.tsx:275` can surface a toast on failure.

---

#### low · `src/app/api/cron/auto-punch-out/route.ts:64`

> ```ts
> if (!updateError) closedCount++;
> ```

**Why this matters:** Per-row update errors in the cron are counted-but-ignored. There's no way to see which rows failed (no `logError`, no Sentry, no return value beyond `{ closed, total }`). The goal "close all stale sessions" is verified only at the count level — a user whose row failed to close stays in the open-session pool until they re-open the app.

**Suggested remediation (advisory only):** Aggregate `updateError` into a `failures: [{id, message}]` array on the response so future cron runs (and dev inspection) have a paper trail.

---

### E1 — Null / undefined / empty

#### high · `src/app/dashboard/page.tsx:222-225`

> ```ts
> } else {
>   // Server rejected punch-in — revert local state completely
>   punchOut();
>   showToast("Punch-in failed. Please try again.", "error");
>   return;
> }
> ```

**Why this matters:** When `createPunchIn` returns `null` (which it does silently on any Supabase error — see E7-1), this revert path is taken. But `punchOut()` from `usePunchState`:
1. Sets `isPunchedIn: false` ✓
2. Adds the elapsed-time to `cumulativeSeconds` ✗ (it's measuring the 0-50ms between `punchIn()` and the error response, so adds ~0s — harmless in practice but conceptually wrong).
3. Does NOT decrement `sessionCount` (incremented to 1 by the `punchIn()` call at line 205). The user now sees "Sessions: 1" with no underlying record.
4. Critically: the `addToQueue` offline branch is **never** taken, so the failed online punch-in is just gone. No queue entry to retry. The next sync is for nothing.

This is a likely Apr-19 path: user punched in online, network blip caused `createPunchIn` to return `null`, the toast flashed for 3 seconds, user tapped away — no DB row, no queue, no record.

**Suggested remediation (advisory only):** On `createPunchIn` failure, enqueue the punch to the sync queue (the same payload that the offline branch builds) so it retries automatically. Also, on revert, restore `sessionCount` accurately.

---

#### medium · `src/hooks/useSyncQueue.ts:45-60`

> ```ts
> if (record?.id) {
>   const currentQueue = getQueue();
>   for (const qItem of currentQueue) {
>     if (
>       qItem.type === "location_log" &&
>       !qItem.payload.attendance_id &&
>       qItem.payload.user_id === item.payload.user_id
>     ) {
> ```

**Why this matters:** This re-reads the queue immediately after `removeFromQueue` and patches location logs to inject the new `attendance_id`. But:
- If `record` is `null` (E7-1 path: silent insert failure that returned `null`), `removeFromQueue(item.id)` ran first (line 44) — so a failed punch-in is removed from the queue before we know it failed. The queue is silently emptied of the punch-in record without persisting it.

**Suggested remediation (advisory only):** Re-order: only call `removeFromQueue` after confirming `record?.id` exists. If `createPunchIn` returned `null`, treat it as a retryable error (throw inside the try block so the existing retry counter kicks in).

---

#### low · `src/components/punch/RouteMapInner.tsx:40`

> ```ts
> const center = rawPositions[midIdx] || [28.6139, 77.209];
> ```

**Why this matters:** `[28.6139, 77.209]` is hardcoded Delhi coordinates as a fallback. Magic constant with no provenance comment. Not Apr-19 critical, but flags K1 too.

**Suggested remediation (advisory only):** Move to a constant `DEFAULT_MAP_CENTER` with an inline comment.

---

### E2 — Concurrency / races

#### high · `src/hooks/useSyncQueue.ts:35-103`

> ```ts
> for (const item of queue) {
>   try {
>     if (item.type === "punch_in") {
>       const record = await createPunchIn(...);
>       removeFromQueue(item.id);
>       ...
> ```

**Why this matters:** The flush loops over `queue` (captured at line 32). The loop body is async — by the time it processes item N, the queue has been mutated by `removeFromQueue` calls on items 0..N-1 and possibly by user-initiated `addToQueue` calls from other interactions. The `getQueue()` snapshot is stale. If a new punch-in is enqueued mid-flush, it's not visible to this flush pass (acceptable). But more critically: `removeFromQueue(item.id)` triggers a full re-read of the queue, a filter, and a write. With 5+ queue items being processed back-to-back, that's 10 localStorage write ops competing with `addToQueue` write ops from the punch handler. localStorage is **synchronous** but not atomic across tabs — a second tab open to the same app can clobber.

Combined with E2-2 (no PWA single-tab enforcement), a user with the PWA installed and a second tab open can race and lose queue items.

**Suggested remediation (advisory only):** Use a single read/modify/write pass per flush call. Or use the BroadcastChannel API to coordinate flushes across tabs.

---

#### high · `src/hooks/useSyncQueue.ts:26-29` + `src/hooks/useSyncQueue.ts:112-117`

> ```ts
> const flush = useCallback(async () => {
>   if (flushingRef.current) return;
>   flushingRef.current = true;
>   ...
> useEffect(() => {
>   setPendingCount(getQueue().length);
>   if (navigator.onLine) {
>     flush();
>   }
> }, [flush]);
> ```

**Why this matters:** The mount-time flush at line 112-117 calls `flush()` without `await`. If the component unmounts mid-flush (user navigates away inside 200ms), `flushingRef.current` stays `true` forever for that component instance — but more critically, **a new mount creates a new ref**, so the guard isn't doing anything across mounts. Combined with the "Flush when coming back online" effect at 120-124 and the 30s periodic flush, three flushes can fire concurrently on a fresh mount that goes online: the mount flush, the online-status flush, and the interval flush.

**Suggested remediation (advisory only):** Move the flushing guard to module scope (a singleton outside the hook), not a per-instance ref. Or guard with a Promise that all callers await.

---

#### high · `src/app/dashboard/page.tsx:192-321`

> The entire `handleToggle` function is gated by `punchingRef.current` but does not handle the case where geolocation has not yet resolved.

**Why this matters:** `geo.lat` / `geo.long` can be `null` (line 209). The code happily passes `null` into the payload. `createPunchIn` accepts `null` (the signature says so), so it stores a row with no GPS. But:
- The user thinks they punched in "at their location" (PunchCard says "Location synced").
- The HR dashboard sees a punch with `punch_in_lat: null`.
- The route map shows zero distance for that user (E1 cascade).

This race is not exactly the Apr 19 bug but it's adjacent: the UI lies about location sync state when `canPunch` is true while GPS hasn't actually returned.

**Suggested remediation (advisory only):** In `PunchCard.tsx:28`, gate `canPunch` on `geo.lat != null` as well — or surface a "GPS required" warning before allowing the punch.

---

#### medium · `src/lib/sync-queue.ts:25-43`

> ```ts
> export function addToQueue(item: SyncQueueItem) { ... }
> export function removeFromQueue(id: string) { ... }
> export function updateQueueItem(...) { ... }
> ```

**Why this matters:** No idempotency. If the same punch is enqueued twice (double-tap, two-tab race, queue replay), the queue ends up with two `punch_in` items with different UUIDs (`crypto.randomUUID()` in each `addToQueue` call site). `createPunchIn` guards against duplicate today-rows server-side (lines 11-25) — good — but the queue still spends a retry cycle on the duplicate. Worse, the duplicate's location-log patch loop (E1-2) can attach `attendance_id` to the wrong subsequent log.

**Suggested remediation (advisory only):** Make the queue ID stable (e.g., `${userId}:${type}:${date}`) so a re-enqueue is a no-op.

---

#### low · `src/hooks/useLocationTracker.ts:92-122`

> ```ts
> useEffect(() => {
>   if (!isPunchedIn || !userId) {
>     if (intervalRef.current) {
>       clearInterval(intervalRef.current);
>       intervalRef.current = null;
>     }
>     return;
>   }
>   ...
>   captureLocation(userId, attendanceId, isOnline);
>   intervalRef.current = setInterval(check, 60_000);
> ```

**Why this matters:** Every change to `attendanceId` or `isOnline` (which can flip multiple times during a flaky session) re-fires the effect, immediately calling `captureLocation(...)` again. So a user on a sketchy connection can generate dozens of GPS captures in quick succession, each with its own `getCurrentPosition` request — battery and queue volume blow up. Not Apr-19 critical, but a wasted-work issue.

**Suggested remediation (advisory only):** Memoize on `[isPunchedIn, userId]` only, and read `attendanceId` / `isOnline` from refs.

---

### E3 — Time / timezone

#### medium · `src/lib/attendance-api.ts:11-25`

> ```ts
> // Guard: if there's already an open session today, return it instead of creating a duplicate
> const today = todayISTTimestamp();
> const { data: existing } = await supabase
>   .from("hr_attendance")
>   .select()
>   .eq("user_id", data.user_id)
>   .gte("created_at", today)
>   .is("punch_out_at", null)
>   .limit(1)
>   .maybeSingle();
> ```

**Why this matters:** This compares `created_at` (a database timestamp, in UTC by Supabase default) against `today` (which is `${yyyy-mm-dd}T00:00:00+05:30` — IST midnight). Supabase will compare these correctly *only if* `created_at` is timezone-aware. If a migration ever changes the column type from `timestamptz` to `timestamp without time zone`, the comparison silently breaks. There's no test guarding this.

Also: if the user opens the app at 23:55 IST and punches in at 00:01 IST (the next IST day), this `gte('created_at', today)` check returns 0 rows for "today" because `today` is now the next day's midnight. The check could miss an open session from the previous day. The midnight auto-close in `dashboard/page.tsx:62-80` and the cron route both try to catch this, but on a cold start within the first minute of an IST day, there's a window.

**Suggested remediation (advisory only):** Add a comment documenting the `timestamptz` dependency. Consider broadening the "open session" guard to `created_at >= (today - 1 day)` and filtering open-sessions whose `punch_in_at` is today (or use the cron-imposed status filter).

---

### E4 — Network failures

#### high · `src/lib/attendance-api.ts` + `src/lib/location-api.ts` (every Supabase call)

> No `AbortSignal`, no timeout, no retry-on-5xx, no backoff anywhere.

**Why this matters:** A user on a captive-portal (hotel wifi that intercepts requests) sees `navigator.onLine === true` and the app tries to `createPunchIn`. The fetch hangs indefinitely — Supabase client doesn't set a default timeout. The UI shows "Location synced" because `isPunchedIn` was set optimistically. The user closes the app 30 seconds later. The hung request never resolves. **No DB row, no queue entry.** This is a strong Apr-19 candidate.

**Suggested remediation (advisory only):** Wrap every Supabase mutation in a `Promise.race` against an `AbortSignal.timeout(10_000)`. On timeout, enqueue to the offline queue and surface a toast.

---

#### high · `src/hooks/useSyncQueue.ts:93-102`

> ```ts
> } catch (err) {
>   logError("Sync failed for item:", item.id, err);
>   const retries = (item.retryCount ?? 0) + 1;
>   if (retries >= MAX_RETRIES) {
>     moveToDeadLetter({ ...item, retryCount: retries });
>     showToast(`Failed to sync ${item.type.replace("_", " ")} after ${MAX_RETRIES} attempts.`, "error");
>   } else {
>     updateQueueItem(item.id, { retryCount: retries });
>   }
>   continue;
> }
> ```

**Why this matters:** `MAX_RETRIES = 5`. Retries fire on the 30s flush interval. So after 5 × 30s = 150 seconds of flushes, a transient 503 from Supabase ships the item to dead-letter — gone from the active queue, gone from the user's view, no UI banner remaining. The toast fires once. If the user has their app backgrounded for the 150s window (PWAs do this aggressively on mobile), they never see the toast, and the punch is gone.

No exponential backoff: 30s × 5 evenly-spaced retries == a brittle window during which a single bad gateway minute can dead-letter the whole queue.

**Suggested remediation (advisory only):** Exponential backoff (30s, 60s, 120s, 240s, 480s) extends the resilience window to ~16 minutes. Surface dead-letter items in the SyncStatusBanner with a "Retry" button.

---

#### medium · `src/lib/location-api.ts:140-155`

> ```ts
> const res = await fetch("/api/snap-to-roads", {
>   method: "POST",
>   headers,
>   body: JSON.stringify({ positions }),
> });
> if (!res.ok) return positions;
> ```

**Why this matters:** No timeout on the `fetch`. If `/api/snap-to-roads` hangs (downstream Google Roads API outage), the UI thread of the dashboard awaits forever — blocking the `Promise.all` at line 165-176 indirectly via the activity-grid render.

**Suggested remediation (advisory only):** `AbortSignal.timeout(5000)`. Falls back to raw positions on timeout — already the right behaviour on `!res.ok`.

---

### E5 — Auth / authorization

No findings in this scope (the cron route validates `CRON_SECRET` correctly at `route.ts:11-19`, and the dashboard relies on the global `AuthProvider`).

---

### E6 — Input validation

No findings in this scope (the punch payloads are typed and Supabase RLS enforces row-level access; the cron route doesn't accept user input).

---

### E7 — Error swallowing  **[primary Apr-19 vector]**

#### critical · `src/lib/attendance-api.ts:40-44`

> ```ts
> if (error) {
>   logError("Punch in error:", error);
>   return null;
> }
> return record;
> ```

**Why this matters:** This is **the** Apr-19 line. `createPunchIn` returns `null` on any Supabase error: RLS rejection, schema mismatch, network blip, deadlock. The caller in `dashboard/page.tsx:215` checks `if (record)` and reverts with a toast — but as discussed in E1-1, the revert path doesn't enqueue for retry. Combined with the production-silent `logError` (K1-1), this is a clean "user punched in, no DB row, no log, no queue, no surface."

**Suggested remediation (advisory only):** Either throw the error (let the caller wrap in `try/catch` and decide policy) or return a discriminated union (`{ ok: true, record } | { ok: false, error }`) that forces the caller to handle both branches. Pair with a non-silent error logger (K1-1 remediation).

---

#### critical · `src/lib/attendance-api.ts:68-72`

> ```ts
> if (error) {
>   logError("Punch out error:", error);
>   return null;
> }
> return record;
> ```

**Why this matters:** Same swallow as the punch-in path, but worse — the caller at `dashboard/page.tsx:272` does NOT check the return value: `await updatePunchOut(payload); setLastPunchOut(now);`. If the Supabase update fails silently, the UI shows "Last punch out: 14:23" but the DB row still has `punch_out_at: null`. The user appears punched out; the cron eventually closes the session at 23:59 IST with an absent/half-day status the user didn't earn.

**Suggested remediation (advisory only):** Check the return value at the call site. If `null`, enqueue to the offline queue (so it retries) and revert the UI state.

---

#### critical · `src/hooks/useSyncQueue.ts:97`

> ```ts
> if (retries >= MAX_RETRIES) {
>   moveToDeadLetter({ ...item, retryCount: retries });
>   showToast(`Failed to sync ${item.type.replace("_", " ")} after ${MAX_RETRIES} attempts.`, "error");
> }
> ```

**Why this matters:** Dead-letter is `uds_sync_dead_letter` in localStorage — no UI surfaces it, no admin sees it. Items in this bucket are *permanently invisible* unless the user opens DevTools. For a non-technical field workforce, dead-letter == data destruction.

**Suggested remediation (advisory only):** Render the dead-letter count in the SyncStatusBanner (already shown for pending). Add an admin endpoint to surface dead-letter items for replay.

---

#### high · `src/lib/location-api.ts:25-29`

> ```ts
> if (error) {
>   logError("Insert location log error:", error);
>   return null;
> }
> ```

**Why this matters:** Same swallow pattern. `useLocationTracker.captureLocation` awaits `insertLocationLog` but only checks `try/catch` (line 46-48), not the `null` return. So a Supabase RLS rejection on `hr_location_logs` returns `null` (not throws), the catch never fires, and `setLastCaptureTime(Date.now())` runs (line 45) — locking out the next 15 minutes of captures even though the insert failed.

**Suggested remediation (advisory only):** Throw on error and update the caller to handle. Or check the return and skip the `setLastCaptureTime` call on `null`.

---

#### high · `src/hooks/useLocationTracker.ts:46-48`

> ```ts
> } catch (e) {
>   logError("Location log failed:", e);
> }
> ```

**Why this matters:** Catch-and-log-and-continue. In production with `logError` muted, this is a totally silent failure. The location log was supposed to land but didn't; the user has no idea. Cumulative effect over an 8-hour shift: missing GPS trail, "Distance: 0 km" on the dashboard, no way to prove the field visit.

**Suggested remediation (advisory only):** Surface a small "X failed GPS captures" indicator in the UI, or queue the failure for retry.

---

#### high · `src/components/punch/RouteMapInner.tsx:20-36`

> ```ts
> useEffect(() => {
>   ...
>   (async () => {
>     const { data: { session } } = await supabase.auth.getSession();
>     const token = session?.access_token;
>     const snapped = await snapToRoads(rawPositions, token);
>     if (!cancelled) {
>       setRoutePositions(snapped);
>       setSnapping(false);
>     }
>   })();
> ```

**Why this matters:** No catch on the async IIFE. If `supabase.auth.getSession()` throws (auth token corrupted, refresh failure mid-tab-suspend), the promise rejects unhandled — modern browsers log it to console but the user sees a frozen "Loading map..." state forever. `setSnapping(false)` never runs.

**Suggested remediation (advisory only):** Wrap in try/catch, fall back to `rawPositions` on error.

---

#### high · `src/hooks/usePunchState.ts:53-55` + `:62-65`

> ```ts
> } catch {
>   // Ignore parse errors
> }
> ...
> } catch {
>   // Ignore storage errors
> }
> ```

**Why this matters:** Two empty catches. `loadState` swallows a corrupted JSON parse and returns `defaultState()` — meaning a user who somehow got bad data in localStorage **loses their cumulative seconds and session count silently on the next mount**. If the corruption happened during a punch-in, the user might re-punch and create a duplicate; the server-side guard catches that, but the local UI shows zero sessions when the server has one. `saveState`'s silent storage-quota failure means the next refresh loses the in-progress session entirely.

**Suggested remediation (advisory only):** Log the corruption (even via `logError`). On storage quota exceeded, surface a "storage full" toast — that's actionable.

---

#### medium · `src/components/punch/RouteMapInner.tsx:30-31`

> Async IIFE in useEffect with no `.catch()` on the IIFE promise itself.

**Why this matters:** Adjacent to the previous E7-6 finding — the async pattern is a common React 18 footgun. If a future maintainer adds an `await` that throws (e.g., a fetch helper), the rejection propagates to the window unhandled-rejection handler. Production has no handler.

**Suggested remediation (advisory only):** `(async () => {...})().catch(handleError)` or convert to a `.then().catch()` chain.

---

#### medium · `src/app/dashboard/page.tsx:90-99`

> ```ts
> useEffect(() => {
>   (async () => {
>     const { data } = await supabase
>       .from("hr_config")
>       .select("value")
>       .eq("key", "hr_policy_url")
>       .maybeSingle();
>     if (data?.value) setHrPolicyUrl(data.value);
>   })();
> }, []);
> ```

**Why this matters:** No error handling. If `hr_config` table query fails, the policy card just doesn't render — silently. Less critical than the punch path but same pattern; the user has no indication that something didn't load.

**Suggested remediation (advisory only):** Surface a console warning at minimum.

---

#### low · `src/app/dashboard/page.tsx:107` + `:203`

> ```ts
> } catch { /* ignore */ }
> ```

**Why this matters:** Two empty catches around localStorage access. Quota-exceeded or private-mode storage rejection is silently ignored. Low severity (these are display-only side-effects, not data).

**Suggested remediation (advisory only):** Same as other empty catches — at least log.

---

### E8 — Resource leaks

#### high · `src/hooks/useSyncQueue.ts:127-134`

> ```ts
> useEffect(() => {
>   const id = setInterval(() => {
>     if (navigator.onLine) {
>       flush();
>     }
>   }, FLUSH_INTERVAL_MS);
>   return () => clearInterval(id);
> }, [flush]);
> ```

**Why this matters:** `flush` is a `useCallback` with no dependencies (line 26: `}, []);`), so its identity is stable, so the interval is set up once and cleared on unmount — that part is fine. **But:** `flush` is fired without awaiting completion. If a flush takes >30s (e.g., on a slow connection processing 10 queue items at 3s each), the next interval tick fires while the previous flush is still in flight. The `flushingRef` guard catches this *within* the same hook instance, but if the component remounts mid-flush, the new instance has a fresh ref and runs concurrently. Across a 30+ second flush, this can pile up.

Compounded by the fact that the queue itself is unbounded (no max size on `addToQueue`), a sufficiently failed sync state can grow the localStorage queue past 5MB and **lock out all further localStorage writes** silently, breaking subsequent punches.

**Suggested remediation (advisory only):** Bound the queue at ~200 items with a "queue full" warning. Use a module-scope flush mutex (not a per-instance ref).

---

#### medium · `src/hooks/useLocationTracker.ts:114`

> ```ts
> intervalRef.current = setInterval(check, 60_000);
> ```

**Why this matters:** A 60s interval that's torn down only when `isPunchedIn` flips to false or `userId` clears. If the dashboard tab is backgrounded for hours, the interval keeps firing (modern browsers throttle but don't kill). On a long shift this is ~480 unnecessary `getCurrentPosition` calls minimum.

**Suggested remediation (advisory only):** Pause on `visibilitychange` (the midnight hook already uses this pattern).

---

#### low · `src/components/punch/AnalogClock.tsx:13-15`

> ```ts
> useEffect(() => {
>   const timer = setInterval(() => setTime(new Date()), 1000);
>   return () => clearInterval(timer);
> }, []);
> ```

**Why this matters:** 1Hz timer that's properly cleaned up, but never paused on `visibilitychange`. Backgrounded tabs still tick. Battery drain is low but nonzero. Not Apr-19 critical.

**Suggested remediation (advisory only):** Pause on backgrounded tab.

---

## Skipped / N/A rules

- **K3 (Surgical Changes):** N/A. Per user instruction `--diff-base` is unset; there is no proposed change to vet against a stated task.
- **E5 (Auth / Authorization):** No findings in this scope.
- **E6 (Input Validation):** No findings in this scope.

---

## Subagent execution summary

| Subagent | Status | Findings returned |
|---|---|---|
| karpathy-auditor | inline (no Task tool available in this harness) | 8 (K1: 4, K2: 3, K4: 3 — totals don't add because some findings span rules) |
| surgical-diff-auditor | skipped (K3 N/A — no diff base per user instruction) | 0 |
| error-handling-reviewer | inline | 12 (E7 + cross-cutting) |
| edge-case-hunter | inline | 13 (E1-E4, E8) |
| security-shadow | inline | 0 (no E5/E6 violations in the punch/sync scope) |

**Note on subagent execution:** The harness running this skill exposed `Task*` tools for project-level task tracking only, not the agent-dispatch `Task` tool referenced in `dispatch.md`. Per the skill's failure-modes section ("continue with whatever subagents did return"), the Wave 1 prompt seeds were executed inline against the file inventory in this main thread. This is a deviation from the canonical dispatch protocol — if you want the parallel-subagent execution path, re-invoke from a harness that exposes the agent-dispatching `Task` tool, or run via the Claude Code CLI directly.

---

## Production-safety footer

This report is **read-only**. No code was edited, no tests were run, no
packages were installed, and no git state was modified.

To remediate findings, open a separate session — this skill does not
apply fixes. The `gsd-audit-fix` skill is one option for an audit-to-fix
pipeline; otherwise treat each finding as a candidate ticket and address
them in surgical commits.

**Highest-leverage fix:** Replace the production no-op in `src/lib/utils.ts:78-82` (`logError`) with a real emitter (Sentry, or a server-side log endpoint). Every other error-swallowing finding in this report becomes orders of magnitude easier to triage once errors are no longer silent in production.
