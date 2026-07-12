import { supabase } from "@/lib/supabase";
import type {
  SaudiEmployee, SaudiDepartment, SaudiLeaveRequest,
  SaudiPayrollRun, SaudiDocument,
} from "./types";

const BASE = "/api/saudi";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }

  return res.json();
}

export const saudiApi = {
  employees: {
    list: (params?: { department_id?: string; status?: string; search?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return fetchJson<{ employees: SaudiEmployee[] }>(`${BASE}/employees${q ? `?${q}` : ""}`);
    },
    get: (id: string) => fetchJson<{ employee: SaudiEmployee }>(`${BASE}/employees/${id}`),
    create: (data: Partial<SaudiEmployee>) =>
      fetchJson<{ employee: SaudiEmployee }>(`${BASE}/employees`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<SaudiEmployee>) =>
      fetchJson<{ employee: SaudiEmployee }>(`${BASE}/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  departments: {
    list: () => fetchJson<{ departments: SaudiDepartment[] }>(`${BASE}/departments`),
    create: (data: { name: string; parent_department_id?: string }) =>
      fetchJson<{ department: SaudiDepartment }>(`${BASE}/departments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  leave: {
    list: (params?: { employee_id?: string; status?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return fetchJson<{ requests: SaudiLeaveRequest[] }>(`${BASE}/leave${q ? `?${q}` : ""}`);
    },
    create: (data: { employee_id: string; leave_type_id: string; start_date: string; end_date: string }) =>
      fetchJson<{ request: SaudiLeaveRequest }>(`${BASE}/leave`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    approve: (id: string) =>
      fetchJson<{ request: SaudiLeaveRequest }>(`${BASE}/leave`, {
        method: "PUT",
        body: JSON.stringify({ id, status: "approved" }),
      }),
    reject: (id: string) =>
      fetchJson<{ request: SaudiLeaveRequest }>(`${BASE}/leave`, {
        method: "PUT",
        body: JSON.stringify({ id, status: "rejected" }),
      }),
  },

  payroll: {
    list: (status?: string) =>
      fetchJson<{ runs: SaudiPayrollRun[] }>(`${BASE}/payroll${status ? `?status=${status}` : ""}`),
    create: (period_month: string) =>
      fetchJson<{ run: SaudiPayrollRun }>(`${BASE}/payroll`, {
        method: "POST",
        body: JSON.stringify({ period_month }),
      }),
  },

  documents: {
    list: (params?: { employee_id?: string; expiring_soon?: string }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return fetchJson<{ documents: SaudiDocument[] }>(`${BASE}/documents${q ? `?${q}` : ""}`);
    },
  },

  leaveTypes: {
    list: () =>
      supabase.from("saudi_leave_types").select("*").order("name").then(({ data }) => data ?? []),
  },
};
