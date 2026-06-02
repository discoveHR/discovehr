"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { DistrictSelect } from "../common/DistrictSelect";
import { COUNTRY_OPTIONS, STATE_OPTIONS } from "./constants";
import type {
  TpoCollegeBatch,
  TpoCollegeBranch,
  TpoCollegeDepartment,
  TpoCollegePassoutYear,
  TpoCollegeSetupPayload,
  TpoProfile,
} from "../../lib/api";
import { completeTpoCollegeSetup, getTpoCollegeSetup, saveTpoCollegeSetup } from "../../lib/api";

type SetupStep = "profile" | "departments" | "branches";

const STEPS: { key: SetupStep; label: string }[] = [
  { key: "profile", label: "College profile" },
  { key: "departments", label: "Departments" },
  { key: "branches", label: "Batches" },
];

type Props = {
  displayName: string;
  onProfileSaved?: () => void;
};

export function emptyDepartment(): TpoCollegeDepartment {
  return {
    departmentName: "",
    hodName: "",
    hodEmail: "",
    hodPhone: "",
  };
}

export function emptyBranch(): TpoCollegeBranch {
  return { batchName: "", departmentName: "", passoutYear: "" };
}

export function emptyYear(): TpoCollegePassoutYear {
  return { passoutYear: "", coordinatorName: "", coordinatorEmail: "", coordinatorPhone: "" };
}

export function emptyBatch(): TpoCollegeBatch {
  return {
    batchName: "",
    departmentName: "",
    branchName: "",
    passoutYear: "",
    coordinatorName: "",
    coordinatorEmail: "",
    coordinatorPhone: "",
  };
}

export function cleanCollegeSetupPayload(
  profile: TpoProfile,
  departments: TpoCollegeDepartment[],
  branches: TpoCollegeBranch[],
  passoutYears: TpoCollegePassoutYear[],
  batches: TpoCollegeBatch[],
): TpoCollegeSetupPayload {
  return {
    profile,
    departments: departments.filter((d) => d.departmentName.trim()),
    branches: branches.filter((b) => b.batchName.trim()),
    passoutYears: passoutYears.filter((y) => y.passoutYear.trim()),
    batches: batches.filter((b) => b.batchName.trim()),
  };
}

const SETUP_OPTIONAL_HINT =
  "All fields are optional. Use Next to skip a step, then save when you are ready.";

export function TpoCollegeSetupPanel({ displayName, onProfileSaved }: Props) {
  const [step, setStep] = useState<SetupStep>("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<TpoProfile>({
    tpoName: "",
    collegeName: "",
    country: "India",
    state: "",
    district: "",
    collegeLocation: "",
    address: "",
    pincode: "",
    websiteLink: "",
    linkedinUrl: "",
    socialMediaLink: "",
  });
  const [departments, setDepartments] = useState<TpoCollegeDepartment[]>([emptyDepartment()]);
  const [branches, setBranches] = useState<TpoCollegeBranch[]>([emptyBranch()]);
  const [passoutYears, setPassoutYears] = useState<TpoCollegePassoutYear[]>([emptyYear()]);
  const [batches, setBatches] = useState<TpoCollegeBatch[]>([emptyBatch()]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getTpoCollegeSetup();
        setProfile(data.profile);
        if (data.departments?.length) setDepartments(data.departments);
        if (data.branches?.length) {
          setBranches(
            data.branches.map((row) => ({
              id: row.id,
              batchName: row.batchName || (row as { branchName?: string }).branchName || "",
              departmentName: row.departmentName || "",
              passoutYear: row.passoutYear || "",
            })),
          );
        }
        if (data.passoutYears?.length) setPassoutYears(data.passoutYears);
        if (data.batches?.length) setBatches(data.batches);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load college setup.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;

  const departmentOptions = useMemo(
    () => departments.map((d) => d.departmentName.trim()).filter(Boolean),
    [departments],
  );

  function buildPayload() {
    return cleanCollegeSetupPayload(profile, departments, branches, passoutYears, batches);
  }

  async function handleSaveDraft() {
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const message = await saveTpoCollegeSetup(buildPayload());
      setSuccess(message || "Draft saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  function goNext() {
    setError("");
    setSuccess("");
    setStep(STEPS[stepIndex + 1].key);
  }

  async function handleFinish(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      await saveTpoCollegeSetup(buildPayload());
      await completeTpoCollegeSetup();
      onProfileSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete setup.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="table-caption">Loading college profile…</p>;
  }

  return (
    <div className="tpo-setup-layout tpo-setup-layout--embedded">
          <div className="tpo-setup-progress" aria-hidden>
            <div className="tpo-setup-progress-bar" style={{ width: `${progressPct}%` }} />
          </div>

          <nav className="tpo-setup-steps" aria-label="Setup steps">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                className={`tpo-setup-step ${step === s.key ? "active" : ""} ${i < stepIndex ? "done" : ""}`}
                onClick={() => {
                  setError("");
                  setStep(s.key);
                }}
              >
                <span className="tpo-setup-step-num">{i + 1}</span>
                <span className="tpo-setup-step-label">{s.label}</span>
              </button>
            ))}
          </nav>

          <form className="tpo-panel tpo-setup-form" onSubmit={(e) => void handleFinish(e)} noValidate>
            <p className="tpo-setup-optional-hint">{SETUP_OPTIONAL_HINT}</p>
            {step === "profile" && <ProfileStep profile={profile} setProfile={setProfile} displayName={displayName} />}
            {step === "departments" && (
              <EntitySection
                title="Departments"
                hint="Add each academic department with HOD contact details."
                rows={departments}
                onChange={setDepartments}
                emptyRow={emptyDepartment}
                itemLabel="Department"
                renderFields={(row, idx, update) => (
                  <>
                    <SetupField label="Department name" className="tpo-setup-field--full">
                      <input
                        value={row.departmentName}
                        onChange={(e) => update(idx, { departmentName: e.target.value })}
                        placeholder="e.g. Mechanical Engineering"
                      />
                    </SetupField>
                    <SetupField label="HOD name">
                      <input value={row.hodName} onChange={(e) => update(idx, { hodName: e.target.value })} placeholder="Head of department" />
                    </SetupField>
                    <SetupField label="HOD email">
                      <input type="email" value={row.hodEmail} onChange={(e) => update(idx, { hodEmail: e.target.value })} placeholder="hod@college.edu" />
                    </SetupField>
                    <SetupField label="HOD phone">
                      <input value={row.hodPhone} onChange={(e) => update(idx, { hodPhone: e.target.value })} placeholder="+91 …" />
                    </SetupField>
                  </>
                )}
              />
            )}
            {step === "branches" && (
              <EntitySection
                title="Batches"
                hint="Add batches under a department and pass-out year. Add departments in the previous step first."
                rows={branches}
                onChange={setBranches}
                emptyRow={emptyBranch}
                itemLabel="Batch"
                renderFields={(row, idx, update) => (
                  <>
                    <SetupField label="Batch name" className="tpo-setup-field--full">
                      <input
                        value={row.batchName}
                        onChange={(e) => update(idx, { batchName: e.target.value })}
                        placeholder="e.g. Mechanical A"
                      />
                    </SetupField>
                    <SetupField label="Department">
                      <select
                        value={row.departmentName}
                        onChange={(e) => update(idx, { departmentName: e.target.value })}
                      >
                        <option value="">Select department</option>
                        {departmentOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </SetupField>
                    <SetupField label="Pass-out year">
                      <input
                        value={row.passoutYear}
                        onChange={(e) => update(idx, { passoutYear: e.target.value })}
                        placeholder="e.g. 2026"
                      />
                    </SetupField>
                  </>
                )}
              />
            )}

            {error ? <p className="tpo-setup-error-banner" role="alert">{error}</p> : null}
            {success ? <p className="success">{success}</p> : null}

            <div className="tpo-setup-actions">
              {stepIndex > 0 ? (
                <button type="button" className="btn secondary" onClick={() => setStep(STEPS[stepIndex - 1].key)}>
                  Back
                </button>
              ) : null}
              <button type="button" className="btn secondary" disabled={isSaving} onClick={() => void handleSaveDraft()}>
                {isSaving ? "Saving…" : "Save draft"}
              </button>
              {stepIndex < STEPS.length - 1 ? (
                <button type="button" className="btn" onClick={goNext}>
                  Next
                </button>
              ) : (
                <button type="submit" className="btn" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save profile"}
                </button>
              )}
            </div>
          </form>
    </div>
  );
}

function ProfileStep({
  profile,
  setProfile,
  displayName,
}: {
  profile: TpoProfile;
  setProfile: (p: TpoProfile) => void;
  displayName: string;
}) {
  return (
    <>
      <div className="tpo-setup-section-head">
        <h3>College profile</h3>
        <p>These details appear on your TPO dashboard. All fields are optional — save when ready.</p>
      </div>
      {profile.collegeName.trim() ? (
        <dl className="tpo-setup-profile-summary">
          <div>
            <dt>College</dt>
            <dd>{profile.collegeName}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>
              {[profile.collegeLocation, profile.district, profile.state, profile.country].filter(Boolean).join(", ") ||
                "—"}
            </dd>
          </div>
          <div>
            <dt>TPO</dt>
            <dd>{profile.tpoName || displayName}</dd>
          </div>
          {profile.address.trim() ? (
            <div>
              <dt>Address</dt>
              <dd>{profile.address}</dd>
            </div>
          ) : null}
          {profile.pincode.trim() ? (
            <div>
              <dt>Pincode</dt>
              <dd>{profile.pincode}</dd>
            </div>
          ) : null}
          {profile.websiteLink.trim() ? (
            <div>
              <dt>Website</dt>
              <dd>
                <a href={profile.websiteLink} target="_blank" rel="noreferrer">
                  {profile.websiteLink}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <div className="tpo-setup-profile-grid">
        <SetupField label="TPO name">
          <input
            value={profile.tpoName}
            onChange={(e) => setProfile({ ...profile, tpoName: e.target.value })}
            placeholder="Your full name"
          />
        </SetupField>
        <SetupField label="College name" className="tpo-setup-field--full">
          <input
            value={profile.collegeName}
            onChange={(e) => setProfile({ ...profile, collegeName: e.target.value })}
            placeholder="e.g. ABC Institute of Technology"
          />
        </SetupField>
        <SetupField label="Country">
          <select value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })}>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </SetupField>
        <SetupField label="State">
          <select
            value={profile.state}
            onChange={(e) => setProfile({ ...profile, state: e.target.value, district: "" })}
          >
            <option value="">Select state</option>
            {STATE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </SetupField>
        <SetupField label="District">
          <DistrictSelect
            state={profile.state}
            country={profile.country || "India"}
            value={profile.district}
            onChange={(district) => setProfile({ ...profile, district })}
          />
        </SetupField>
        <SetupField label="College location (city / campus)">
          <input
            value={profile.collegeLocation}
            onChange={(e) => setProfile({ ...profile, collegeLocation: e.target.value })}
            placeholder="City or campus area"
          />
        </SetupField>
        <SetupField label="Pincode">
          <input
            value={profile.pincode}
            onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
            placeholder="e.g. 411001"
          />
        </SetupField>
        <SetupField label="Address" className="tpo-setup-field--full">
          <textarea
            rows={3}
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            placeholder="Street, building, landmark"
          />
        </SetupField>
        <SetupField label="Website link" className="tpo-setup-field--full">
          <input
            type="url"
            value={profile.websiteLink}
            onChange={(e) => setProfile({ ...profile, websiteLink: e.target.value })}
            placeholder="https://www.college.edu"
          />
        </SetupField>
        <SetupField label="LinkedIn URL" className="tpo-setup-field--full">
          <input
            type="url"
            value={profile.linkedinUrl}
            onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
            placeholder="https://www.linkedin.com/school/…"
          />
        </SetupField>
        <SetupField label="Social media link" className="tpo-setup-field--full">
          <input
            type="url"
            value={profile.socialMediaLink}
            onChange={(e) => setProfile({ ...profile, socialMediaLink: e.target.value })}
            placeholder="https://instagram.com/… or other profile"
          />
        </SetupField>
      </div>
    </>
  );
}

export function SetupField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`tpo-setup-field ${className || ""}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

type EntitySectionProps<T extends { id?: string }> = {
  title: string;
  hint: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  emptyRow: () => T;
  itemLabel: string;
  renderFields: (row: T, index: number, update: (index: number, patch: Partial<T>) => void) => ReactNode;
};

export function EntitySection<T extends { id?: string }>({
  title,
  hint,
  rows,
  onChange,
  emptyRow,
  itemLabel,
  renderFields,
}: EntitySectionProps<T>) {
  function updateRow(index: number, patch: Partial<T>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <>
      <div className="tpo-setup-section-head">
        <h3>{title}</h3>
        <p>{hint}</p>
      </div>
      <div className="tpo-setup-cards">
        {rows.map((row, idx) => (
          <article key={row.id || `row-${idx}`} className="tpo-setup-card">
            <header className="tpo-setup-card-header">
              <div className="tpo-setup-card-title">
                <span className="tpo-setup-card-badge">{idx + 1}</span>
                {itemLabel} {idx + 1}
              </div>
              {rows.length > 1 ? (
                <button type="button" className="btn secondary" onClick={() => onChange(rows.filter((_, i) => i !== idx))}>
                  Remove
                </button>
              ) : null}
            </header>
            <div className="tpo-setup-card-body">
              <div className="tpo-setup-field-grid tpo-setup-field-grid--wide">{renderFields(row, idx, updateRow)}</div>
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="btn secondary tpo-setup-add-btn" onClick={() => onChange([...rows, emptyRow()])}>
        + Add {itemLabel.toLowerCase()}
      </button>
    </>
  );
}
