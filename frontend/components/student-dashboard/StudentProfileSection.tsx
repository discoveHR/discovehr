import { type ReactNode, useState } from "react";
import { generateAadhaarOtp, verifyAadhaarOtp } from "../../lib/api/kyc";
import { frappeAssetUrl } from "../../lib/api/client";
import { DistrictSelect } from "../common/DistrictSelect";
import {
  ACADEMIC_YEAR_OPTIONS,
  COUNTRY_OPTIONS,
  GENDER_OPTIONS,
  SEMESTER_OPTIONS,
  STATE_OPTIONS,
} from "./constants";
import { CollegePlacementPanel } from "./CollegePlacementPanel";
import type { StudentDashboardModel } from "./hooks/useStudentDashboard";

type StudentProfileSectionProps = {
  dashboard: StudentDashboardModel;
};

export function StudentProfileSection({ dashboard: d }: StudentProfileSectionProps) {
  return (
    <section className="company-table-wrap">
      {d.isProfileLoading ? <p className="empty-state">Loading profile…</p> : null}
      <ProfileFormHeader d={d} />
      {!d.profileLocked ? (
        <CollegePlacementPanel
          collegiateInvite={d.collegiateInvite}
          candidateType={d.candidateType}
          collegiateForm={d.collegiateForm}
          onCollegiateFormChange={d.setCollegiateForm}
          isCollegiateSaving={d.isCollegiateSaving}
          onAcceptCollegiate={() => void d.handleAcceptCollegiate()}
          onDeclineCollegiate={() => void d.handleDeclineCollegiate()}
        />
      ) : null}
      {d.profileLocked ? <ProfileLockedBanner d={d} /> : null}
      <form className="job-wizard-layout" onSubmit={d.handleProfileSubmit}>
        <aside className="job-wizard-steps">
          {d.profileSteps.map((step, index) => {
            const state = index < d.profileWizardStep ? "complete" : index === d.profileWizardStep ? "active" : "pending";
            return (
              <button
                key={step.id}
                type="button"
                className={`wizard-step ${state}`}
                onClick={() => {
                  d.setProfileStepError("");
                  d.setProfileWizardStep(index);
                }}
              >
                <span className="wizard-step-track">
                  <span className="wizard-step-dot">{index < d.profileWizardStep ? "✓" : index + 1}</span>
                  {index < d.profileSteps.length - 1 ? <span className="wizard-step-line" /> : null}
                </span>
                <span className="wizard-step-label">{step.label}</span>
              </button>
            );
          })}
        </aside>
        <div className="job-wizard-panel">
          <fieldset disabled={d.profileLocked} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
            {d.profileWizardStep === 0 ? <ProfileStepPersonal d={d} /> : null}
            {d.profileWizardStep === 1 ? <ProfileStepAddress d={d} /> : null}
            {d.profileWizardStep === 2 ? <ProfileStepAcademic d={d} /> : null}
            {d.profileWizardStep === 3 ? <ProfileStepSkillsCareer d={d} /> : null}
            {d.profileWizardStep === 4 ? <ProfileStepResume d={d} /> : null}
            {d.profileWizardStep === 5 ? <ProfileStepIdentification d={d} /> : null}
            {d.profileWizardStep === 6 ? <ProfileStepDeclaration d={d} /> : null}
            {d.profileStepError ? <p className="error form-error">{d.profileStepError}</p> : null}
          </fieldset>
          {!d.profileLocked ? <ProfileWizardActions d={d} /> : null}
        </div>
      </form>
    </section>
  );
}

function ProfileFormHeader({ d }: { d: StudentDashboardModel }) {
  const badgeClass = d.profileLocked
    ? "spf-badge spf-badge--locked"
    : d.profileFlags.profileComplete
      ? "spf-badge spf-badge--ok"
      : "spf-badge spf-badge--warn";

  const badgeLabel = d.profileLocked
    ? "Submitted & locked"
    : d.profileFlags.profileComplete
      ? "All sections complete"
      : "In progress";

  return (
    <div className="spf-header">
      <div className="spf-header-left">
        <p className="spf-header-title">Student Profile</p>
        <p className="spf-header-sub">
          {d.profileLocked
            ? "Your profile is submitted and locked. Ask your TPO to approve an edit if changes are needed."
            : "Complete each section — Next saves your data before moving on. Required before applying to jobs."}
        </p>
      </div>
      <span className={badgeClass}>{badgeLabel}</span>
    </div>
  );
}

function ProfileLockedBanner({ d }: { d: StudentDashboardModel }) {
  return (
    <div className="spf-locked-banner" style={{ marginBottom: 0, marginTop: "1rem" }}>
      <div className="spf-locked-icon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div className="spf-locked-body">
        <p className="spf-locked-title">Profile locked</p>
        <p className="spf-locked-desc">
          {d.profileFlags.profileEditRequested
            ? "Your edit request is pending with your TPO — you'll be notified when approved."
            : "Further edits require Training & Placement Officer approval."}{" "}
          {d.profileFlags.profileComplete ? "All required fields were complete at submission." : ""}
        </p>
        {!d.profileFlags.profileEditRequested ? (
          <button
            type="button"
            className="spf-req-edit-btn"
            disabled={d.isRequestingEdit}
            onClick={() => void d.handleRequestProfileEdit()}
          >
            {d.isRequestingEdit ? "Sending…" : "Request edit from TPO"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProfileWizardActions({ d }: { d: StudentDashboardModel }) {
  return (
    <div className="spf-wizard-actions">
      {d.profileWizardStep > 0 ? (
        <button type="button" className="spf-btn-back" onClick={d.previousProfileWizardStep}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
      ) : null}
      {d.profileWizardStep < d.profileSteps.length - 1 ? (
        <button type="button" className="spf-btn-next" disabled={d.isProfileSaving} onClick={() => void d.nextProfileWizardStep()}>
          {d.isProfileSaving ? "Saving…" : "Save & continue"}
          {!d.isProfileSaving && (
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      ) : (
        <button type="submit" className="spf-btn-submit" disabled={d.isProfileSaving}>
          {d.isProfileSaving ? "Saving…" : d.profileFlags.profileEditApproved ? "Save & lock again" : "Submit & lock profile"}
          {!d.isProfileSaving && (
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="job-form-row">
      <label>{label}</label>
      {children}
    </div>
  );
}

function FormDual({ children }: { children: ReactNode }) {
  return <div className="job-form-dual">{children}</div>;
}

function SectionTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="spf-section-title">
      {icon ? <span className="spf-section-icon">{icon}</span> : null}
      {children}
    </div>
  );
}

function ProfileStepPersonal({ d }: { d: StudentDashboardModel }) {
  return (
    <>
      <SectionTitle icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}>Personal details</SectionTitle>
      <FormRow label="Full name">
        <input value={d.profileForm.fullName} onChange={(e) => d.updateProfileField("fullName", e.target.value)} required />
      </FormRow>
      <FormDual>
        <FormRow label="Gender">
          <select value={d.profileForm.gender} onChange={(e) => d.updateProfileField("gender", e.target.value)}>
            <option value="">Select gender</option>
            {GENDER_OPTIONS.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Date of birth">
          <input
            type="date"
            value={d.profileForm.dateOfBirth}
            max={new Date().toISOString().slice(0, 10)}
            onFocus={(e) => e.currentTarget.showPicker?.()}
            onClick={(e) => e.currentTarget.showPicker?.()}
            onChange={(e) => d.updateProfileField("dateOfBirth", e.target.value)}
          />
        </FormRow>
      </FormDual>
      <FormDual>
        <FormRow label="Mobile number">
          <input type="tel" value={d.profileForm.phone} onChange={(e) => d.updateProfileField("phone", e.target.value)} placeholder="+91 …" />
        </FormRow>
        <FormRow label="Email address">
          <input value={d.profileForm.email} readOnly />
        </FormRow>
      </FormDual>
      <FormDual>
        <FormRow label="Parent / guardian name">
          <input value={d.profileForm.parentGuardianName} onChange={(e) => d.updateProfileField("parentGuardianName", e.target.value)} />
        </FormRow>
        <FormRow label="Parent contact number">
          <input type="tel" value={d.profileForm.parentContactNumber} onChange={(e) => d.updateProfileField("parentContactNumber", e.target.value)} />
        </FormRow>
      </FormDual>
      <FormRow label="Student photo">
        <div className="student-photo-upload">
          <StudentPhotoPreview d={d} />
          <div className="student-photo-actions">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(e) => d.setPhotoUploadFile(e.target.files?.[0] || null)}
            />
            <span className="table-caption">Upload JPG, PNG, or WEBP image (optional).</span>
          </div>
        </div>
      </FormRow>
    </>
  );
}

function StudentPhotoPreview({ d }: { d: StudentDashboardModel }) {
  return (
    <div className="student-photo-preview-wrap">
      {d.photoUploadFile ? (
        <img src={d.photoPreviewUrl} alt="Selected student photo preview" className="student-photo-preview" />
      ) : d.profileForm.profilePhoto ? (
        <img src={frappeAssetUrl(d.profileForm.profilePhoto)} alt="Student profile photo" className="student-photo-preview" />
      ) : (
        <div className="student-photo-placeholder">No photo</div>
      )}
    </div>
  );
}

function ProfileStepAddress({ d }: { d: StudentDashboardModel }) {
  return (
    <>
      <SectionTitle icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}>Address details</SectionTitle>
      <FormRow label="House name / address">
        <textarea value={d.profileForm.address} onChange={(e) => d.updateProfileField("address", e.target.value)} rows={3} />
      </FormRow>
      <FormDual>
        <FormRow label="State">
          <select
            value={d.profileForm.state}
            onChange={(e) => {
              d.updateProfileField("state", e.target.value);
              d.updateProfileField("district", "");
            }}
          >
            <option value="">Select state</option>
            {STATE_OPTIONS.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Country">
          <select
            value={d.profileForm.country}
            onChange={(e) => {
              d.updateProfileField("country", e.target.value);
              d.updateProfileField("district", "");
            }}
          >
            <option value="">Select country</option>
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </FormRow>
      </FormDual>
      <FormDual>
        <FormRow label="District">
          <DistrictSelect
            state={d.profileForm.state}
            country={d.profileForm.country || "India"}
            value={d.profileForm.district}
            onChange={(district) => d.updateProfileField("district", district)}
          />
        </FormRow>
        <FormRow label="City / town">
          <input value={d.profileForm.city} onChange={(e) => d.updateProfileField("city", e.target.value)} />
        </FormRow>
      </FormDual>
      <FormRow label="PIN code">
        <input value={d.profileForm.pinCode} onChange={(e) => d.updateProfileField("pinCode", e.target.value)} inputMode="numeric" />
      </FormRow>
    </>
  );
}

function ProfileStepAcademic({ d }: { d: StudentDashboardModel }) {
  return (
    <>
      <SectionTitle icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}>Academic details</SectionTitle>
      <FormRow label="College name">
        <input
          value={d.profileForm.college}
          onChange={(e) => {
            void d.handleCollegeSearch(e.target.value);
          }}
          onFocus={() => {
            if (d.profileForm.college.trim().length >= 2) {
              d.setIsCollegeDropdownOpen(true);
            }
          }}
          placeholder="Type at least 2 letters to search Indian colleges"
          autoComplete="off"
        />
        {d.showCollegeDropdown ? <CollegeDropdown d={d} /> : null}
        <span className="table-caption">If your college is not listed, enter it manually.</span>
        {d.selectedCollege?.website ? (
          <a className="college-link" href={d.selectedCollege.website} target="_blank" rel="noreferrer">
            Visit college website
          </a>
        ) : null}
        {d.collegeSearchError ? <span className="error">{d.collegeSearchError}</span> : null}
      </FormRow>
      <FormRow label="University name">
        <input value={d.profileForm.universityName} onChange={(e) => d.updateProfileField("universityName", e.target.value)} />
      </FormRow>
      <FormDual>
        <FormRow label="Course / program">
          <input value={d.profileForm.courseClassGrade} onChange={(e) => d.updateProfileField("courseClassGrade", e.target.value)} placeholder="e.g. B.Tech CSE" />
        </FormRow>
        <FormRow label="Department / branch">
          <input value={d.profileForm.departmentStream} onChange={(e) => d.updateProfileField("departmentStream", e.target.value)} />
        </FormRow>
      </FormDual>
      <FormDual>
        <FormRow label="Year of study">
          <input
            list="student-academic-year-options"
            value={d.profileForm.academicYear}
            onChange={(e) => d.updateProfileField("academicYear", e.target.value)}
            placeholder="Choose a suggestion or type your year"
          />
          <datalist id="student-academic-year-options">
            {ACADEMIC_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y} />
            ))}
          </datalist>
        </FormRow>
        <FormRow label="Semester">
          <select value={d.profileForm.semester} onChange={(e) => d.updateProfileField("semester", e.target.value)}>
            <option value="">Select semester</option>
            {SEMESTER_OPTIONS.map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
        </FormRow>
      </FormDual>
      <FormRow label="Roll number / register number">
        <input value={d.profileForm.rollNumber} onChange={(e) => d.updateProfileField("rollNumber", e.target.value)} />
      </FormRow>
      <FormDual>
        <FormRow label="Admission year">
          <input value={d.profileForm.admissionYear} onChange={(e) => d.updateProfileField("admissionYear", e.target.value)} placeholder="e.g. 2022" inputMode="numeric" />
        </FormRow>
        <FormRow label="Expected graduation year">
          <input
            value={d.profileForm.expectedGraduationYear}
            onChange={(e) => d.updateProfileField("expectedGraduationYear", e.target.value)}
            placeholder="e.g. 2026"
            inputMode="numeric"
          />
        </FormRow>
      </FormDual>
      <FormRow label="Current CGPA / percentage">
        <input value={d.profileForm.currentCgpa} onChange={(e) => d.updateProfileField("currentCgpa", e.target.value)} placeholder="e.g. 8.2 or 85%" />
      </FormRow>
    </>
  );
}

function CollegeDropdown({ d }: { d: StudentDashboardModel }) {
  return (
    <div className="college-dropdown" role="listbox" aria-label="Indian college options">
      {d.isCollegeLoading ? <p className="college-dropdown-item muted">Searching...</p> : null}
      {!d.isCollegeLoading && d.collegeResults.length > 0
        ? d.collegeResults.map((college) => (
            <button
              key={`${college.name}-${college.stateProvince || ""}`}
              type="button"
              className="college-dropdown-item"
              onClick={() => {
                d.updateProfileField("college", college.name);
                d.setIsCollegeDropdownOpen(false);
              }}
            >
              <strong>{college.name}</strong>
              {college.stateProvince ? <span>{college.stateProvince}</span> : null}
            </button>
          ))
        : null}
      {!d.isCollegeLoading && d.collegeResults.length > 0 ? (
        <p className="college-dropdown-item muted">Not in list? Keep typing your college name manually.</p>
      ) : null}
      {!d.isCollegeLoading && d.collegeResults.length === 0 ? (
        <p className="college-dropdown-item muted">No colleges found. You can still type your college manually.</p>
      ) : null}
    </div>
  );
}

function ProfileStepSkillsCareer({ d }: { d: StudentDashboardModel }) {
  return (
    <>
      <SectionTitle icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}>Skills &amp; career details</SectionTitle>
      <FormRow label="Skills">
        <textarea value={d.profileForm.skills} onChange={(e) => d.updateProfileField("skills", e.target.value)} rows={3} placeholder="Comma-separated or short list" />
      </FormRow>
      <FormRow label="Certifications">
        <textarea value={d.profileForm.certifications} onChange={(e) => d.updateProfileField("certifications", e.target.value)} rows={2} placeholder="Optional" />
      </FormRow>
      <FormRow label="Areas of interest">
        <textarea value={d.profileForm.areasOfInterest} onChange={(e) => d.updateProfileField("areasOfInterest", e.target.value)} rows={2} placeholder="Optional" />
      </FormRow>
      <FormRow label="Internship experience">
        <textarea value={d.profileForm.internshipExperience} onChange={(e) => d.updateProfileField("internshipExperience", e.target.value)} rows={3} placeholder="Optional" />
      </FormRow>
      <FormRow label="Project title">
        <input value={d.profileForm.projectTitle} onChange={(e) => d.updateProfileField("projectTitle", e.target.value)} placeholder="Optional" />
      </FormRow>
      <FormRow label="Preferred job role">
        <input value={d.profileForm.preferredJobRole} onChange={(e) => d.updateProfileField("preferredJobRole", e.target.value)} placeholder="e.g. Software Engineer intern" />
      </FormRow>
    </>
  );
}

function ProfileStepResume({ d }: { d: StudentDashboardModel }) {
  const pendingName = d.resumeUploadFile?.name || "";
  const hasSavedResume = Boolean(d.profileForm.resumeFile);
  const resumeViewUrl = hasSavedResume ? frappeAssetUrl(d.profileForm.resumeFile) : "";

  return (
    <>
      <SectionTitle icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}>Resume upload</SectionTitle>
      <p className="company-subtitle" style={{ margin: "0 0 16px" }}>
        Upload your latest resume (PDF, DOC, or DOCX). Required before you can submit and lock your profile.
      </p>
      <div className="student-resume-upload">
        <div className="student-resume-icon" aria-hidden>
          📄
        </div>
        <div className="student-resume-body">
          {pendingName ? (
            <p className="student-resume-filename">
              <strong>Selected:</strong> {pendingName}
            </p>
          ) : hasSavedResume ? (
            <p className="student-resume-filename">
              <strong>Saved on profile</strong>
            </p>
          ) : (
            <p className="student-resume-filename muted">No resume uploaded yet</p>
          )}
          <label className="student-resume-file-label">
            <span className="table-btn secondary" style={{ display: "inline-block", cursor: "pointer" }}>
              {pendingName ? "Choose another file" : "Choose resume file"}
            </span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="student-resume-file-input"
              onChange={(e) => d.setResumeUploadFile(e.target.files?.[0] || null)}
            />
          </label>
          <span className="table-caption">Allowed: PDF, DOC, DOCX · Max recommended 5 MB</span>
          {resumeViewUrl ? (
            <a href={resumeViewUrl} target="_blank" rel="noreferrer" className="auth-link">
              View current resume
            </a>
          ) : null}
        </div>
      </div>
      {!d.profileLocked ? (
        <div className="student-resume-actions">
          <button
            type="button"
            className="table-btn"
            disabled={d.isResumeSaving || (!d.resumeUploadFile && !d.profileForm.resumeFile)}
            onClick={() => void d.handleSaveResume()}
          >
            {d.isResumeSaving ? "Uploading…" : hasSavedResume && !pendingName ? "Resume saved" : "Save resume to profile"}
          </button>
          <span className="table-caption">You can save your resume here and continue with the remaining steps.</span>
        </div>
      ) : null}
    </>
  );
}

function AadhaarVerifyWidget({ aadhaarNumber, isVerified, onVerified }: {
  aadhaarNumber: string;
  isVerified: boolean;
  onVerified: () => void;
}) {
  const [step, setStep] = useState<"idle" | "otp" | "done">(isVerified ? "done" : "idle");
  const [clientId, setClientId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  if (step === "done" || isVerified) {
    return (
      <div className="kyc-badge verified">
        <span className="kyc-badge-icon">✓</span>
        Aadhaar verified
      </div>
    );
  }

  async function handleSendOtp() {
    setError("");
    const num = aadhaarNumber.replace(/\D/g, "");
    if (num.length !== 12) {
      setError("Save a valid 12-digit Aadhaar number above first.");
      return;
    }
    setLoading(true);
    try {
      const res = await generateAadhaarOtp(num);
      setClientId(res.clientId);
      setStep("otp");
      setInfo("OTP sent to the mobile number linked with your Aadhaar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError("");
    if (!otp.trim()) { setError("Enter the OTP."); return; }
    setLoading(true);
    try {
      await verifyAadhaarOtp(clientId, otp.trim());
      setStep("done");
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="kyc-widget">
      {step === "idle" && (
        <>
          <p className="kyc-hint">Verify your Aadhaar via OTP to confirm your identity.</p>
          <button type="button" className="table-btn secondary" disabled={loading} onClick={() => void handleSendOtp()}>
            {loading ? "Sending OTP…" : "Send OTP to linked mobile"}
          </button>
        </>
      )}
      {step === "otp" && (
        <div className="kyc-otp-row">
          {info ? <p className="kyc-hint">{info}</p> : null}
          <input
            className="kyc-otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <button type="button" className="table-btn" disabled={loading} onClick={() => void handleVerifyOtp()}>
            {loading ? "Verifying…" : "Verify OTP"}
          </button>
          <button type="button" className="table-btn secondary" disabled={loading} onClick={() => void handleSendOtp()}>
            Resend
          </button>
        </div>
      )}
      {error ? <p className="error form-error" style={{ marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}

function ProfileStepIdentification({ d }: { d: StudentDashboardModel }) {
  return (
    <>
      <SectionTitle icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>}>Identification details</SectionTitle>
      <FormRow label="Student ID card number">
        <input value={d.profileForm.studentIdCardNumber} onChange={(e) => d.updateProfileField("studentIdCardNumber", e.target.value)} />
      </FormRow>
      <FormRow label="Aadhaar number (optional)">
        <input
          value={d.profileForm.aadhaarNumber}
          onChange={(e) => d.updateProfileField("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
          inputMode="numeric"
          placeholder="12-digit number"
        />
      </FormRow>
      <div className="job-form-row">
        <label>Aadhaar verification</label>
        <AadhaarVerifyWidget
          aadhaarNumber={d.profileForm.aadhaarNumber}
          isVerified={Boolean(d.profileForm.aadhaarVerified)}
          onVerified={() => d.updateProfileField("aadhaarVerified" as never, true as never)}
        />
      </div>
      <SectionTitle icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}>Social &amp; online profiles</SectionTitle>
      <FormRow label="LinkedIn profile">
        <input type="url" value={d.profileForm.linkedinProfile} onChange={(e) => d.updateProfileField("linkedinProfile", e.target.value)} placeholder="https://linkedin.com/in/…" />
      </FormRow>
      <FormRow label="GitHub profile">
        <input type="url" value={d.profileForm.githubProfile} onChange={(e) => d.updateProfileField("githubProfile", e.target.value)} placeholder="https://github.com/…" />
      </FormRow>
      <FormRow label="Portfolio website">
        <input type="url" value={d.profileForm.portfolioWebsite} onChange={(e) => d.updateProfileField("portfolioWebsite", e.target.value)} placeholder="https://…" />
      </FormRow>
    </>
  );
}

function ProfileStepDeclaration({ d }: { d: StudentDashboardModel }) {
  return (
    <>
      <SectionTitle icon={<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>}>Declaration</SectionTitle>
      <label className="job-form-row" style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={d.profileForm.profileConsent}
          onChange={(e) => d.updateProfileField("profileConsent", e.target.checked)}
          style={{ marginTop: "4px" }}
        />
        <span>I confirm that the information provided is correct.</span>
      </label>
      <p className="table-caption" style={{ marginTop: "12px" }}>
        Review all sections before submitting. Your profile will be locked until your TPO approves an edit request.
      </p>
    </>
  );
}
