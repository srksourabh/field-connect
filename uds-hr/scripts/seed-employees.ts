/**
 * Seed script: creates Supabase auth users + hr_profiles for all employees.
 *
 * Usage: npx tsx scripts/seed-employees.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load env from .env.local
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx);
  const val = trimmed.slice(eqIdx + 1);
  process.env[key] = val;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!serviceRoleKey || serviceRoleKey === "PASTE_YOUR_SERVICE_ROLE_KEY_HERE") {
  console.error("ERROR: Set SUPABASE_SERVICE_ROLE_KEY in .env.local before running this script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- CSV Parsing ---
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n");
  // Handle header line
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  const rows: Record<string, string>[] = [];
  let i = 1;

  while (i < lines.length) {
    let line = lines[i];
    i++;

    if (!line.trim()) continue;

    // Handle multi-line quoted fields
    while (countQuotes(line) % 2 !== 0 && i < lines.length) {
      line += "\n" + lines[i];
      i++;
    }

    const values = parseCSVLine(line);
    if (values.length < 5) continue; // Skip empty/malformed rows

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] || "").trim();
    }
    rows.push(row);
  }

  return rows;
}

function countQuotes(s: string): number {
  let count = 0;
  for (const ch of s) if (ch === '"') count++;
  return count;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// --- Password Generation ---
function generatePassword(name: string, phone: string): string {
  const firstName = name.split(" ")[0].toLowerCase();
  const prefix = firstName.slice(0, 4);
  const suffix = phone.slice(-4);
  return prefix + suffix;
}

// --- Main ---
async function main() {
  console.log("Reading CSV...");
  const csvPath = path.resolve(__dirname, "employees.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);
  console.log(`Parsed ${rows.length} rows from CSV.`);

  // Deduplicate by employee code (keep first occurrence)
  const seen = new Set<string>();
  const uniqueRows: typeof rows = [];
  for (const row of rows) {
    const code = row["employeeCode"];
    if (!code || seen.has(code)) {
      if (code) console.log(`  Skipping duplicate: ${row["Employee Name"]} (${code})`);
      continue;
    }
    seen.add(code);
    uniqueRows.push(row);
  }
  console.log(`${uniqueRows.length} unique employees after dedup.`);

  // Mapping: employee_code → UUID
  const codeToUUID: Record<string, string> = {};
  // Track who reports to whom (by code)
  const reportingMap: Record<string, string> = {}; // employee_code → reporting_manager employee_code
  // Track all codes that are reporting managers (to determine role)
  const managerCodes = new Set<string>();

  for (const row of uniqueRows) {
    const rmId = row["reportingManagerId"];
    if (rmId) {
      managerCodes.add(rmId);
    }
  }

  // Step 0: Create admin user (Sourabh Bhaumik, CEO)
  console.log("\n--- Creating admin user (Sourabh Bhaumik) ---");
  const adminPhone = "9836719911";
  const adminEmail = `${adminPhone}@uds.hr`;
  const adminPassword = generatePassword("Sourabh", adminPhone);
  console.log(`  Email: ${adminEmail}, Password: ${adminPassword}`);

  const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (adminAuthError) {
    if (adminAuthError.message.includes("already been registered")) {
      console.log("  Admin user already exists, fetching...");
      // List users to find by email
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email === adminEmail);
      if (existing) {
        codeToUUID["1"] = existing.id;
        console.log(`  Found existing admin UUID: ${existing.id}`);
      }
    } else {
      console.error("  Error creating admin:", adminAuthError.message);
    }
  } else if (adminAuth?.user) {
    codeToUUID["1"] = adminAuth.user.id;
    console.log(`  Created admin UUID: ${adminAuth.user.id}`);
  }

  // Insert admin profile
  if (codeToUUID["1"]) {
    const { error: profileErr } = await supabase.from("hr_profiles").upsert({
      id: codeToUUID["1"],
      full_name: "Sourabh Bhaumik",
      designation: "CEO",
      phone: adminPhone,
      email: adminEmail,
      employee_code: "1",
      role: "admin",
      date_of_joining: "2013-01-01",
    }, { onConflict: "id" });

    if (profileErr) console.error("  Profile error:", profileErr.message);
    else console.log("  Admin profile created.");
  }

  // Step 1: Create all employee auth users + profiles
  console.log("\n--- Creating employee users ---");
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of uniqueRows) {
    const name = row["Employee Name"];
    const phone = row["phoneNumber"];
    const code = row["employeeCode"];
    const designation = row["designation"];
    const address = row["address"];
    const city = row["city"];
    const state = row["state"];
    const pincode = row["pincode"];
    const dojRaw = row["dateOfJoining"];
    const rmCode = row["reportingManagerId"];

    if (!name || !phone || !code) {
      console.log(`  Skipping row with missing data: ${name || "unknown"}`);
      skipped++;
      continue;
    }

    // Parse date from DD-MM-YYYY to YYYY-MM-DD
    let dateOfJoining: string | null = null;
    if (dojRaw) {
      const parts = dojRaw.split("-");
      if (parts.length === 3) {
        dateOfJoining = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const email = `${phone}@uds.hr`;
    const password = generatePassword(name, phone);

    // Determine role
    let role: "employee" | "manager" | "admin" = "employee";
    if (managerCodes.has(code)) {
      role = "manager";
    }
    // Direct reports to CEO (code "1") are also managers
    if (rmCode === "1") {
      role = "manager";
    }

    // Store reporting chain
    if (rmCode) {
      reportingMap[code] = rmCode;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    let userId: string | null = null;

    if (authError) {
      if (authError.message.includes("already been registered")) {
        // Find existing user
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email === email);
        if (existing) {
          userId = existing.id;
          skipped++;
        }
      } else {
        console.error(`  Error creating ${name}: ${authError.message}`);
        errors++;
        continue;
      }
    } else if (authData?.user) {
      userId = authData.user.id;
      created++;
    }

    if (!userId) {
      console.error(`  Could not get UUID for ${name}`);
      errors++;
      continue;
    }

    codeToUUID[code] = userId;

    // Insert profile
    const { error: profileErr } = await supabase.from("hr_profiles").upsert({
      id: userId,
      full_name: name,
      designation,
      phone,
      email,
      employee_code: code,
      role,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      date_of_joining: dateOfJoining,
    }, { onConflict: "id" });

    if (profileErr) {
      console.error(`  Profile error for ${name}: ${profileErr.message}`);
    }

    // Progress indicator
    if ((created + skipped) % 10 === 0) {
      console.log(`  Processed ${created + skipped + errors}/${uniqueRows.length}...`);
    }
  }

  console.log(`\nAuth users — Created: ${created}, Already existed: ${skipped}, Errors: ${errors}`);

  // Step 2: Update reporting_manager_id using the code→UUID mapping
  console.log("\n--- Setting reporting manager links ---");
  let linked = 0;
  let linkErrors = 0;

  for (const [empCode, rmCode] of Object.entries(reportingMap)) {
    const empUUID = codeToUUID[empCode];
    const rmUUID = codeToUUID[rmCode];

    if (!empUUID) {
      // console.log(`  No UUID for employee ${empCode}, skipping link`);
      linkErrors++;
      continue;
    }
    if (!rmUUID) {
      console.log(`  No UUID for manager code ${rmCode} (employee ${empCode}), skipping link`);
      linkErrors++;
      continue;
    }

    const { error } = await supabase
      .from("hr_profiles")
      .update({ reporting_manager_id: rmUUID })
      .eq("id", empUUID);

    if (error) {
      console.error(`  Link error for ${empCode}: ${error.message}`);
      linkErrors++;
    } else {
      linked++;
    }
  }

  console.log(`Linked ${linked} reporting relationships. Errors: ${linkErrors}`);

  // Step 3: Create leave balances for current year
  console.log("\n--- Creating leave balances ---");
  const currentYear = new Date().getFullYear();
  let balancesCreated = 0;

  for (const uuid of Object.values(codeToUUID)) {
    const { error } = await supabase.from("hr_leave_balances").upsert({
      user_id: uuid,
      year: currentYear,
      sick_leave_total: 12,
      sick_leave_used: 0,
      casual_leave_total: 12,
      casual_leave_used: 0,
      compoff_total: 0,
      compoff_used: 0,
    }, { onConflict: "user_id,year" } as any);

    if (!error) balancesCreated++;
  }

  console.log(`Created ${balancesCreated} leave balance records.`);

  // Summary
  console.log("\n========== SEED COMPLETE ==========");
  console.log(`Total auth users: ${Object.keys(codeToUUID).length}`);
  console.log(`Admin: Sourabh Bhaumik (9836719911 / ${adminPassword})`);
  console.log(`Example employee: Mohammed Shahid (9121025720 / ${generatePassword("Mohammed Shahid", "9121025720")})`);
  console.log("====================================");
}

main().catch(console.error);
