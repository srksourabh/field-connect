# Functions & Hooks Reference

All functions and hooks are in `src/lib/` and `src/hooks/`.

---

## Utilities — `lib/utils.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `cn` | `(...inputs: ClassValue[]) → string` | Merges Tailwind CSS class names using clsx + tailwind-merge, resolving conflicts. |
| `formatDuration` | `(seconds: number) → string` | Converts seconds to `HH:MM:SS` format. |
| `formatTime` | `(date: Date) → string` | Formats a Date as 12-hour time in IST (e.g., "09:30 AM"). |
| `formatDate` | `(date: Date) → string` | Formats a Date as "DD Mon YYYY" in Indian locale. |
| `toISTDateStr` | `(date: Date) → string` | Converts any Date to `YYYY-MM-DD` in IST timezone. |
| `todayIST` | `() → string` | Returns today's date as `YYYY-MM-DD` in IST. |
| `todayISTTimestamp` | `() → string` | Returns today's IST midnight as ISO timestamp (`2026-02-28T00:00:00+05:30`). Used for Supabase `gte` queries. |
| `endOfDayIST` | `(dateStr: string) → string` | Returns `YYYY-MM-DDT23:59:59+05:30` for a given date. Upper bound for date range queries. |
| `autoCloseIST` | `(dateStr: string) → string` | Returns `YYYY-MM-DDT23:59:00+05:30`. Used as the auto-close timestamp for overnight sessions. |
| `isAutoCloseTime` | `(punchOutAt: string) → boolean` | Checks if a punch-out timestamp is 23:59 IST (auto-closed, not manual). |
| `calcLeaveDays` | `(startDate: string, endDate: string) → number` | Calculates inclusive calendar days between two `YYYY-MM-DD` strings using UTC math. |
| `logError` | `(message: string, ...args: unknown[]) → void` | Logs errors only in development mode. Suppressed in production. |

---

## Roles — `lib/roles.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `isAdmin` | `(role: string \| undefined \| null) → boolean` | Returns true if role is `admin` or `super_admin`. |
| `isSuperAdmin` | `(role: string \| undefined \| null) → boolean` | Returns true only for `super_admin`. |
| `isHR` | `(profile: { designation?, role? }) → boolean` | Returns true if designation contains "hr" AND role is admin-level. |
| `isUniversal` | `(profile: { designation?, role? }) → boolean` | Returns true if super_admin or HR. Grants cross-project access throughout the app. |

---

## CSV Export — `lib/csv-export.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `exportToCsv` | `(filename: string, headers: string[], rows: string[][]) → void` | Builds a CSV string, sanitizes cells against injection, creates a Blob, and triggers a browser download. |

---

## Sync Queue — `lib/sync-queue.ts`

Manages the offline sync queue in localStorage (`uds_sync_queue`).

| Function | Signature | Description |
|----------|-----------|-------------|
| `getQueue` | `() → SyncQueueItem[]` | Reads and parses the pending sync queue. Returns `[]` if server-side or on error. |
| `addToQueue` | `(item: SyncQueueItem) → void` | Appends an item to the queue. Initializes `retryCount` to 0. |
| `removeFromQueue` | `(id: string) → void` | Removes an item by ID from the queue. |
| `updateQueueItem` | `(id: string, updates: Partial<SyncQueueItem>) → void` | Merges updates into a queue item by ID. |
| `moveToDeadLetter` | `(item: SyncQueueItem) → void` | Removes from active queue and appends to `uds_sync_dead_letter` after max retries. |
| `clearQueue` | `() → void` | Wipes the entire active queue. |

**Constants:** `MAX_RETRIES = 5`

**Types:** `SyncQueueItem` — `{ id, type: 'punch_in'|'punch_out'|'location_log'|'leave_request', payload, retryCount, createdAt }`

---

## Offline Cache — `lib/offline-cache.ts`

Per-user data caching in localStorage.

| Function | Signature | Description |
|----------|-----------|-------------|
| `cacheSet` | `(userId: string, key: string, data: unknown) → void` | Stores data under `uds_cache_{userId}_{key}` with a timestamp. |
| `cacheGet<T>` | `(userId: string, key: string) → { data: T; updatedAt: number } \| null` | Retrieves cached data. Returns null if not found or on parse error. |

---

## Attendance API — `lib/attendance-api.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `createPunchIn` | `(data: { user_id, punch_in_at, punch_in_lat, punch_in_long }) → Promise<HrAttendance \| null>` | Creates a punch-in attendance record. Checks for an already-open session first. |
| `updatePunchOut` | `(data: { user_id, punch_out_at, punch_out_lat, punch_out_long }) → Promise<HrAttendance \| null>` | Finds today's open session and sets punch-out time and location. |
| `getTodayAttendance` | `(userId: string) → Promise<HrAttendance \| null>` | Fetches the most recent attendance record for today. |
| `getTodayAllSessions` | `(userId: string) → Promise<HrAttendance[] \| null>` | Returns all sessions for today in chronological order. Returns `null` if server unreachable. |
| `computeCumulativeSeconds` | `(sessions: HrAttendance[]) → number` | Sums durations of all completed sessions. |
| `updateAttendanceStatus` | `(userId: string) → Promise<void>` | Recalculates total hours and sets status: `present` (>=4h), `half-day` (1-4h), `absent` (<1h). |
| `getAttendanceByMonth` | `(userId: string, year: number, month: number) → Promise<HrAttendance[]>` | Fetches all records for a calendar month using IST boundaries. |
| `closeStaleSession` | `(session: HrAttendance) → Promise<HrAttendance \| null>` | Auto-closes a session from a previous day at 23:59 IST and computes status. |

---

## Leave API — `lib/leave-api.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getTeamLeaveRequests` | `(managerId: string) → Promise<LeaveRequestWithProfile[]>` | Fetches leave requests for a manager's direct reports with employee names. |
| `approveLeaveRequest` | `(requestId, reviewerId, comment?) → Promise<boolean>` | Approves with overlap check, balance deduction (optimistic concurrency), attendance creation, and notification. |
| `rejectLeaveRequest` | `(requestId, reviewerId, comment?) → Promise<boolean>` | Rejects a pending request and notifies the employee. |
| `getUserLeaveBalance` | `(userId, year?) → Promise<LeaveBalance \| null>` | Fetches leave balance for a user in a given year. |
| `getPendingLeaveCount` | `(userId: string) → Promise<number>` | Returns count of pending leave requests. |
| `withdrawLeaveRequest` | `(requestId, userId) → Promise<boolean>` | Employee withdraws their own pending request, notifies manager. |
| `getUserLeaveRequests` | `(userId: string) → Promise<HrLeaveRequest[]>` | Fetches the most recent 100 leave requests for a user. |

---

## Rectification API — `lib/rectification-api.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `createRectificationRequest` | `(data: {...}) → Promise<HrRectificationRequest \| null>` | Creates a new rectification request with `pending` status. |
| `getUserRectificationRequests` | `(userId) → Promise<HrRectificationRequest[]>` | Fetches the most recent 100 rectification requests by the user. |
| `getTeamRectificationRequests` | `(managerId) → Promise<RectificationWithProfile[]>` | Fetches team requests with employee names. |
| `approveRectificationRequest` | `(requestId, reviewerId, comment?) → Promise<boolean>` | Approves and updates the attendance record with corrected values. |
| `rejectRectificationRequest` | `(requestId, reviewerId, comment?) → Promise<boolean>` | Rejects a pending request and notifies. |

---

## Notification API — `lib/notification-api.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `createNotification` | `(data: { user_id, title, body?, type, reference_id?, reference_type? }) → Promise<HrNotification \| null>` | Inserts a new notification for a user. |
| `getUserNotifications` | `(userId, limit?) → Promise<HrNotification[]>` | Fetches the most recent N notifications (default 20). |
| `getUnreadCount` | `(userId) → Promise<number>` | Returns count of unread notifications. |
| `markAsRead` | `(notificationId) → Promise<boolean>` | Marks a single notification as read. |
| `markAllAsRead` | `(userId) → Promise<boolean>` | Marks all unread notifications as read. |

---

## Location API — `lib/location-api.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `insertLocationLog` | `(data: { user_id, attendance_id?, lat, long, source }) → Promise<HrLocationLog \| null>` | Inserts a GPS log entry. Source: `punch_in`, `punch_out`, `scheduled`, `manual`. |
| `getTodayLocationLogs` | `(userId) → Promise<HrLocationLog[]>` | Fetches all location logs for today (up to 100). |
| `getLatestLocationsForUsers` | `(userIds: string[]) → Promise<Map<string, HrLocationLog>>` | Returns a Map of userId → most recent log. Used for team tracking. |
| `getLocationLogsByDate` | `(userId, date) → Promise<HrLocationLog[]>` | Fetches logs for a specific date (up to 200). |
| `haversineKm` | `(lat1, lon1, lat2, lon2) → number` | Straight-line distance between two GPS points using the Haversine formula. |
| `snapToRoads` | `(positions, accessToken?) → Promise<[number, number][]>` | Sends GPS points to `/api/snap-to-roads` proxy for Google Roads snapping. Falls back to raw positions. |
| `computeRoadDistanceKm` | `(logs: HrLocationLog[]) → Promise<number>` | Road-snapped total distance in km. Falls back to haversine. |
| `computeTotalDistanceKm` | `(logs: { lat, long }[]) → number` | Haversine-only distance sum (no road snapping). Used server-side. |

---

## Supabase Clients — `lib/supabase.ts` and `lib/supabase-admin.ts`

| Export | File | Description |
|--------|------|-------------|
| `supabase` | `supabase.ts` | Browser-side client (anon key, RLS enforced). Used in client components. |
| `supabaseAdmin` | `supabase-admin.ts` | Server-side client (service role key, bypasses RLS). Marked `"server-only"`. Used in API routes only. |

---

## Hooks — `src/hooks/`

### useGeolocation

```typescript
useGeolocation() → { lat, long, address, loading, error, refresh }
```

Requests device GPS and reverse-geocodes via Google Maps API. Auto-fires on mount. `refresh` re-fetches.

---

### useOnlineStatus

```typescript
useOnlineStatus() → boolean
```

Returns browser online/offline status. Subscribes to window events. Returns `true` during SSR.

---

### usePWAInstall

```typescript
usePWAInstall() → { canInstall, isIOS, isStandalone, isDismissed, promptInstall, dismiss }
```

Manages PWA install banner. Captures `beforeinstallprompt` event, detects iOS Safari, tracks 7-day dismissal in localStorage.

---

### usePunchState

```typescript
usePunchState(userId: string) → {
  isPunchedIn, punchInTime, elapsedSeconds, totalElapsedSeconds,
  sessionCount, autoClosedYesterday, isReady,
  punchIn, punchOut, initFromServer, initFromCache, clearAutoClose
}
```

Central punch state manager. Runs 1-second UI timer when punched in, persists to localStorage every 60 seconds, resets on day change, detects stale overnight sessions. Must be initialized via `initFromServer` or `initFromCache` before `isReady` becomes true.

---

### useMasterData

```typescript
useMasterData(type: "project" | "department" | "designation") → MasterDataItem[]
```

Fetches active items from `hr_master_data` for a given type, sorted by name. Returns `[{ id, name }]`.

---

### useSyncQueue

```typescript
useSyncQueue() → { pendingCount: number, flush: () => Promise<void> }
```

Processes the offline sync queue when online. Handles `punch_in`, `punch_out`, `location_log`, and `leave_request` items. Flushes on mount, on reconnect, and every 30 seconds. Items failing 5 times are moved to dead-letter storage.

---

### useLocationTracker

```typescript
useLocationTracker(isPunchedIn: boolean, userId: string, attendanceId?: string | null, isOnline?: boolean) → void
```

Captures GPS at 5 scheduled daily time slots (09:30, 10:00, 13:00, 16:00, 19:00 IST) with 5-minute tolerance. Only active while punched in. Writes directly to DB when online; queues to sync queue when offline. Tracks captured slots in localStorage to avoid duplicates.
