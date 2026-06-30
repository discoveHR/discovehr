import { API_URL, readScoutApiJson, scoutJsonHeaders } from "./client";

export type Department = {
  name: string;
  department_name: string;
  description?: string;
};

export type Employee = {
  name: string;
  employee_name: string;
  designation?: string;
  department?: string;
  employment_type?: string;
  status?: string;
  date_of_joining?: string;
  email?: string;
  phone?: string;
  location?: string;
  reporting_to?: string;
  salary?: number;
  salary_currency?: string;
  bank_account_number?: string;
  bank_name?: string;
  notes?: string;
  job_application?: string;
};

export type LeaveRequest = {
  name: string;
  employee: string;
  employee_name?: string;
  leave_type: string;
  status: string;
  from_date: string;
  to_date: string;
  total_days?: number;
  half_day?: boolean;
  reason?: string;
  approved_by?: string;
  rejection_reason?: string;
};

type HrmsBody<T> = { ok: boolean; message?: string } & T;

function unwrapHrms<T>(raw: Record<string, unknown>): HrmsBody<T> {
  const msg = raw.message;
  if (msg && typeof msg === "object" && msg !== null) return msg as HrmsBody<T>;
  return raw as HrmsBody<T>;
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function listDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_URL}/api/method/scout.api.company.hrms.list_departments`, {
    method: "GET",
    headers: scoutJsonHeaders(),
    credentials: "include",
  });
  const raw = await res.json() as Record<string, unknown>;
  const body = unwrapHrms<{ departments?: Department[] }>(raw);
  return body.departments ?? [];
}

export async function createDepartment(name: string, description?: string): Promise<Department> {
  const res = await fetch(`${API_URL}/api/method/scout.api.company.hrms.create_department`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ name, description }),
  });
  const raw = await res.json() as Record<string, unknown>;
  const body = unwrapHrms<{ department?: Department }>(raw);
  if (!body.ok) throw new Error(body.message || "Failed to create department.");
  return body.department!;
}

export async function deleteDepartment(department_id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/method/scout.api.company.hrms.delete_department`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ department_id }),
  });
  const raw = await res.json() as Record<string, unknown>;
  const body = unwrapHrms<Record<string, unknown>>(raw);
  if (!body.ok) throw new Error((body.message as string | undefined) || "Failed to delete department.");
}

// ── Employees ─────────────────────────────────────────────────────────────────

export async function listEmployees(
  page = 1,
  page_size = 20,
): Promise<{ employees: Employee[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), page_size: String(page_size) });
  const res = await fetch(
    `${API_URL}/api/method/scout.api.company.hrms.list_employees?${params}`,
    { method: "GET", headers: scoutJsonHeaders(), credentials: "include" },
  );
  const raw = await res.json() as Record<string, unknown>;
  const body = unwrapHrms<{ employees?: Employee[]; total?: number }>(raw);
  return { employees: body.employees ?? [], total: body.total ?? 0 };
}

export async function createEmployee(data: Partial<Employee>): Promise<Employee> {
  const res = await fetch(`${API_URL}/api/method/scout.api.company.hrms.create_employee`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify(data),
  });
  const raw = await res.json() as Record<string, unknown>;
  const body = unwrapHrms<{ employee?: Employee }>(raw);
  if (!body.ok) throw new Error(body.message || "Failed to create employee.");
  return body.employee!;
}

export async function updateEmployee(employee_id: string, data: Partial<Employee>): Promise<Employee> {
  const res = await fetch(`${API_URL}/api/method/scout.api.company.hrms.update_employee`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ employee_id, ...data }),
  });
  const raw = await res.json() as Record<string, unknown>;
  const body = unwrapHrms<{ employee?: Employee }>(raw);
  if (!body.ok) throw new Error(body.message || "Failed to update employee.");
  return body.employee!;
}

// ── Leave Requests ────────────────────────────────────────────────────────────

export async function listLeaveRequests(
  filters: { employee_id?: string; status?: string } = {},
  page = 1,
  page_size = 20,
): Promise<{ leave_requests: LeaveRequest[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), page_size: String(page_size) });
  if (filters.employee_id) params.set("employee_id", filters.employee_id);
  if (filters.status) params.set("status", filters.status);
  const res = await fetch(
    `${API_URL}/api/method/scout.api.company.hrms.list_leave_requests?${params}`,
    { method: "GET", headers: scoutJsonHeaders(), credentials: "include" },
  );
  const raw = await res.json() as Record<string, unknown>;
  const body = unwrapHrms<{ leave_requests?: LeaveRequest[]; total?: number }>(raw);
  return { leave_requests: body.leave_requests ?? [], total: body.total ?? 0 };
}

export async function updateLeaveRequest(
  request_id: string,
  status: "Approved" | "Rejected" | "Cancelled",
  rejection_reason?: string,
): Promise<LeaveRequest> {
  const res = await fetch(`${API_URL}/api/method/scout.api.company.hrms.update_leave_request`, {
    method: "POST",
    headers: scoutJsonHeaders({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ request_id, status, rejection_reason }),
  });
  const raw = await res.json() as Record<string, unknown>;
  const body = unwrapHrms<{ leave_request?: LeaveRequest }>(raw);
  if (!body.ok) throw new Error(body.message || "Failed to update leave request.");
  return body.leave_request!;
}

// Re-export readScoutApiJson usage for reference — kept for future use
export { readScoutApiJson };
