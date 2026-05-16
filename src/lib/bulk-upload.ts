// src/lib/bulk-upload.ts

export interface BulkRow {
  // Required
  full_name: string;
  phone: string;
  project: string;
  department: string;
  designation: string;
  // Optional profile
  role?: string;
  employee_code?: string;
  personal_email?: string;
  date_of_joining?: string;          // YYYY-MM-DD
  reporting_manager_phone?: string;  // 10-digit phone of manager
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // KYC
  aadhaar?: string;
  pan?: string;
  bank_name?: string;
  account_no?: string;
  ifsc?: string;
  // Payroll
  basic_salary?: string;
  hra?: string;
  da?: string;
  conveyance_allowance?: string;
  special_allowance?: string;
  medical_allowance?: string;
  tds_regime?: string;   // "old" | "new"
  pf_opted_out?: string; // "true" | "false"
  uan_number?: string;
  // Internal — set during processing
  _rowIndex?: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

// Map CSV header aliases → BulkRow keys
const HEADER_ALIASES: Record<string, keyof BulkRow> = {
  name: "full_name",
  "full name": "full_name",
  mobile: "phone",
  mobile_no: "phone",
  "mobile no": "phone",
  "phone no": "phone",
  "date of joining": "date_of_joining",
  doj: "date_of_joining",
  "employee code": "employee_code",
  "emp code": "employee_code",
  "reporting manager phone": "reporting_manager_phone",
  "manager phone": "reporting_manager_phone",
  "personal email": "personal_email",
  email: "personal_email",
  "basic salary": "basic_salary",
  basic: "basic_salary",
  "conveyance allowance": "conveyance_allowance",
  conveyance: "conveyance_allowance",
  "special allowance": "special_allowance",
  special: "special_allowance",
  "medical allowance": "medical_allowance",
  medical: "medical_allowance",
  "pf opted out": "pf_opted_out",
  "tds regime": "tds_regime",
  "uan number": "uan_number",
  uan: "uan_number",
  "bank name": "bank_name",
  "account no": "account_no",
  "account number": "account_no",
};

export function normalizeHeader(h: string): keyof BulkRow {
  const lower = h.trim().toLowerCase().replace(/[_-]/g, " ");
  return (HEADER_ALIASES[lower] ?? lower.replace(/ /g, "_")) as keyof BulkRow;
}

/** Simple CSV parser — handles quoted cells. Returns [headers, ...rows] */
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let inQuote = false;
    let cell = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === "," && !inQuote) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += ch;
      }
    }
    cells.push(cell.trim());
    result.push(cells);
  }
  return result;
}

export function csvToBulkRows(csvText: string): BulkRow[] {
  const grid = parseCSV(csvText);
  if (grid.length < 2) return [];
  const headers = grid[0].map(normalizeHeader);
  return grid.slice(1).map((cells, i) => {
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      if (cells[j] !== undefined) row[h as string] = cells[j];
    });
    return { ...row, _rowIndex: i + 2 } as BulkRow;
  });
}

const VALID_ROLES = ["employee", "manager", "admin", "super_admin"];

export function validateRows(
  rows: BulkRow[],
  knownProjects: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const projectSet = new Set(knownProjects.map((p) => p.toLowerCase()));

  for (const row of rows) {
    const r = row._rowIndex ?? 0;
    if (!row.full_name?.trim()) errors.push({ row: r, field: "full_name", message: "Name is required" });
    if (!row.phone?.trim()) {
      errors.push({ row: r, field: "phone", message: "Phone is required" });
    } else if (!/^\d{10}$/.test(row.phone.replace(/\D/g, "").slice(-10))) {
      errors.push({ row: r, field: "phone", message: "Phone must be 10 digits" });
    }
    if (!row.project?.trim()) {
      errors.push({ row: r, field: "project", message: "Project is required" });
    } else if (!projectSet.has(row.project.trim().toLowerCase())) {
      errors.push({ row: r, field: "project", message: `Unknown project "${row.project}" — not in master data` });
    }
    if (!row.department?.trim()) errors.push({ row: r, field: "department", message: "Department is required" });
    if (!row.designation?.trim()) errors.push({ row: r, field: "designation", message: "Designation is required" });
    if (row.role && !VALID_ROLES.includes(row.role)) {
      errors.push({ row: r, field: "role", message: `Invalid role "${row.role}"` });
    }
    if (row.tds_regime && !["old", "new"].includes(row.tds_regime)) {
      errors.push({ row: r, field: "tds_regime", message: 'tds_regime must be "old" or "new"' });
    }
  }
  return errors;
}

/**
 * Topological sort so managers in the same batch are inserted before their reports.
 * Rows whose reporting_manager_phone is NOT in the batch are left in original order.
 * Returns { sorted, cyclePhones } — cyclePhones are rows that form a cycle (error).
 */
export function sortByManagerDependency(rows: BulkRow[]): {
  sorted: BulkRow[];
  cyclePhones: string[];
} {
  const phoneMap = new Map<string, BulkRow>();
  for (const row of rows) {
    const p = row.phone?.replace(/\D/g, "").slice(-10);
    if (p) phoneMap.set(p, row);
  }

  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const row of rows) {
    const phone = row.phone?.replace(/\D/g, "").slice(-10) ?? "";
    if (!inDegree.has(phone)) inDegree.set(phone, 0);
    if (!dependents.has(phone)) dependents.set(phone, []);

    const mgr = row.reporting_manager_phone?.replace(/\D/g, "").slice(-10);
    if (mgr && phoneMap.has(mgr)) {
      inDegree.set(phone, (inDegree.get(phone) ?? 0) + 1);
      dependents.get(mgr)!.push(phone);
    }
  }

  const queue: string[] = [];
  for (const [phone, deg] of Array.from(inDegree)) {
    if (deg === 0) queue.push(phone);
  }

  const sorted: BulkRow[] = [];
  while (queue.length > 0) {
    const phone = queue.shift()!;
    sorted.push(phoneMap.get(phone)!);
    for (const dep of dependents.get(phone) ?? []) {
      const newDeg = (inDegree.get(dep) ?? 0) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  const cyclePhones = Array.from(inDegree.entries())
    .filter(([, d]) => d > 0)
    .map(([p]) => p);

  return { sorted, cyclePhones };
}
