import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Verify the caller is an admin
  const authHeader = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie");

  const supabaseAnon = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let callerUser = null;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAnon.auth.getUser(token);
    callerUser = data.user;
  }

  if (!callerUser && cookieHeader) {
    const cookieMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
    if (cookieMatch) {
      try {
        const session = JSON.parse(atob(cookieMatch[1]));
        if (session?.access_token) {
          const { data } = await supabaseAnon.auth.getUser(session.access_token);
          callerUser = data.user;
        }
      } catch {
        // Invalid cookie format
      }
    }
  }

  if (!callerUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role")
    .eq("id", callerUser.id)
    .single();

  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  // Fetch target user's profile for password generation
  const { data: targetProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("full_name, phone")
    .eq("id", userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate default password: first 4 letters of name (lowercase) + last 4 digits of phone
  const namePart = targetProfile.full_name
    .replace(/\s+/g, "")
    .slice(0, 4)
    .toLowerCase();
  const phonePart = (targetProfile.phone || "0000").replace(/\D/g, "").slice(-4);
  const newPassword = namePart + phonePart;

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Cannot generate valid password — name or phone too short" },
      { status: 400 }
    );
  }

  // Reset password via Supabase Admin API
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
