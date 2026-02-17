"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  getQueue,
  removeFromQueue,
  updateQueueItem,
  moveToDeadLetter,
  MAX_RETRIES,
  type SyncQueueItem,
} from "@/lib/sync-queue";
import { createPunchIn, updatePunchOut } from "@/lib/attendance-api";
import { insertLocationLog } from "@/lib/location-api";
import { supabase } from "@/lib/supabase";

const FLUSH_INTERVAL_MS = 30_000;

export function useSyncQueue() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const flushingRef = useRef(false);

  const flush = useCallback(async () => {
    // Prevent concurrent flushes
    if (flushingRef.current) return;
    flushingRef.current = true;

    try {
      const queue = getQueue();
      if (queue.length === 0) return;

      for (const item of queue) {
        try {
          if (item.type === "punch_in") {
            const record = await createPunchIn(item.payload as {
              user_id: string;
              punch_in_at: string;
              punch_in_lat: number | null;
              punch_in_long: number | null;
            });
            removeFromQueue(item.id);

            // Inject attendance_id into queued location logs that lack one
            if (record?.id) {
              const currentQueue = getQueue();
              for (const qItem of currentQueue) {
                if (
                  qItem.type === "location_log" &&
                  !qItem.payload.attendance_id &&
                  qItem.payload.user_id === item.payload.user_id
                ) {
                  updateQueueItem(qItem.id, {
                    payload: { ...qItem.payload, attendance_id: record.id },
                  });
                }
              }
            }
          } else if (item.type === "punch_out") {
            await updatePunchOut(item.payload as {
              user_id: string;
              punch_out_at: string;
              punch_out_lat: number | null;
              punch_out_long: number | null;
            });
            removeFromQueue(item.id);
          } else if (item.type === "location_log") {
            await insertLocationLog(item.payload as {
              user_id: string;
              attendance_id?: string | null;
              lat: number;
              long: number;
              source: "punch_in" | "punch_out" | "scheduled" | "manual";
            });
            removeFromQueue(item.id);
          } else if (item.type === "leave_request") {
            const { error } = await supabase.from("hr_leave_requests").insert(
              item.payload as {
                user_id: string;
                type: string;
                start_date: string;
                end_date: string;
                reason: string | null;
                attachment_url: string | null;
                status: string;
              }
            );
            if (error) throw error;
            removeFromQueue(item.id);
          }
        } catch (err) {
          console.error("Sync failed for item:", item.id, err);
          const retries = (item.retryCount ?? 0) + 1;
          if (retries >= MAX_RETRIES) {
            moveToDeadLetter({ ...item, retryCount: retries });
          } else {
            updateQueueItem(item.id, { retryCount: retries });
          }
          continue;
        }
      }
    } finally {
      flushingRef.current = false;
      setPendingCount(getQueue().length);
    }
  }, []);

  // Set pending count on mount and flush immediately
  useEffect(() => {
    setPendingCount(getQueue().length);
    if (navigator.onLine) {
      flush();
    }
  }, [flush]);

  // Flush when coming back online
  useEffect(() => {
    if (isOnline) {
      flush();
    }
  }, [isOnline, flush]);

  // Periodic flush every 30 seconds while online
  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine) {
        flush();
      }
    }, FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [flush]);

  return { pendingCount, flush };
}

export type { SyncQueueItem };
