import type { StudentLmsContext } from "../../lib/api";

type StudentLmsPanelProps = {
  lmsContext: StudentLmsContext | null;
  isLmsLoading: boolean;
  onOpenLms: () => void;
};

export function StudentLmsPanel({ lmsContext, isLmsLoading, onOpenLms }: StudentLmsPanelProps) {
  const enabled = Boolean(lmsContext?.enabled);
  const courses = lmsContext?.courses ?? [];

  return (
    <section className="company-table-wrap">
      {/* Hero */}
      <div className="slms-hero">
        <div className="slms-hero-icon">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div className="slms-hero-text">
          <h3 className="slms-hero-title">Learning Management System</h3>
          <p className="slms-hero-sub">
            {enabled
              ? `${courses.length} course${courses.length === 1 ? "" : "s"} available — complete mandatory modules to boost your PRI score.`
              : (lmsContext?.message || "LMS is not configured yet. Ask your TPO to enable it.")}
          </p>
        </div>
        <button type="button" className="slms-open-btn" disabled={!enabled} onClick={onOpenLms}>
          Open LMS
        </button>
      </div>

      {/* Course list */}
      {isLmsLoading ? (
        <div className="sp-empty">
          <div className="credits-spinner" />
          <span>Loading courses...</span>
        </div>
      ) : enabled && courses.length > 0 ? (
        <div className="slms-courses">
          {courses.map((course) => (
            <div key={course.id} className="slms-course-row">
              <span className="slms-course-dot" />
              <span className="slms-course-name">{course.fullname}</span>
              <span className="slms-course-short">{course.shortname}</span>
            </div>
          ))}
        </div>
      ) : enabled && courses.length === 0 ? (
        <div className="sp-empty">
          <div className="sp-empty-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <p>No courses assigned yet</p>
          <span>Your TPO will assign courses when they are available.</span>
        </div>
      ) : null}
    </section>
  );
}
