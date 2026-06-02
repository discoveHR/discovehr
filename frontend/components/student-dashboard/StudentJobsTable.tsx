import type { JobItem } from "../../lib/api";

type StudentJobsTableProps = {
  jobs: JobItem[];
  title: string;
  caption: string;
  variant: "suggested" | "all";
  colSpan: number;
  emptyMessage: string;
  applyingJobId: string | null;
  expandedJobId: string | null;
  onApplyJobClick: (jobId: string) => void;
  onToggleDetails: (jobId: string) => void;
};

function jobInitial(title: string): string {
  return (title || "J").trim().charAt(0).toUpperCase();
}

function avatarClass(type: string | undefined): string {
  return type === "Internship" ? "sj-job-avatar sj-job-avatar--internship" : "sj-job-avatar sj-job-avatar--job";
}

export function StudentJobsTable({
  jobs,
  title,
  caption,
  variant,
  emptyMessage,
  applyingJobId,
  expandedJobId,
  onApplyJobClick,
  onToggleDetails,
}: StudentJobsTableProps) {
  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>{title}</h3>
        <span className="table-caption">{caption}</span>
      </div>

      {jobs.length === 0 ? (
        <div className="sj-empty">
          <div className="sj-empty-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          </div>
          <p>{emptyMessage}</p>
          <span>Try adjusting your filters or check back later for new openings.</span>
        </div>
      ) : (
        <div className="sj-jobs-list">
          {jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const isApplying = applyingJobId === job.id;
            const isApplied = Boolean(job.isApplied);

            return (
              <div key={job.id} className="sj-job-card">
                {/* Avatar */}
                <div className={avatarClass(job.opportunityType)}>
                  {jobInitial(job.title)}
                </div>

                {/* Body */}
                <div className="sj-job-body">
                  <div className="sj-job-title-row">
                    <span className="sj-job-title">{job.title}</span>

                    {job.opportunityType ? (
                      <span className={`sj-tag ${job.opportunityType === "Internship" ? "sj-tag--type-internship" : "sj-tag--type-job"}`}>
                        {job.opportunityType}
                      </span>
                    ) : null}

                    {job.locationType ? (
                      <span className="sj-tag sj-tag--location">{job.locationType}</span>
                    ) : null}

                    {variant === "all" && job.openings ? (
                      <span className="sj-tag sj-tag--openings">{job.openings} opening{job.openings === 1 ? "" : "s"}</span>
                    ) : null}

                    {isApplied ? (
                      <span className="sj-tag sj-tag--applied">Applied</span>
                    ) : job.applicationStatus ? (
                      <span className="sj-tag sj-tag--status">{job.applicationStatus}</span>
                    ) : null}
                  </div>

                  {variant === "suggested" && job.skills ? (
                    <div className="sj-job-skills" title={job.skills}>
                      {job.skills}
                    </div>
                  ) : null}

                  {isExpanded ? (
                    <div className="sj-job-detail">
                      <p>
                        <strong>Description</strong><br />
                        {job.description || "No description shared yet."}
                      </p>
                      {(job.companyAbout || job.companyName) ? (
                        <p>
                          <strong>About the company</strong><br />
                          {job.companyAbout || job.companyName}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="sj-job-actions">
                  <button
                    type="button"
                    className={`sj-btn-apply${isApplied ? " sj-btn-apply--applied" : isApplying ? " sj-btn-apply--applying" : ""}`}
                    onClick={() => { if (!isApplied && !isApplying) onApplyJobClick(job.id); }}
                    disabled={isApplied || isApplying}
                  >
                    {isApplied ? "Applied" : isApplying ? "Applying…" : "Apply"}
                  </button>
                  <button
                    type="button"
                    className={`sj-btn-details${isExpanded ? " sj-btn-details--open" : ""}`}
                    onClick={() => onToggleDetails(job.id)}
                  >
                    {isExpanded ? "Hide" : "Details"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
