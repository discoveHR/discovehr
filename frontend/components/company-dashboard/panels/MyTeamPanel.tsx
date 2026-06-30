"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  type Department,
  type Employee,
  type LeaveRequest,
  createDepartment,
  createEmployee,
  deleteDepartment,
  listDepartments,
  listEmployees,
  listLeaveRequests,
  updateEmployee,
  updateLeaveRequest,
} from "../../../lib/api/company-hrms";

type View = "employees" | "departments" | "leave";

type Props = {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

const STATUS_COLORS: Record<string, string> = {
  Active: "#16a34a",
  Probation: "#ca8a04",
  "On Leave": "#2563eb",
  Resigned: "#9333ea",
  Terminated: "#dc2626",
};

const LEAVE_STATUS_COLORS: Record<string, string> = {
  Pending: "#ca8a04",
  Approved: "#16a34a",
  Rejected: "#dc2626",
  Cancelled: "#6b7280",
};

const TAB_LABELS: Record<View, string> = {
  employees: "Employees",
  departments: "Departments",
  leave: "Leave Requests",
};

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Consultant"];
const EMPLOYEE_STATUSES = ["Active", "Probation", "On Leave", "Resigned", "Terminated"];

const blankEmployee: Partial<Employee> = {
  employee_name: "",
  designation: "",
  department: "",
  employment_type: "Full-time",
  email: "",
  phone: "",
  date_of_joining: "",
};

const PAGE_SIZE = 20;

function empInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : "?";
}

export function MyTeamPanel({ onError, onSuccess }: Props) {
  const [view, setView] = useState<View>("employees");

  // ---- Departments ----
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [deptCreating, setDeptCreating] = useState(false);
  const [deletingDept, setDeletingDept] = useState<string | null>(null);

  // ---- Employees ----
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empTotal, setEmpTotal] = useState(0);
  const [empPage, setEmpPage] = useState(1);
  const [empLoading, setEmpLoading] = useState(true);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empForm, setEmpForm] = useState<Partial<Employee>>(blankEmployee);
  const [empCreating, setEmpCreating] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empSaving, setEmpSaving] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  // ---- Leave ----
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveTotal, setLeaveTotal] = useState(0);
  const [leavePage, setLeavePage] = useState(1);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState("");
  const [updatingLeaveId, setUpdatingLeaveId] = useState<string | null>(null);
  // track whether leave tab has been opened at least once
  const leaveLoadedRef = useRef(false);

  const loadDepartments = useCallback(async () => {
    setDeptLoading(true);
    try { setDepartments(await listDepartments()); }
    catch (e) { onError(e instanceof Error ? e.message : "Failed to load departments."); }
    finally { setDeptLoading(false); }
  }, [onError]);

  const loadEmployees = useCallback(async (page = 1) => {
    setEmpLoading(true);
    try {
      const { employees: list, total } = await listEmployees(page);
      setEmployees(list);
      setEmpTotal(total);
      setEmpPage(page);
    } catch (e) { onError(e instanceof Error ? e.message : "Failed to load employees."); }
    finally { setEmpLoading(false); }
  }, [onError]);

  const loadLeave = useCallback(async (page = 1) => {
    setLeaveLoading(true);
    try {
      const { leave_requests, total } = await listLeaveRequests(
        leaveFilter ? { status: leaveFilter } : {},
        page,
      );
      setLeaveRequests(leave_requests);
      setLeaveTotal(total);
      setLeavePage(page);
    } catch (e) { onError(e instanceof Error ? e.message : "Failed to load leave requests."); }
    finally { setLeaveLoading(false); }
  }, [onError, leaveFilter]);

  // Employees + departments both needed on the initial (employees) view.
  useEffect(() => { void loadDepartments(); void loadEmployees(); }, [loadDepartments, loadEmployees]);

  // Leave is loaded lazily on first switch to the leave tab, and again on filter change.
  useEffect(() => {
    if (view !== "leave") return;
    leaveLoadedRef.current = true;
    void loadLeave(1);
  }, [view, loadLeave]);

  // ---- Department actions ----
  async function handleCreateDept(e: FormEvent) {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    setDeptCreating(true);
    try {
      await createDepartment(deptForm.name.trim(), deptForm.description.trim());
      setDeptForm({ name: "", description: "" });
      onSuccess("Department created.");
      await loadDepartments();
    } catch (e) { onError(e instanceof Error ? e.message : "Failed."); }
    finally { setDeptCreating(false); }
  }

  async function handleDeleteDept(id: string) {
    setDeletingDept(id);
    try {
      await deleteDepartment(id);
      onSuccess("Department deleted.");
      await loadDepartments();
    } catch (e) { onError(e instanceof Error ? e.message : "Failed."); }
    finally { setDeletingDept(null); }
  }

  // ---- Employee actions ----
  async function handleCreateEmp(e: FormEvent) {
    e.preventDefault();
    if (!empForm.employee_name?.trim()) return;
    setEmpCreating(true);
    try {
      await createEmployee(empForm);
      setShowEmpForm(false);
      setEmpForm(blankEmployee);
      onSuccess("Employee added.");
      await loadEmployees(1);
    } catch (e) { onError(e instanceof Error ? e.message : "Failed."); }
    finally { setEmpCreating(false); }
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingEmp) return;
    setEmpSaving(true);
    try {
      await updateEmployee(editingEmp.name, editingEmp);
      setEditingEmp(null);
      onSuccess("Employee updated.");
      await loadEmployees(empPage);
    } catch (e) { onError(e instanceof Error ? e.message : "Failed."); }
    finally { setEmpSaving(false); }
  }

  async function handleTerminate(id: string) {
    setTerminatingId(id);
    try {
      await updateEmployee(id, { status: "Terminated" });
      onSuccess("Employee terminated.");
      await loadEmployees(empPage);
    } catch (e) { onError(e instanceof Error ? e.message : "Failed."); }
    finally { setTerminatingId(null); }
  }

  // ---- Leave actions ----
  async function handleLeaveAction(id: string, status: "Approved" | "Rejected") {
    setUpdatingLeaveId(id);
    try {
      await updateLeaveRequest(id, status);
      onSuccess(`Leave request ${status.toLowerCase()}.`);
      await loadLeave(leavePage);
    } catch (e) { onError(e instanceof Error ? e.message : "Failed."); }
    finally { setUpdatingLeaveId(null); }
  }

  const empTotalPages = Math.ceil(empTotal / PAGE_SIZE) || 1;
  const leaveTotalPages = Math.ceil(leaveTotal / PAGE_SIZE) || 1;

  return (
    <div className="panel-content">
      <div className="panel-header">
        <h2 className="panel-title">My Team</h2>
        <div className="tab-bar">
          {(["employees", "departments", "leave"] as View[]).map((v) => (
            <button key={v} className={`tab-btn${view === v ? " tab-btn--active" : ""}`} onClick={() => setView(v)}>
              {TAB_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* ===== EMPLOYEES ===== */}
      {view === "employees" && (
        <div className="hrms-section">
          <div className="hrms-section-header">
            <span className="hrms-count">{empTotal} employee{empTotal !== 1 ? "s" : ""}</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowEmpForm((v) => !v)}>
              {showEmpForm ? "Cancel" : "+ Add Employee"}
            </button>
          </div>

          {showEmpForm && (
            <form className="hrms-form card" onSubmit={(e) => void handleCreateEmp(e)}>
              <h3 className="hrms-form-title">New Employee</h3>
              <div className="hrms-form-grid">
                <label className="hrms-label">
                  Full Name *
                  <input className="form-input" value={empForm.employee_name || ""} onChange={(e) => setEmpForm((p) => ({ ...p, employee_name: e.target.value }))} required />
                </label>
                <label className="hrms-label">
                  Designation
                  <input className="form-input" value={empForm.designation || ""} onChange={(e) => setEmpForm((p) => ({ ...p, designation: e.target.value }))} />
                </label>
                <label className="hrms-label">
                  Department
                  <select className="form-input" value={empForm.department || ""} onChange={(e) => setEmpForm((p) => ({ ...p, department: e.target.value }))}>
                    <option value="">— none —</option>
                    {departments.map((d) => <option key={d.name} value={d.name}>{d.department_name}</option>)}
                  </select>
                </label>
                <label className="hrms-label">
                  Employment Type
                  <select className="form-input" value={empForm.employment_type || "Full-time"} onChange={(e) => setEmpForm((p) => ({ ...p, employment_type: e.target.value }))}>
                    {EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="hrms-label">
                  Date of Joining
                  <input type="date" className="form-input" value={empForm.date_of_joining || ""} onChange={(e) => setEmpForm((p) => ({ ...p, date_of_joining: e.target.value }))} />
                </label>
                <label className="hrms-label">
                  Email
                  <input type="email" className="form-input" value={empForm.email || ""} onChange={(e) => setEmpForm((p) => ({ ...p, email: e.target.value }))} />
                </label>
                <label className="hrms-label">
                  Phone
                  <input className="form-input" value={empForm.phone || ""} onChange={(e) => setEmpForm((p) => ({ ...p, phone: e.target.value }))} />
                </label>
              </div>
              <div className="hrms-form-actions">
                <button type="submit" className="btn btn-primary" disabled={empCreating}>
                  {empCreating ? "Adding…" : "Add Employee"}
                </button>
              </div>
            </form>
          )}

          {empLoading && employees.length === 0 ? (
            <p className="empty-state">Loading employees…</p>
          ) : employees.length === 0 ? (
            <p className="empty-state">No employees yet. Add your first team member above.</p>
          ) : (
            <>
              <div className="hrms-table-wrap">
                <table className="hrms-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.name}>
                        <td className="hrms-name-cell">
                          <span className="hrms-avatar">{empInitials(emp.employee_name)}</span>
                          <span>{emp.employee_name || "—"}</span>
                        </td>
                        <td>{emp.designation || "—"}</td>
                        <td>{emp.department || "—"}</td>
                        <td>{emp.employment_type || "—"}</td>
                        <td>{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                        <td>
                          <span className="hrms-badge" style={{ background: `${STATUS_COLORS[emp.status || "Active"]}18`, color: STATUS_COLORS[emp.status || "Active"] }}>
                            {emp.status || "Active"}
                          </span>
                        </td>
                        <td className="hrms-actions-cell">
                          <button className="btn btn-sm btn-ghost" onClick={() => setEditingEmp({ ...emp })}>Edit</button>
                          {emp.status !== "Terminated" && (
                            <button
                              className="btn btn-sm btn-danger-ghost"
                              disabled={terminatingId === emp.name}
                              onClick={() => void handleTerminate(emp.name)}
                            >
                              {terminatingId === emp.name ? "…" : "Terminate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {empTotalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-sm btn-ghost" disabled={empPage <= 1} onClick={() => void loadEmployees(empPage - 1)}>← Prev</button>
                  <span className="pagination-label">Page {empPage} of {empTotalPages}</span>
                  <button className="btn btn-sm btn-ghost" disabled={empPage >= empTotalPages} onClick={() => void loadEmployees(empPage + 1)}>Next →</button>
                </div>
              )}
            </>
          )}

          {/* Edit drawer */}
          {editingEmp && (
            <div className="hrms-drawer-backdrop" onClick={() => setEditingEmp(null)}>
              <form className="hrms-drawer" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void handleSaveEdit(e)}>
                <div className="hrms-drawer-header">
                  <h3>Edit Employee</h3>
                  <button type="button" className="btn-close" onClick={() => setEditingEmp(null)}>✕</button>
                </div>
                <div className="hrms-form-grid">
                  <label className="hrms-label">
                    Full Name
                    <input className="form-input" value={editingEmp.employee_name ?? ""} onChange={(e) => setEditingEmp((p) => p && ({ ...p, employee_name: e.target.value }))} />
                  </label>
                  <label className="hrms-label">
                    Designation
                    <input className="form-input" value={editingEmp.designation || ""} onChange={(e) => setEditingEmp((p) => p && ({ ...p, designation: e.target.value }))} />
                  </label>
                  <label className="hrms-label">
                    Department
                    <select className="form-input" value={editingEmp.department || ""} onChange={(e) => setEditingEmp((p) => p && ({ ...p, department: e.target.value }))}>
                      <option value="">— none —</option>
                      {departments.map((d) => <option key={d.name} value={d.name}>{d.department_name}</option>)}
                    </select>
                  </label>
                  <label className="hrms-label">
                    Employment Type
                    <select className="form-input" value={editingEmp.employment_type || "Full-time"} onChange={(e) => setEditingEmp((p) => p && ({ ...p, employment_type: e.target.value }))}>
                      {EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="hrms-label">
                    Status
                    <select className="form-input" value={editingEmp.status || "Active"} onChange={(e) => setEditingEmp((p) => p && ({ ...p, status: e.target.value }))}>
                      {EMPLOYEE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="hrms-label">
                    Date of Joining
                    <input type="date" className="form-input" value={editingEmp.date_of_joining || ""} onChange={(e) => setEditingEmp((p) => p && ({ ...p, date_of_joining: e.target.value }))} />
                  </label>
                  <label className="hrms-label">
                    Email
                    <input type="email" className="form-input" value={editingEmp.email || ""} onChange={(e) => setEditingEmp((p) => p && ({ ...p, email: e.target.value }))} />
                  </label>
                  <label className="hrms-label">
                    Phone
                    <input className="form-input" value={editingEmp.phone || ""} onChange={(e) => setEditingEmp((p) => p && ({ ...p, phone: e.target.value }))} />
                  </label>
                  <label className="hrms-label">
                    Location
                    <input className="form-input" value={editingEmp.location || ""} onChange={(e) => setEditingEmp((p) => p && ({ ...p, location: e.target.value }))} />
                  </label>
                </div>
                <div className="hrms-form-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingEmp(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={empSaving}>{empSaving ? "Saving…" : "Save Changes"}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ===== DEPARTMENTS ===== */}
      {view === "departments" && (
        <div className="hrms-section">
          <form className="hrms-inline-form" onSubmit={(e) => void handleCreateDept(e)}>
            <input
              className="form-input hrms-inline-input"
              placeholder="Department name"
              value={deptForm.name}
              onChange={(e) => setDeptForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <input
              className="form-input hrms-inline-input"
              placeholder="Description (optional)"
              value={deptForm.description}
              onChange={(e) => setDeptForm((p) => ({ ...p, description: e.target.value }))}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={deptCreating}>
              {deptCreating ? "Creating…" : "+ Create"}
            </button>
          </form>

          {deptLoading ? (
            <p className="empty-state">Loading departments…</p>
          ) : departments.length === 0 ? (
            <p className="empty-state">No departments yet.</p>
          ) : (
            <div className="hrms-dept-list">
              {departments.map((dept) => (
                <div key={dept.name} className="hrms-dept-row">
                  <div>
                    <p className="hrms-dept-name">{dept.department_name}</p>
                    {dept.description && <p className="hrms-dept-desc">{dept.description}</p>}
                  </div>
                  <button
                    className="btn btn-sm btn-danger-ghost"
                    disabled={deletingDept === dept.name}
                    onClick={() => void handleDeleteDept(dept.name)}
                  >
                    {deletingDept === dept.name ? "…" : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== LEAVE REQUESTS ===== */}
      {view === "leave" && (
        <div className="hrms-section">
          <div className="hrms-section-header">
            <select className="form-input form-input--sm" value={leaveFilter} onChange={(e) => setLeaveFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {leaveLoading ? (
            <p className="empty-state">Loading leave requests…</p>
          ) : leaveRequests.length === 0 ? (
            <p className="empty-state">No leave requests.</p>
          ) : (
            <>
              <div className="hrms-table-wrap">
                <table className="hrms-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Days</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((lr) => (
                      <tr key={lr.name}>
                        <td>{lr.employee_name || lr.employee}</td>
                        <td>{lr.leave_type}</td>
                        <td>{lr.from_date}</td>
                        <td>{lr.to_date}</td>
                        <td>{lr.total_days ?? "—"}</td>
                        <td>
                          <span className="hrms-badge" style={{ background: `${LEAVE_STATUS_COLORS[lr.status] || "#6b7280"}18`, color: LEAVE_STATUS_COLORS[lr.status] || "#6b7280" }}>
                            {lr.status}
                          </span>
                        </td>
                        <td className="hrms-actions-cell">
                          {lr.status === "Pending" && (
                            <>
                              <button
                                className="btn btn-sm btn-success-ghost"
                                disabled={updatingLeaveId === lr.name}
                                onClick={() => void handleLeaveAction(lr.name, "Approved")}
                              >
                                {updatingLeaveId === lr.name ? "…" : "Approve"}
                              </button>
                              <button
                                className="btn btn-sm btn-danger-ghost"
                                disabled={updatingLeaveId === lr.name}
                                onClick={() => void handleLeaveAction(lr.name, "Rejected")}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {leaveTotalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-sm btn-ghost" disabled={leavePage <= 1} onClick={() => void loadLeave(leavePage - 1)}>← Prev</button>
                  <span className="pagination-label">Page {leavePage} of {leaveTotalPages}</span>
                  <button className="btn btn-sm btn-ghost" disabled={leavePage >= leaveTotalPages} onClick={() => void loadLeave(leavePage + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
