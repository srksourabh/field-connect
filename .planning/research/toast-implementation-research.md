# Toast Implementation Research — Punch Error Surfacing

Research-only. No code was written or modified.

---

## 1. Existing toast/notification surface

### Toast.tsx — already exists and is production-ready

`src/components/ui/Toast.tsx` is a fully functional, hand-rolled toast system (78 lines, `"use client"`).

Architecture: module-level singleton pattern. A mutable `addToastFn` variable is set by `ToastContainer` via `useEffect`. The exported `showToast(message, type)` function calls it imperatively — no React context required at the call site.

Public API:
- `showToast(message: string, type: "success" | "error" | "info"): void` — call from anywhere
- `ToastContainer` — must be mounted once in the tree to register the handler

Types supported: `success` | `error` | `info` (info uses the same AlertCircle icon as error — a minor cosmetic gap).

Auto-dismiss: 3 seconds (hardcoded `setTimeout`). Manual dismiss via X button.

Styling: Tailwind `rounded-xl border shadow-lg`, full dark mode support, uses `lucide-react` icons (CheckCircle, AlertCircle, X). Matches project design language exactly.

Positioning: `fixed top-4 left-1/2 -translate-x-1/2 z-[9999]` — centered top, above everything. `max-w-md w-full px-4`. Mobile-safe.

Accessibility: `aria-live="polite"` and `role="status"` on the container.

Animation: `animate-in slide-in-from-top` (Tailwind animate-in plugin or custom class — planner should verify this class is defined in globals.css before relying on it).

### ToastContainer mounting location

`ToastContainer` is already mounted in `src/app/layout.tsx` (root layout), line 44 — outside all route segments, outside `AuthProvider`, outside `MobileShell`. This is correct: it means toasts work on every page including `/login` and `/onboard`.

The dashboard layout (`src/app/dashboard/layout.tsx`) does NOT have its own toast root. No provider nesting conflict.

### No third-party toast library

`package.json` has zero `@radix-ui/*` packages. No `react-hot-toast`, `sonner`, `react-toastify`, or any other toast/notification library. The project is deliberately hand-rolled, not shadcn-trajectory.

### No native browser alerts in the punch path

`grep alert(` found only one hit: a comment in `Dialog.tsx` describing it as a "replacement for window.confirm()". No `alert()` or `window.alert()` calls exist anywhere in `src/`.

### hr_notifications — persistent DB notifications, not in-app toasts

`src/lib/notification-api.ts` writes to/reads from the `hr_notifications` Supabase table. These are admin-broadcast, persistent records (title, body, type, is_read). The `NotificationDropdown` component polls and renders them as a bell-icon dropdown. They are completely separate from the ephemeral toast system. No overlap or conflict.

---

## 2. Error-handling patterns in the punch hot path

### logError signature (src/lib/utils.ts:78-82)

```typescript
export function logError(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(message, ...args);
  }
}
```

Behaviour: development-only `console.error`. In production it does nothing — no user-visible output, no reporting, no side effects. It is purely a dev logging utility.

### logError call sites in the punch hot path

| File | Line | Error logged | UI consequence today |
|------|------|--------------|----------------------|
| `attendance-api.ts:41` | createPunchIn failure | `"Punch in error:"` | Returns `null` to caller |
| `attendance-api.ts:69` | updatePunchOut failure | `"Punch out error:"` | Returns `null` to caller |
| `useSyncQueue.ts:94` | Sync flush failure per item | `"Sync failed for item:"` | Increments retryCount; on max retries calls `showToast(...)` (already wired) |

Non-punch hot-path logError sites (attendance-api.ts:101, :157, :176, :206) are for session fetch, stale session close — not the core punch toggle.

### What happens to the UI after each catch

**createPunchIn returns null (punch-in failure, online path):**
- `dashboard/page.tsx:221-225`: The code checks `if (record)` — when `record` is null, it calls `punchOut()` (revert) and `showToast("Punch-in failed. Please try again.", "error")` then `return`.
- The revert IS complete: `punchOut()` sets `isPunchedIn: false`, clears `punchInTime`, resets `elapsedSeconds` to 0, and saves to localStorage. The user sees the slider snap back.
- `showToast` IS already called here. **This path is already handled.**

**updatePunchOut returns null (punch-out failure, online path):**
- `dashboard/page.tsx:271-292`: `punchOut()` is called BEFORE the await (line 262), so state is already reverted optimistically. `updatePunchOut(payload)` is awaited but its return value is NOT checked.
- If `updatePunchOut` fails (throws or returns null), the catch at the outer `try/finally` (line 318) only releases `punchingRef`. There is NO `showToast` call. There is NO revert of the optimistic `punchOut()` — but since punchOut was already called, the state IS committed locally even though the server write failed. The user is now punched-out locally but the record may not exist in the DB. **This is the gap. No user-visible error signal on punch-out failure.**

**useSyncQueue dead-letter path:**
- Already calls `showToast(...)` on line 98. The message format is: `"Failed to sync punch_in after 5 attempts."` (with underscore in type name — a minor formatting bug).

---

## 3. Optimistic UI revert analysis (dashboard/page.tsx lines 192-320)

### State variables involved in punch-in revert (lines 221-225)

When `createPunchIn` returns null:
- `punchOut()` is called — reverts: `isPunchedIn`, `punchInTime`, `elapsedSeconds`, `cumulativeSeconds` (adds 0), saves localStorage
- `showToast("Punch-in failed. Please try again.", "error")` — visible signal IS present
- `return` exits the handler early (location log is skipped)
- `setAttendanceId` is never called (stays null) — correct
- `setFirstPunchIn` was already called before the `createPunchIn` await only if the condition `!firstPunchIn` was true and it was the first session — this IS a partial state gap: `firstPunchIn` state is set but then NOT reverted on failure. Minor issue.

### usePunchState persistence model

`usePunchState` persists to localStorage every 60 seconds via `saveIntervalRef` (not on every tick). On `punchOut()` it saves immediately via `saveState()`. So after a punch-out revert, the reverted state IS immediately persisted to localStorage. No half-state in localStorage.

### Punch-out revert — the actual gap

`punchOut()` is called at line 262 (before the server call). If `updatePunchOut` throws, the `finally` block at line 318-320 releases the debounce lock. But:
- The state remains `isPunchedIn: false` (the user appears punched out)
- The server has no record
- No error is shown

---

## 4. Sync queue dead-letter details

### Keys and shape

- Active queue key: `uds_sync_queue`
- Dead-letter key: `uds_sync_dead_letter`
- Item shape: `{ id: string, type: "punch_in"|"punch_out"|"location_log"|"leave_request", payload: Record<string,unknown>, timestamp: string, retryCount?: number }`
- Max retries: 5 (constant `MAX_RETRIES` in `sync-queue.ts`)
- Size cap: none — no `slice` or `MAX_SIZE` guard in `moveToDeadLetter`
- Reader: nothing reads from `uds_sync_dead_letter` in the codebase today. The `showToast` on line 98 of `useSyncQueue.ts` is the only signal — fired at the moment of dead-lettering.

### Dead-letter UX surface options evaluated

| Option | Fit with existing design | Notes |
|--------|--------------------------|-------|
| Persistent banner at top | High — `SyncStatusBanner` already exists in `src/components/punch/SyncStatusBanner.tsx` and renders inline in the dashboard above the activity grid. Could be extended to show dead-letter count. | Best fit: zero new components needed, same location, same design language. |
| Badge on header icon | Medium — would require a new icon or modifying NotificationDropdown | More engineering, less intuitive for a "sync failed" signal |
| Session-start modal | Low — disruptive for a background sync event | Too heavy |
| Inline text in activity grid | Low — the grid is date-indexed, dead-letter items may be from prior sessions | Misleading placement |

Recommendation (for planner consideration, not a decision): extend `SyncStatusBanner` to show dead-letter count when `uds_sync_dead_letter` has items. The banner already handles the "pending" and "offline" states; a third state for "failed items" is a natural extension. The `useSyncQueue` hook could export a `deadLetterCount` alongside `pendingCount`.

---

## 5. ToastProvider mounting strategy

**No new provider is needed.** The existing `ToastContainer` in `src/app/layout.tsx` is already the provider. It uses a module-level singleton pattern, not React context, so `showToast` can be called from anywhere without prop-drilling or context access.

The `addToastFn` singleton is set in `useEffect` with a cleanup — safe for React strict mode (double-invoke) because the second registration overwrites the first. No race condition risk.

`"use client"` is declared at the top of `Toast.tsx` — correct for App Router. The root layout (`src/app/layout.tsx`) itself does NOT have `"use client"` (it's a server component), but `ToastContainer` is a client component imported into it — Next.js handles this correctly via the client boundary.

If the plan adds a "retry" action button on the toast, it needs access to `useSyncQueue`'s `flush` function. Since `showToast` is imperative (not context-based), a retry callback must be passed as a parameter. This is an **architectural constraint**: the current `ToastData` shape only holds `{ id, message, type }`. A retry action would require adding an optional `action?: { label: string; onClick: () => void }` field to `ToastData` and updating the render in `ToastContainer`.

---

## 6. shadcn-style vs hand-rolled

No `@radix-ui/*` packages in `package.json`. The project is deliberately hand-rolled: custom Dialog, custom Toast, custom components throughout. There is no shadcn alignment. Adding any Radix primitive would be a new dependency introduction and inconsistent with the project's approach.

---

## 7. PWA / offline considerations

The toast system has zero network dependency — it is pure client-side React state in `ToastContainer`. It works offline.

The `showToast` call in `useSyncQueue.ts:98` is already triggered in the sync flush path, which only runs when online. Dead-letter toasts will therefore only appear when connectivity has been restored and the flush has exhausted retries. This is correct behaviour — users won't see "sync failed" toasts while offline.

Public API of `useSyncQueue` (what it exports):
- `pendingCount: number` — count of items in active queue
- `flush: () => Promise<void>` — manually trigger a flush

It does NOT currently export `deadLetterCount`. The `moveToDeadLetter` and `getQueue` utilities are exported from `src/lib/sync-queue.ts` directly and could be used to build a `deadLetterCount` derived value.

---

## Summary for planner

1. **Toast library**: none — hand-rolled `Toast.tsx` already exists and is already wired
2. **logError call sites in punch hot path**: 3 (createPunchIn, updatePunchOut, useSyncQueue flush)
3. **hr_notifications**: persistent server-side notification records (bell dropdown), not ephemeral toasts
4. **ToastProvider mounting**: already mounted in root layout — no action needed
5. **Dead-letter UX**: extend existing `SyncStatusBanner` component (already in punch UI, same design language)
6. **Single most important constraint**: `showToast` is already called on punch-in failure. The actual gap is punch-out failure — `updatePunchOut` return value is never checked and no toast is shown; the punch-out itself is irreversible (state already committed by `punchOut()` before the server call, so no re-punch-in revert is possible). The plan must handle punch-out errors differently from punch-in errors: show an informational toast ("Punch-out recorded locally") rather than attempting a state revert.
