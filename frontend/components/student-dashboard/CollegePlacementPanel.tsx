import type { StudentCollegiateInvite } from "../../lib/api";

type CollegiateForm = {
  departmentStream: string;
  courseClassGrade: string;
  academicYear: string;
  areaOfStudy: string;
};

type CollegePlacementPanelProps = {
  collegiateInvite: StudentCollegiateInvite | null;
  candidateType: string;
  collegiateForm: CollegiateForm;
  onCollegiateFormChange: (updater: (prev: CollegiateForm) => CollegiateForm) => void;
  isCollegiateSaving: boolean;
  onAcceptCollegiate: () => void;
  onDeclineCollegiate: () => void;
};

export function CollegePlacementPanel({
  collegiateInvite,
  candidateType,
  collegiateForm,
  onCollegiateFormChange,
  isCollegiateSaving,
  onAcceptCollegiate,
  onDeclineCollegiate,
}: CollegePlacementPanelProps) {
  return (
    <div className="tpo-panel" style={{ marginBottom: "16px" }}>
      <h4 style={{ marginTop: 0 }}>College placement</h4>
      {collegiateInvite ? (
        <div className="job-form-grid" style={{ marginTop: 8 }}>
          <p className="company-subtitle" style={{ marginTop: 0 }}>
            <strong>{collegiateInvite.collegeName || "Your college"}</strong>
            {collegiateInvite.tpoName ? ` — ${collegiateInvite.tpoName}` : ""} has added you to their student roster. Confirm your
            department, branch, and batch (you can adjust the suggested values), or decline if you are not joining through this
            college.
          </p>
          <div className="job-form-row">
            <label>Department / branch</label>
            <input
              value={collegiateForm.departmentStream}
              onChange={(event) => onCollegiateFormChange((p) => ({ ...p, departmentStream: event.target.value }))}
              placeholder="e.g. Computer Science"
              required
            />
            <span className="table-caption">Suggested: {collegiateInvite.suggestedBranch || "—"}</span>
          </div>
          <div className="job-form-dual">
            <div className="job-form-row">
              <label>Batch / class</label>
              <input
                value={collegiateForm.courseClassGrade}
                onChange={(event) => onCollegiateFormChange((p) => ({ ...p, courseClassGrade: event.target.value }))}
                required
              />
              <span className="table-caption">Suggested: {collegiateInvite.suggestedBatch || "—"}</span>
            </div>
            <div className="job-form-row">
              <label>Academic year</label>
              <input
                value={collegiateForm.academicYear}
                onChange={(event) => onCollegiateFormChange((p) => ({ ...p, academicYear: event.target.value }))}
                required
              />
              <span className="table-caption">Suggested: {collegiateInvite.suggestedYear || "—"}</span>
            </div>
          </div>
          <div className="job-form-row">
            <label>Area of study (optional)</label>
            <input
              value={collegiateForm.areaOfStudy}
              onChange={(event) => onCollegiateFormChange((p) => ({ ...p, areaOfStudy: event.target.value }))}
              placeholder="e.g. Computer Engineering"
            />
          </div>
          <div className="job-form-actions">
            <button type="button" className="table-btn secondary" disabled={isCollegiateSaving} onClick={onDeclineCollegiate}>
              Independent candidate (decline invite)
            </button>
            <button type="button" className="table-btn" disabled={isCollegiateSaving} onClick={onAcceptCollegiate}>
              {isCollegiateSaving ? "Saving…" : "Confirm college placement"}
            </button>
          </div>
        </div>
      ) : (
        <p className="company-subtitle" style={{ marginBottom: 0 }}>
          {candidateType === "Institutional" ? (
            <>
              You are linked to an institutional placement. Your college name may be prefilled from your TPO; complete the rest of
              your profile in the steps below.
            </>
          ) : (
            <>
              You are registered as an <strong>independent candidate</strong>. Enter your own college and program details in the
              wizard. If your college invites you by email, you will confirm department, branch, and batch here.
            </>
          )}
        </p>
      )}
    </div>
  );
}
