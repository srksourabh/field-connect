// scripts/upload-jswan.mjs
// One-shot upload of JSWAN 2.0 O&M employees.
// Run from project root: node scripts/upload-jswan.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = readEnvFile(join(__dirname, "../.env.local"));
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function topoSort(employees) {
  const phoneMap = new Map(employees.map((e) => [e.phone, e]));
  const inDegree = new Map(employees.map((e) => [e.phone, 0]));
  const deps = new Map(employees.map((e) => [e.phone, []]));

  for (const emp of employees) {
    const mgr = emp.reporting_manager_phone;
    if (mgr && phoneMap.has(mgr)) {
      inDegree.set(emp.phone, inDegree.get(emp.phone) + 1);
      deps.get(mgr).push(emp.phone);
    }
  }

  const queue = Array.from(inDegree.entries())
    .filter(([, d]) => d === 0)
    .map(([p]) => p);
  const sorted = [];

  while (queue.length > 0) {
    const phone = queue.shift();
    sorted.push(phoneMap.get(phone));
    for (const dep of deps.get(phone) ?? []) {
      const newDeg = inDegree.get(dep) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  const cycles = Array.from(inDegree.entries())
    .filter(([, d]) => d > 0)
    .map(([p]) => p);
  return { sorted, cycles };
}

async function main() {
  const dataPath = "C:/Users/soura/Downloads/jswan_employees_clean.json";
  const employees = JSON.parse(readFileSync(dataPath, "utf8").replace(/^﻿/, ""));
  console.log(`Loaded ${employees.length} employees from ${dataPath}`);

  const { sorted, cycles } = topoSort(employees);
  if (cycles.length > 0) {
    console.warn(`WARNING: circular manager dependency detected for phones: ${cycles.join(", ")}`);
  }
  console.log(`Topological order ready. Starting upload...\n`);

  const phoneToId = new Map();
  const results = [];

  for (let i = 0; i < sorted.length; i++) {
    const emp = sorted[i];
    const { full_name: name, phone } = emp;
    process.stdout.write(`[${i + 1}/${sorted.length}] ${name} (${phone})... `);

    try {
      const authEmail = `${phone}@uds.hr`;
      const namePart = name.replace(/\s+/g, "").slice(0, 4).toLowerCase();
      const phonePart = phone.slice(-4);
      const password = namePart + phonePart;
      if (password.length < 6) throw new Error("Name too short for password");

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: authEmail,
          password,
          email_confirm: true,
        });
      if (authError) throw new Error(authError.message);
      const userId = authData.user.id;

      // Resolve reporting manager ID
      let reportingManagerId = null;
      if (emp.reporting_manager_phone) {
        if (phoneToId.has(emp.reporting_manager_phone)) {
          reportingManagerId = phoneToId.get(emp.reporting_manager_phone);
        } else {
          const { data: mgr } = await supabase
            .from("hr_profiles")
            .select("id")
            .eq("phone", emp.reporting_manager_phone)
            .is("deactivated_at", null)
            .single();
          reportingManagerId = mgr?.id ?? null;
        }
      }

      const profileRow = {
        id: userId,
        full_name: name,
        phone,
        designation: emp.designation || null,
        department: emp.department,
        project_id: emp.project,
        role: emp.role || "employee",
        reporting_manager_id: reportingManagerId,
        city: emp.city || null,
        tds_regime: "new",
        pf_opted_out: false,
      };

      const { error: profileError } = await supabase
        .from("hr_profiles")
        .insert(profileRow);

      if (profileError) {
        await supabase.auth.admin.deleteUser(userId);
        throw new Error(profileError.message);
      }

      phoneToId.set(phone, userId);

      await supabase.from("hr_leave_balances").insert({
        user_id: userId,
        year: new Date().getFullYear(),
      });

      process.stdout.write("OK\n");
      results.push({ name, phone, success: true });
    } catch (err) {
      process.stdout.write(`FAIL: ${err.message}\n`);
      results.push({ name, phone, success: false, error: err.message });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n=== DONE: ${succeeded} created, ${failed} failed ===`);

  if (failed > 0) {
    console.log("\nFailed:");
    results.filter((r) => !r.success).forEach((r) => {
      console.log(`  ${r.name} (${r.phone}): ${r.error}`);
    });
  }

  const outPath = "C:/Users/soura/Downloads/jswan_upload_results.json";
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${outPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
