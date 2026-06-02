import type { TpoPosting } from "../../lib/api";

type StudentInternalPostingsProps = {
  internalPostings: TpoPosting[];
};

export function StudentInternalPostings({ internalPostings }: StudentInternalPostingsProps) {
  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>Campus Opportunities</h3>
        <span className="table-caption">Internal postings from your Training &amp; Placement Officer.</span>
      </div>

      {internalPostings.length === 0 ? (
        <div className="sp-empty">
          <div className="sp-empty-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
            </svg>
          </div>
          <p>No campus postings right now</p>
          <span>Your TPO will publish internal opportunities here when available.</span>
        </div>
      ) : (
        <div className="sint-list">
          {internalPostings.map((p) => {
            const audience =
              p.batchAudience === "All Students"
                ? "All students"
                : p.targetBatches || p.batch || "Specific batches";

            return (
              <div key={p.id} className="sint-card">
                <div className="sint-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
                  </svg>
                </div>

                <div className="sint-body">
                  <span className="sint-title">{p.title}</span>
                  <div className="sint-meta">
                    <span className="sint-audience-tag">{audience}</span>
                    {p.validTill ? (
                      <span className="sint-deadline">
                        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Valid till {p.validTill}
                      </span>
                    ) : null}
                  </div>
                </div>

                {p.applicationLink ? (
                  <a
                    className="sint-apply-link"
                    href={p.applicationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                ) : (
                  <span className="sint-no-link">—</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
