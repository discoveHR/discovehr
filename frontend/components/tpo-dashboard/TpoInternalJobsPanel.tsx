import { downloadTpoApplicantsUrl } from "../../lib/api";
import type { TpoDashboardState } from "./hooks/useTpoDashboard";
import { TPO_INTERNAL_POSTING_TYPES } from "./constants";
import type { InternalJobFormState } from "./types";

type Props = Pick<
  TpoDashboardState,
  | "internalJobForm"
  | "setInternalJobForm"
  | "handleCreateInternalPosting"
  | "isCreatingInternal"
  | "internalPostings"
  | "handleLoadApplicants"
>;

export function TpoInternalJobsPanel({
  internalJobForm,
  setInternalJobForm,
  handleCreateInternalPosting,
  isCreatingInternal,
  internalPostings,
  handleLoadApplicants,
}: Props) {
  return (
    <>
      <MotionlessCreateForm
        internalJobForm={internalJobForm}
        setInternalJobForm={setInternalJobForm}
        handleCreateInternalPosting={handleCreateInternalPosting}
        isCreatingInternal={isCreatingInternal}
      />
      <MotionlessList internalPostings={internalPostings} handleLoadApplicants={handleLoadApplicants} />
    </>
  );
}

function MotionlessCreateForm({
  internalJobForm,
  setInternalJobForm,
  handleCreateInternalPosting,
  isCreatingInternal,
}: Pick<Props, "internalJobForm" | "setInternalJobForm" | "handleCreateInternalPosting" | "isCreatingInternal">) {
  return (
    <div className="tpo-form-panel">
      <div className="tpo-form-panel-head">
        <div className="tpo-form-panel-icon">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
        <div className="tpo-form-panel-head-text">
          <p className="tpo-form-panel-title">Create internal job posting</p>
          <p className="tpo-form-panel-sub">Students in the selected audience will receive a notification and can apply under the &quot;Suggested jobs&quot; tab.</p>
        </div>
      </div>
      <div className="tpo-form-panel-body">
      <form className="job-form-grid" onSubmit={handleCreateInternalPosting}>
        <div className="job-form-row">
          <label htmlFor="internal-title">Title</label>
          <input
            id="internal-title"
            value={internalJobForm.title}
            onChange={(e) => setInternalJobForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Campus internship — QA"
            required
          />
        </div>
        <div className="job-form-row">
          <label htmlFor="internal-desc">Description</label>
          <textarea
            id="internal-desc"
            rows={3}
            value={internalJobForm.description}
            onChange={(e) => setInternalJobForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Role summary, stipend, location…"
          />
        </div>
        <div className="job-form-dual">
          <div className="job-form-row">
            <label htmlFor="internal-type">Type</label>
            <select
              id="internal-type"
              value={internalJobForm.postingType}
              onChange={(e) => setInternalJobForm((p) => ({ ...p, postingType: e.target.value }))}
            >
              {TPO_INTERNAL_POSTING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <MotionlessStatus internalJobForm={internalJobForm} setInternalJobForm={setInternalJobForm} />
        </div>
        <div className="job-form-row">
          <label htmlFor="internal-audience">Audience</label>
          <input
            id="internal-audience"
            value={internalJobForm.audienceDescription}
            onChange={(e) => setInternalJobForm((p) => ({ ...p, audienceDescription: e.target.value }))}
            placeholder="e.g. Final year mechanical students"
          />
        </div>
        <MotionlessBranch internalJobForm={internalJobForm} setInternalJobForm={setInternalJobForm} />
        <MotionlessAudience internalJobForm={internalJobForm} setInternalJobForm={setInternalJobForm} />
        <MotionlessLink internalJobForm={internalJobForm} setInternalJobForm={setInternalJobForm} />
        <MotionlessElig internalJobForm={internalJobForm} setInternalJobForm={setInternalJobForm} />
        <MotionlessOptional internalJobForm={internalJobForm} setInternalJobForm={setInternalJobForm} />
        <MotionlessNotify internalJobForm={internalJobForm} setInternalJobForm={setInternalJobForm} />
        <div className="job-form-actions">
          <button type="submit" className="tpo-form-btn" disabled={isCreatingInternal}>
            {isCreatingInternal ? "Creating…" : "Create posting"}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

function MotionlessBranch({ internalJobForm, setInternalJobForm }: Pick<Props, "internalJobForm" | "setInternalJobForm">) {
  return (
    <div className="job-form-row">
      <label htmlFor="internal-branch">Branch filter</label>
      <input
        id="internal-branch"
        value={internalJobForm.branch}
        onChange={(e) => setInternalJobForm((p) => ({ ...p, branch: e.target.value }))}
        placeholder="All, CSE, Mechanical…"
      />
    </div>
  );
}

function MotionlessStatus({ internalJobForm, setInternalJobForm }: Pick<Props, "internalJobForm" | "setInternalJobForm">) {
  return (
    <MotionlessStatusSelect internalJobForm={internalJobForm} setInternalJobForm={setInternalJobForm} />
  );
}

function MotionlessStatusSelect({ internalJobForm, setInternalJobForm }: Pick<Props, "internalJobForm" | "setInternalJobForm">) {
  return (
    <div className="job-form-row">
      <label htmlFor="internal-status">Status</label>
      <select
        id="internal-status"
        value={internalJobForm.status}
        onChange={(e) => setInternalJobForm((p) => ({ ...p, status: e.target.value as InternalJobFormState["status"] }))}
      >
        <option value="Draft">Draft</option>
        <option value="Active">Active</option>
        <option value="Closed">Closed</option>
      </select>
    </div>
  );
}

function MotionlessAudience({ internalJobForm, setInternalJobForm }: Pick<Props, "internalJobForm" | "setInternalJobForm">) {
  return (
    <>
      <div className="job-form-row">
        <label>Student audience</label>
        <div className="tpo-radio-group">
          <label className="tpo-radio-card">
            <input
              type="radio"
              name="batchAudience"
              checked={internalJobForm.batchAudience === "All Students"}
              onChange={() => setInternalJobForm((p) => ({ ...p, batchAudience: "All Students" }))}
            />
            All students
          </label>
          <label className="tpo-radio-card">
            <input
              type="radio"
              name="batchAudience"
              checked={internalJobForm.batchAudience === "Specific Batches"}
              onChange={() => setInternalJobForm((p) => ({ ...p, batchAudience: "Specific Batches" }))}
            />
            Specific batches only
          </label>
        </div>
      </div>
      {internalJobForm.batchAudience === "Specific Batches" ? (
        <div className="job-form-row">
          <label htmlFor="internal-batches">Target batches</label>
          <textarea
            id="internal-batches"
            rows={2}
            value={internalJobForm.targetBatches}
            onChange={(e) => setInternalJobForm((p) => ({ ...p, targetBatches: e.target.value }))}
            placeholder="e.g. 2026, 2027 or 2026–2028 (ranges expand to each year)"
          />
        </div>
      ) : null}
    </>
  );
}

function MotionlessLink({ internalJobForm, setInternalJobForm }: Pick<Props, "internalJobForm" | "setInternalJobForm">) {
  return (
    <div className="job-form-row">
      <label htmlFor="internal-link">Application link</label>
      <input
        id="internal-link"
        type="url"
        value={internalJobForm.applicationLink}
        onChange={(e) => setInternalJobForm((p) => ({ ...p, applicationLink: e.target.value }))}
        placeholder="https://…"
        required
      />
    </div>
  );
}

function MotionlessElig({ internalJobForm, setInternalJobForm }: Pick<Props, "internalJobForm" | "setInternalJobForm">) {
  return (
    <div className="job-form-row">
      <label htmlFor="internal-elig">Eligibility (optional)</label>
      <textarea
        id="internal-elig"
        rows={2}
        value={internalJobForm.eligibilityCriteria}
        onChange={(e) => setInternalJobForm((p) => ({ ...p, eligibilityCriteria: e.target.value }))}
      />
    </div>
  );
}

function MotionlessOptional({ internalJobForm, setInternalJobForm }: Pick<Props, "internalJobForm" | "setInternalJobForm">) {
  return (
    <div className="job-form-dual">
      <div className="job-form-row">
        <label htmlFor="internal-poster">Poster file URL (optional)</label>
        <input
          id="internal-poster"
          value={internalJobForm.posterFile}
          onChange={(e) => setInternalJobForm((p) => ({ ...p, posterFile: e.target.value }))}
          placeholder="https://…"
        />
      </div>
      <div className="job-form-row">
        <label htmlFor="internal-valid">Valid till (optional)</label>
        <input id="internal-valid" type="date" value={internalJobForm.validTill} onChange={(e) => setInternalJobForm((p) => ({ ...p, validTill: e.target.value }))} />
      </div>
    </div>
  );
}

function MotionlessNotify({ internalJobForm, setInternalJobForm }: Pick<Props, "internalJobForm" | "setInternalJobForm">) {
  return (
    <div className="job-form-row">
      <label className="tpo-checkbox-row">
        <input type="checkbox" checked={internalJobForm.notifyStudents} onChange={(e) => setInternalJobForm((p) => ({ ...p, notifyStudents: e.target.checked }))} />
        Notify eligible students by email (only when status is Active)
      </label>
    </div>
  );
}

function avatarClass(type: string | undefined) {
  if (!type) return "tpo-int-post-avatar tpo-int-post-avatar--default";
  if (type.toLowerCase().includes("internship")) return "tpo-int-post-avatar tpo-int-post-avatar--internship";
  return "tpo-int-post-avatar tpo-int-post-avatar--job";
}

function postStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "active") return "tpo-post-status tpo-post-status--active";
  if (s === "draft") return "tpo-post-status tpo-post-status--draft";
  return "tpo-post-status tpo-post-status--closed";
}

function MotionlessList({ internalPostings, handleLoadApplicants }: Pick<Props, "internalPostings" | "handleLoadApplicants">) {
  return (
    <div className="company-table-wrap">
      <div className="company-table-head">
        <h3>Internal postings</h3>
        <span className="table-caption">
          {internalPostings.length > 0
            ? `${internalPostings.length} posting${internalPostings.length === 1 ? "" : "s"} — college-only listings matched by branch and batch rules.`
            : "College-only listings matched by branch and batch rules you set above."}
        </span>
      </div>

      {internalPostings.length === 0 ? (
        <div className="sp-empty">
          <div className="sp-empty-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <p>No internal postings yet</p>
          <span>Use the form above to create your first campus posting.</span>
        </div>
      ) : (
        <div className="tpo-int-post-list">
          {internalPostings.map((posting) => {
            const audience = posting.audienceDescription || (posting.batchAudience === "All Students" ? "All students" : "Specific batches");
            const initial = (posting.title || "P").trim().charAt(0).toUpperCase();
            return (
              <div key={posting.id} className="tpo-int-post-card">
                <div className={avatarClass(posting.postingType)}>{initial}</div>

                <div className="tpo-int-post-body">
                  <span className="tpo-int-post-title">{posting.title}</span>
                  <div className="tpo-int-post-meta">
                    {posting.postingType ? <span className="tpo-post-tag tpo-post-tag--type">{posting.postingType}</span> : null}
                    <span className="tpo-post-tag tpo-post-tag--audience">{audience}</span>
                    {posting.branch ? <span className="tpo-post-tag tpo-post-tag--branch">{posting.branch}</span> : null}
                    <span className={postStatusClass(posting.status)}>{posting.status}</span>
                  </div>
                  {posting.targetBatches || posting.batch ? (
                    <span className="tpo-int-post-batches">
                      Batches: {posting.targetBatches || posting.batch}
                    </span>
                  ) : null}
                </div>

                <div className="tpo-int-post-actions">
                  <button type="button" className="tpo-form-btn tpo-form-btn--sm" onClick={() => void handleLoadApplicants(posting.id)}>
                    View applicants
                  </button>
                  <a className="tpo-form-btn tpo-form-btn--secondary tpo-form-btn--sm" href={downloadTpoApplicantsUrl(posting.id)}>
                    Download CSV
                  </a>
                  {posting.applicationLink ? (
                    <a className="tpo-int-post-ext-link" href={posting.applicationLink} target="_blank" rel="noopener noreferrer">
                      Open link ↗
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
