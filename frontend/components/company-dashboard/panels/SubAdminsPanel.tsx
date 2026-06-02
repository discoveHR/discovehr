"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  type CompanySubAdmin,
  createCompanySubAdmin,
  deleteCompanySubAdmin,
  listCompanySubAdmins,
} from "../../../lib/api";
import { DistrictSelect } from "../../common/DistrictSelect";

const INDIA_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
  "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
];

type Props = {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
};

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  state: "",
  district: "",
};

export function SubAdminsPanel({ onError, onSuccess }: Props) {
  const [subAdmins, setSubAdmins] = useState<CompanySubAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listCompanySubAdmins();
      setSubAdmins(list);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load sub-admins.");
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  function setField<K extends keyof typeof initialForm>(key: K, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim()) { setFormError("Full name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    if (!form.state) { setFormError("Please select a state."); return; }
    if (!form.district.trim()) { setFormError("District is required."); return; }
    if (form.password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirmPassword) { setFormError("Passwords do not match."); return; }

    setIsCreating(true);
    try {
      await createCompanySubAdmin({
        fullName: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        state: form.state,
        district: form.district.trim(),
      });
      onSuccess("Sub-admin account created successfully.");
      setShowForm(false);
      setForm(initialForm);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create sub-admin.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remove sub-admin "${name}"? They will lose dashboard access.`)) return;
    setDeletingId(id);
    try {
      await deleteCompanySubAdmin(id);
      onSuccess(`${name} removed.`);
      setSubAdmins((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to remove sub-admin.");
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return iso; }
  }

  return (
    <div className="sub-admins-panel">

      {/* Header */}
      <div className="company-table-wrap" style={{ marginBottom: "1.2rem" }}>
        <div className="company-table-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Sub Admins</h3>
            <span className="table-caption">
              Create team members who can view applicants from their assigned district.
            </span>
          </div>
          <button
            type="button"
            className="table-btn"
            onClick={() => { setShowForm((p) => !p); setFormError(""); }}
          >
            {showForm ? "Cancel" : "+ Add Sub Admin"}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="sub-admin-form-wrap">
            <form onSubmit={(e) => void handleSubmit(e)} className="sub-admin-form">
              <div className="sub-admin-form-grid">

                <div className="sub-admin-field">
                  <label className="sub-admin-label">Full Name</label>
                  <input
                    className="sub-admin-input"
                    type="text"
                    placeholder="e.g. Priya Sharma"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    required
                  />
                </div>

                <div className="sub-admin-field">
                  <label className="sub-admin-label">Email Address</label>
                  <input
                    className="sub-admin-input"
                    type="email"
                    placeholder="subadmin@company.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    required
                  />
                </div>

                <div className="sub-admin-field">
                  <label className="sub-admin-label">State</label>
                  <select
                    className="sub-admin-input"
                    value={form.state}
                    onChange={(e) => {
                      setField("state", e.target.value);
                      setField("district", "");
                    }}
                    required
                  >
                    <option value="">Select state…</option>
                    {INDIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="sub-admin-field">
                  <label className="sub-admin-label">District</label>
                  <DistrictSelect
                    className="sub-admin-input"
                    state={form.state}
                    country="India"
                    value={form.district}
                    onChange={(district) => setField("district", district)}
                    required
                  />
                </div>

                <div className="sub-admin-field">
                  <label className="sub-admin-label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="sub-admin-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => setField("password", e.target.value)}
                      required
                      style={{ paddingRight: "2.5rem" }}
                    />
                    <button
                      type="button"
                      className="sub-admin-eye"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword
                        ? <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <div className="sub-admin-field">
                  <label className="sub-admin-label">Confirm Password</label>
                  <input
                    className="sub-admin-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={(e) => setField("confirmPassword", e.target.value)}
                    required
                  />
                </div>

              </div>

              {formError && (
                <p className="sub-admin-error">{formError}</p>
              )}

              <div className="sub-admin-form-actions">
                <button
                  type="button"
                  className="table-btn secondary"
                  onClick={() => { setShowForm(false); setForm(initialForm); setFormError(""); }}
                >
                  Cancel
                </button>
                <button type="submit" className="table-btn" disabled={isCreating}>
                  {isCreating ? "Creating…" : "Create Sub Admin"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Sub-admin list */}
      <div className="company-table-wrap">
        <div className="company-table-head">
          <h3 style={{ margin: 0 }}>Team Members</h3>
          <span className="table-caption">{subAdmins.length} sub-admin{subAdmins.length !== 1 ? "s" : ""} in your company</span>
        </div>

        {isLoading ? (
          <p className="empty-state">Loading…</p>
        ) : subAdmins.length === 0 ? (
          <div className="sub-admin-empty">
            <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" fill="none" strokeWidth="1.2" style={{ opacity: 0.3 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <p>No sub-admins yet.</p>
            <p>Click <strong>+ Add Sub Admin</strong> above to create your first team member.</p>
          </div>
        ) : (
          <table className="company-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>State</th>
                <th>District</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subAdmins.map((sa) => (
                <tr key={sa.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span className="sub-admin-avatar">
                        {sa.full_name.charAt(0).toUpperCase()}
                      </span>
                      {sa.full_name}
                    </div>
                  </td>
                  <td>{sa.email}</td>
                  <td>{sa.state}</td>
                  <td>
                    <span className="sub-admin-district-chip">{sa.district}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${sa.isActive ? "active" : "closed"}`}>
                      {sa.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>{formatDate(sa.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="table-btn danger"
                      disabled={deletingId === sa.id}
                      onClick={() => void handleDelete(sa.id, sa.full_name)}
                    >
                      {deletingId === sa.id ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

