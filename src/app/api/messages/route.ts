import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function getCallerProfile(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("id, role, designation, full_name")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  return profile;
}

// POST: any authenticated employee can send a message
export async function POST(req: NextRequest) {
  const profile = await getCallerProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { category, subject, message, is_anonymous } = body;

  const validCategories = ["complaint", "suggestion", "feedback", "other"];
  if (!category || !validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("hr_messages")
    .insert({
      sender_id: profile.id,
      category,
      subject: subject.trim(),
      message: message.trim(),
      is_anonymous: is_anonymous !== false, // default true
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}

// GET: only super_admin / HR can view all messages
export async function GET(req: NextRequest) {
  const profile = await getCallerProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isUniversal = profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") && ["admin", "super_admin"].includes(profile.role));

  if (!isUniversal) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all"; // all, unread
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

  let query = supabaseAdmin
    .from("hr_messages")
    .select("id, sender_id, category, subject, message, is_anonymous, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter === "unread") {
    query = query.eq("is_read", false);
  }

  const { data: messages, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For non-anonymous messages, include sender name
  const senderIds = (messages || [])
    .filter((m) => !m.is_anonymous)
    .map((m) => m.sender_id);

  let senderNames: Record<string, string> = {};
  if (senderIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("hr_profiles")
      .select("id, full_name")
      .in("id", senderIds);
    senderNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name]));
  }

  const items = (messages || []).map((m) => ({
    ...m,
    sender_name: m.is_anonymous ? null : (senderNames[m.sender_id] || "Unknown"),
  }));

  // Unread count
  const { count } = await supabaseAdmin
    .from("hr_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  return NextResponse.json({ messages: items, unreadCount: count || 0 });
}

// PATCH: mark message as read
export async function PATCH(req: NextRequest) {
  const profile = await getCallerProfile(req);
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isUniversal = profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") && ["admin", "super_admin"].includes(profile.role));
  if (!isUniversal) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("hr_messages")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
