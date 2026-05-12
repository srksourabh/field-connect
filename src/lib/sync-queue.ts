export interface SyncQueueItem {
  id: string;
  type: "punch_in" | "punch_out" | "location_log" | "leave_request";
  payload: Record<string, unknown>;
  timestamp: string;
  retryCount?: number;
}

const QUEUE_KEY = "uds_sync_queue";
const DEAD_LETTER_KEY = "uds_sync_dead_letter";
const MAX_RETRIES = 5;

export { MAX_RETRIES };

export function getQueue(): SyncQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToQueue(item: SyncQueueItem) {
  const queue = getQueue();
  queue.push({ ...item, retryCount: item.retryCount ?? 0 });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string) {
  const queue = getQueue().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function updateQueueItem(id: string, updates: Partial<SyncQueueItem>) {
  const queue = getQueue();
  const idx = queue.findIndex((item) => item.id === id);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...updates };
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

export function moveToDeadLetter(item: SyncQueueItem) {
  // Remove from active queue
  removeFromQueue(item.id);
  // Add to dead letter storage
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(DEAD_LETTER_KEY);
    const deadLetter: SyncQueueItem[] = stored ? JSON.parse(stored) : [];
    deadLetter.push(item);
    localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(deadLetter));
  } catch {
    // ignore storage errors
  }
}

export function getDeadLetter(): SyncQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEAD_LETTER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}
