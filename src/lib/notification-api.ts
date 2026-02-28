import { supabase } from "./supabase";
import { logError } from "./utils";

export interface HrNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export async function createNotification(data: {
  user_id: string;
  title: string;
  body?: string;
  type: string;
  reference_id?: string;
  reference_type?: string;
}): Promise<HrNotification | null> {
  const { data: record, error } = await supabase
    .from("hr_notifications")
    .insert({
      user_id: data.user_id,
      title: data.title,
      body: data.body ?? null,
      type: data.type,
      reference_id: data.reference_id ?? null,
      reference_type: data.reference_type ?? null,
    })
    .select()
    .single();

  if (error) {
    logError("Create notification error:", error);
    return null;
  }
  return record;
}

export async function getUserNotifications(
  userId: string,
  limit = 20
): Promise<HrNotification[]> {
  const { data, error } = await supabase
    .from("hr_notifications")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logError("Fetch notifications error:", error);
    return [];
  }
  return data || [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("hr_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    logError("Unread count error:", error);
    return 0;
  }
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from("hr_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) {
    logError("Mark as read error:", error);
    return false;
  }
  return true;
}

export async function markAllAsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("hr_notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    logError("Mark all as read error:", error);
    return false;
  }
  return true;
}
