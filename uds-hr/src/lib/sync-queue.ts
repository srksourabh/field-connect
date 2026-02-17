export interface SyncQueueItem {
  id: string;
  type: "punch_in" | "punch_out" | "location_log";
  payload: Record<string, unknown>;
  timestamp: string;
}

const QUEUE_KEY = "uds_sync_queue";

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
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string) {
  const queue = getQueue().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}
