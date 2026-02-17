"use client";

import { useEffect, useCallback, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import { getQueue, removeFromQueue, type SyncQueueItem } from "@/lib/sync-queue";
import { createPunchIn, updatePunchOut } from "@/lib/attendance-api";
import { insertLocationLog } from "@/lib/location-api";

export function useSyncQueue() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  const flush = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        if (item.type === "punch_in") {
          await createPunchIn(item.payload as {
            user_id: string;
            punch_in_at: string;
            punch_in_lat: number | null;
            punch_in_long: number | null;
          });
        } else if (item.type === "punch_out") {
          await updatePunchOut(item.payload as {
            user_id: string;
            punch_out_at: string;
            punch_out_lat: number | null;
            punch_out_long: number | null;
          });
        } else if (item.type === "location_log") {
          await insertLocationLog(item.payload as {
            user_id: string;
            attendance_id?: string | null;
            lat: number;
            long: number;
            source: "punch_in" | "punch_out" | "scheduled" | "manual";
          });
        }
        removeFromQueue(item.id);
      } catch (err) {
        console.error("Sync failed for item:", item.id, err);
        break;
      }
    }
    setPendingCount(getQueue().length);
  }, []);

  useEffect(() => {
    setPendingCount(getQueue().length);
  }, []);

  useEffect(() => {
    if (isOnline) {
      flush();
    }
  }, [isOnline, flush]);

  return { pendingCount, flush };
}

export type { SyncQueueItem };
