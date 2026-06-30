"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { Department, Employee, LeaveRequest } from "../../../lib/api/company-hrms";
import {
  createDepartment,
  createEmployee,
  deleteDepartment,
  listDepartments,
  listEmployees,
  listLeaveRequests,
  updateEmployee,
  updateLeaveRequest,
} from "../../../lib/api/company-hrms";

// ── Shared helpers ────────────────────────────────────────────────────────────

type Tab = "employees" | "departments" | "leave";

const EMP_TYPES = ["Full-time", "Part-time", "Contract", "Intern"];
const EMP_STATUSES = ["Active", "On Leave", "Resigned", "Terminated"];
const LEAVE_TYPES = ["Annual", "Sick", "Maternity", "Paternity", "Unpaid", "Other"];

function fmt(date?: string) {
  if (!date) return "—";
  try { return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return date; }
}

function statusBadge(s?: string) {
  const cls = s === "Active" || s === "Approved" ? "hrms-badge hrms-badge--green"
    : s === "Pending" ? "hrms-badge hrms-badge--amber"
    : s === "Rejected" || s === "Terminated" || s === "Resigned" ? "hrms-badge hrms-badge--red"
    : "hrms-badge hrms-badge--gray";
  return <span className={cls}>{s || "—"}</span>;
}

// ── Main panel ────────────────────────────────────────────────────────────────

type Props = {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

export function CompanyHrmsPanel({ onError, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>("employees");

  return (
    <div className="hrms-root">
      <div className="hrms-header">
        <div>
          <h2 className="hrms-title">HRMS</h2>
          <p className="hrms-sub">Manage employees, departments, and leave requests.</p>
        </div>
      </div>

      <div className="hrms-tabs">
        {(["employees", "departments", "leave"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`hrms-tab${tab === t ? " hrms-tab--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "employees" ? "Employees" : t === "departments" ? "Departments" : "Leave Requests"}
          </button>
        ))}
      </div>

      <div className="hrms-body">
        {tab === "employees" && <EmployeesTab onError={onError} onSuccess={onSuccess} />}
        {tab === "departments" && <DepartmentsTab onError={onError} onSuccess={onSuccess} />}
        {tab === "leave" && <LeaveTab onError={onError} onSuccess={onSuccess} />}
      </div>
    </div>
  );
}

// ── Employees tab ─────────────────────────────────────────────────────────────

function EmployeesTab({ onError, onSuccess }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({
    employee_name: "", designation: "", department: "", employment_type: "Full-time",
    date_of_joining: "", email: "", phone: "", location: "", salary: 0, salary_currency: "INR",
  });

  const PAGE_SIZE = 15;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([listEmployees(p, PAGE_SIZE), listDepartments()]);
      setEmployees(empRes.employees);
      setTotal(empRes.total);
      setDepartments(deptRes);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [page, onError]);

  useEffect(() => { void load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function openAdd() {
    setEditEmp(null);
    setForm({ employee_name: "", designation: "", department: "", employment_type: "Full-time",
      date_of_joining: new Date().toISOString().slice(0, 10), email: "", phone: "",
      location: "", salary: 0, salary_currency: "INR" });
    setShowForm(true);
  }

  function openEdit(emp: Employee) {
    setEditEmp(emp);
    setForm({ ...emp });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editEmp) {
        const updated = await updateEmployee(editEmp.name, form);
        setEmployees((prev) => prev.map((x) => x.name === updated.name ? updated : x));
        onSuccess("Employee updated.");
      } else {
        await createEmployee(form);
        onSuccess("Employee added.");
        void load(1);
        setPage(1);
      }
      setShowForm(false);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const deptName = (id?: string) => departments.find((d) => d.name === id)?.department_name ?? id ?? "—";

  return (
    <div>
      <div className="hrms-action-bar">
        <span className="hrms-count">{total} employee{total !== 1 ? "s" : ""}</span>
        <button type="button" className="hrms-btn hrms-btn--primary" onClick={openAdd}>+ Add Employee</button>
      </div>

      {loading ? (
        <div className="hrms-loading"><span className="hrms-spinner" />Loading employees…</div>
      ) : employees.length === 0 ? (
        <div className="hrms-empty">
          <div className="hrms-empty-icon">👥</div>
          <p className="hrms-empty-title">No employees yet</p>
          <p className="hrms-empty-sub">Add your first employee to get started.</p>
          <button type="button" className="hrms-btn hrms-btn--primary" onClick={openAdd}>+ Add Employee</button>
        </div>
      ) : (
        <>
          <div className="hrms-table-wrap">
            <table className="hrms-table">
              <thead>
                <tr>
                  <th>Name</th><th>Designation</th><th>Department</th>
                  <th>Type</th><th>Joined</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.name}>
                    <td>
                      <div className="hrms-emp-name">{emp.employee_name}</div>
                      {emp.email && <div className="hrms-emp-email">{emp.email}</div>}
                    </td>
                    <td>{emp.designation || "—"}</td>
                    <td>{deptName(emp.department)}</td>
                    <td>{emp.employment_type || "—"}</td>
                    <td>{fmt(emp.date_of_joining)}</td>
                    <td>{statusBadge(emp.status)}</td>
                    <td>
                      <button type="button" className="hrms-row-btn" onClick={() => openEdit(emp)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="hrms-pagination">
              <button className="hrms-page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="hrms-page-info">Page {page} of {totalPages}</span>
              <button className="hrms-page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="hrms-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="hrms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hrms-modal-header">
              <h3>{editEmp ? "Edit Employee" : "Add Employee"}</h3>
              <button type="button" className="hrms-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="hrms-form" onSubmit={(e) => void handleSubmit(e)}>
              <div className="hrms-form-grid">
                <div className="hrms-field hrms-field--full">
                  <label>Full Name *</label>
                  <input required value={form.employee_name ?? ""} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} placeholder="Employee name" />
                </div>
                <div className="hrms-field">
                  <label>Designation</label>
                  <input value={form.designation ?? ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Software Engineer" />
                </div>
                <div className="hrms-field">
                  <label>Department</label>
                  <select value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    <option value="">— None —</option>
                    {departments.map((d) => <option key={d.name} value={d.name}>{d.department_name}</option>)}
                  </select>
                </div>
                <div className="hrms-field">
                  <label>Employment Type</label>
                  <select value={form.employment_type ?? "Full-time"} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
                    {EMP_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {editEmp && (
                  <div className="hrms-field">
                    <label>Status</label>
                    <select value={form.status ?? "Active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {EMP_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                <div className="hrms-field">
                  <label>Date of Joining</label>
                  <input type="date" value={form.date_of_joining ?? ""} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} />
                </div>
                <div className="hrms-field">
                  <label>Email</label>
                  <input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="work email" />
                </div>
                <div className="hrms-field">
                  <label>Phone</label>
                  <input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
                </div>
                <div className="hrms-field">
                  <label>Location</label>
                  <input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City / Office" />
                </div>
                <div className="hrms-field">
                  <label>Salary (₹)</label>
                  <input type="number" min={0} value={form.salary ?? 0} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} />
                </div>
              </div>
              <div className="hrms-form-actions">
                <button type="button" className="hrms-btn hrms-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="hrms-btn hrms-btn--primary" disabled={saving}>
                  {saving ? "Saving…" : editEmp ? "Save Changes" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Departments tab ───────────────────────────────────────────────────────────

function DepartmentsTab({ onError, onSuccess }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDepartments(await listDepartments()); }
    catch (e) { onError(e instanceof Error ? e.message : "Failed to load departments."); }
    finally { setLoading(false); }
  }, [onError]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const d = await createDepartment(newName.trim(), newDesc.trim() || undefined);
      setDepartments((prev) => [...prev, d]);
      setNewName(""); setNewDesc(""); setShowForm(false);
      onSuccess("Department created.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to create department.");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.name !== id));
      onSuccess("Department deleted.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to delete department.");
    } finally { setDeletingId(null); }
  }

  return (
    <div>
      <div className="hrms-action-bar">
        <span className="hrms-count">{departments.length} department{departments.length !== 1 ? "s" : ""}</span>
        <button type="button" className="hrms-btn hrms-btn--primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New Department"}
        </button>
      </div>

      {showForm && (
        <form className="hrms-inline-form" onSubmit={(e) => void handleCreate(e)}>
          <input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Department name" className="hrms-inline-input" autoFocus />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" className="hrms-inline-input" />
          <button type="submit" className="hrms-btn hrms-btn--primary" disabled={saving}>{saving ? "Creating…" : "Create"}</button>
        </form>
      )}

      {loading ? (
        <div className="hrms-loading"><span className="hrms-spinner" />Loading departments…</div>
      ) : departments.length === 0 ? (
        <div className="hrms-empty">
          <div className="hrms-empty-icon">🏢</div>
          <p className="hrms-empty-title">No departments yet</p>
          <p className="hrms-empty-sub">Create departments to organize your team.</p>
        </div>
      ) : (
        <div className="hrms-dept-grid">
          {departments.map((d) => (
            <div key={d.name} className="hrms-dept-card">
              <div className="hrms-dept-icon">
                {d.department_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hrms-dept-info">
                <p className="hrms-dept-name">{d.department_name}</p>
                {d.description && <p className="hrms-dept-desc">{d.description}</p>}
              </div>
              <button
                type="button"
                className="hrms-delete-btn"
                disabled={deletingId === d.name}
                onClick={() => void handleDelete(d.name)}
                title="Delete department"
              >
                {deletingId === d.name ? "…" : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Leave Requests tab ────────────────────────────────────────────────────────

function LeaveTab({ onError, onSuccess }: Props) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const PAGE_SIZE = 15;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await listLeaveRequests({ status: statusFilter || undefined }, p, PAGE_SIZE);
      setRequests(res.leave_requests);
      setTotal(res.total);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to load leave requests.");
    } finally { setLoading(false); }
  }, [page, statusFilter, onError]);

  useEffect(() => { void load(page); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAction(id: string, status: "Approved" | "Rejected") {
    setUpdatingId(id);
    try {
      const updated = await updateLeaveRequest(id, status);
      setRequests((prev) => prev.map((r) => r.name === id ? { ...r, status: updated.status } : r));
      onSuccess(`Leave request ${status.toLowerCase()}.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Update failed.");
    } finally { setUpdatingId(null); }
  }

  return (
    <div>
      <div className="hrms-action-bar">
        <span className="hrms-count">{total} request{total !== 1 ? "s" : ""}</span>
        <select
          className="hrms-filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="hrms-loading"><span className="hrms-spinner" />Loading leave requests…</div>
      ) : requests.length === 0 ? (
        <div className="hrms-empty">
          <div className="hrms-empty-icon">📋</div>
          <p className="hrms-empty-title">No leave requests</p>
          <p className="hrms-empty-sub">Leave requests submitted by employees will appear here.</p>
        </div>
      ) : (
        <>
          <div className="hrms-table-wrap">
            <table className="hrms-table">
              <thead>
                <tr>
                  <th>Employee</th><th>Leave Type</th><th>From</th><th>To</th>
                  <th>Days</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.name}>
                    <td><div className="hrms-emp-name">{r.employee_name || r.employee}</div></td>
                    <td>{r.leave_type}</td>
                    <td>{fmt(r.from_date)}</td>
                    <td>{fmt(r.to_date)}</td>
                    <td>{r.total_days ?? "—"}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      {r.status === "Pending" && (
                        <div className="hrms-leave-actions">
                          <button
                            type="button"
                            className="hrms-btn hrms-btn--approve"
                            disabled={updatingId === r.name}
                            onClick={() => void handleAction(r.name, "Approved")}
                          >
                            {updatingId === r.name ? "…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="hrms-btn hrms-btn--reject"
                            disabled={updatingId === r.name}
                            onClick={() => void handleAction(r.name, "Rejected")}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="hrms-pagination">
              <button className="hrms-page-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="hrms-page-info">Page {page} of {totalPages}</span>
              <button className="hrms-page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
