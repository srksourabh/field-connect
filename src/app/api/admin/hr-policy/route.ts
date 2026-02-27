import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "documents";

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("hr_profiles")
    .select("role, designation")
    .eq("id", user.id)
    .is("deactivated_at", null)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) return null;

  const isUniversal = profile.role === "super_admin" ||
    (profile.designation?.toLowerCase().includes("hr") ?? false);

  return isUniversal ? { id: user.id } : null;
}

// GET: return current HR policy URL
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("hr_config")
    .select("value, updated_at")
    .eq("key", "hr_policy_url")
    .single();

  return NextResponse.json({ url: data?.value || null, updatedAt: data?.updated_at || null });
}

// POST: upload document and save URL
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate: only PDF, max 10 MB
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
  }

  // Ensure bucket exists
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: false });
  }

  // Upload file (overwrite previous)
  const filePath = `hr-policy/hr-policy.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  // Upsert hr_config
  const { error: configError } = await supabaseAdmin
    .from("hr_config")
    .upsert(
      { key: "hr_policy_url", value: publicUrl, updated_by: admin.id, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (configError) {
    return NextResponse.json({ error: `Config update failed: ${configError.message}` }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl });
}

// DELETE: remove HR policy
export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Remove file from storage
  await supabaseAdmin.storage.from(BUCKET).remove(["hr-policy/hr-policy.pdf"]);

  // Clear config value
  await supabaseAdmin
    .from("hr_config")
    .update({ value: null, updated_by: admin.id, updated_at: new Date().toISOString() })
    .eq("key", "hr_policy_url");

  return NextResponse.json({ success: true });
}
