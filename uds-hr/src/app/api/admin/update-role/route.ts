import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  // 1. Parse body
  const { userId, newRole } = await req.json();

  if (!userId || !newRole || !["employee", "manager", "admin", "super_admin"].includes(newRole)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 2. Verify the caller is an admin by checking the auth token
  const authHeader = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie");

  // Get the Supabase token from either auth header or cookie
  const supabaseAnon = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Try to get user from session cookie
  let callerUser = null;
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseAnon.auth.getUser(token);
    callerUser = data.user;
  }

  if (!callerUser && cookieHeader) {
    const cookieMatch = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
    if (cookieMatch?.[1]) {
      try {
        const decoded = decodeURIComponent(cookieMatch[1]);
        const session = JSON.parse(decoded.startsWith("base64-") ? atob(decoded.slice(7)) : atob(decoded));
        if (session?.access_token) {
          const { data } = await supabaseAnon.auth.getUser(session.access_token);
          callerUser = data.user;
        }
      } catch {
        // Invalid cookie format — skip
      }
    }
  }

  if (!callerUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Verify caller is admin using service role client (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: callerProfile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role")
    .eq("id", callerUser.id)
    .single();

  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  // Only super_admin can assign super_admin role
  if (newRole === "super_admin" && callerProfile.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can assign super_admin role" }, { status: 403 });
  }

  // 4. Update the target user's role
  const { error } = await supabaseAdmin
    .from("hr_profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, role: newRole });
}
