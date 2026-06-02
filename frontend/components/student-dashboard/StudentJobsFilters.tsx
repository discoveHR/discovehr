import type { JobItem } from "../../lib/api";
import type { StudentProfileFlags } from "./types";

type StudentJobsFiltersProps = {
  searchText: string;
  onSearchTextChange: (value: string) => void;
  locationFilter: "All" | JobItem["locationType"];
  onLocationFilterChange: (value: "All" | JobItem["locationType"]) => void;
  experienceFilter: "All" | "0 year" | "1 year" | "2 years";
  onExperienceFilterChange: (value: "All" | "0 year" | "1 year" | "2 years") => void;
  typeFilter: "All" | JobItem["opportunityType"];
  onTypeFilterChange: (value: "All" | JobItem["opportunityType"]) => void;
  onResetFilters: () => void;
  profileFlags: StudentProfileFlags;
};

const LOCATION_OPTIONS: Array<"All" | JobItem["locationType"]> = ["All", "In office", "Hybrid", "Remote"];
const EXPERIENCE_OPTIONS: Array<"All" | "0 year" | "1 year" | "2 years"> = ["All", "0 year", "1 year", "2 years"];
const TYPE_OPTIONS: Array<"All" | JobItem["opportunityType"]> = ["All", "Job", "Internship"];

export function StudentJobsFilters({
  searchText,
  onSearchTextChange,
  locationFilter,
  onLocationFilterChange,
  experienceFilter,
  onExperienceFilterChange,
  typeFilter,
  onTypeFilterChange,
  onResetFilters,
  profileFlags,
}: StudentJobsFiltersProps) {
  const hasActiveFilter =
    searchText !== "" ||
    locationFilter !== "All" ||
    experienceFilter !== "All" ||
    typeFilter !== "All";

  return (
    <section className="company-table-wrap">
      <div className="company-table-head">
        <h3>Search &amp; Filters</h3>
        <span className="table-caption">Filter by role, location, experience, or type.</span>
      </div>

      {/* Search bar */}
      <div className="sj-search-row">
        <div className="sj-search-wrap">
          <span className="sj-search-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="sj-search-input"
            type="text"
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            placeholder="Search by job title or company…"
          />
        </div>
      </div>

      {/* Chip filters */}
      <div className="sj-filter-row">
        <div className="sj-chip-section">
          <span className="sj-chip-label">Location</span>
          {LOCATION_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              className={`sj-chip${locationFilter === v ? " sj-chip--active" : ""}`}
              onClick={() => onLocationFilterChange(v)}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="sj-chip-section">
          <span className="sj-chip-label">Experience</span>
          {EXPERIENCE_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              className={`sj-chip${experienceFilter === v ? " sj-chip--active" : ""}`}
              onClick={() => onExperienceFilterChange(v)}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="sj-chip-section">
          <span className="sj-chip-label">Type</span>
          {TYPE_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              className={`sj-chip${typeFilter === v ? " sj-chip--active" : ""}`}
              onClick={() => onTypeFilterChange(v)}
            >
              {v}
            </button>
          ))}
        </div>

        {hasActiveFilter && (
          <button type="button" className="sj-filter-reset" onClick={onResetFilters}>
            Clear filters
          </button>
        )}

        {!profileFlags.canApplyToJobs && (
          <p className="sj-filter-hint">
            Complete every required field and use <strong>Submit &amp; lock profile</strong> under Profile before you can apply to jobs.
          </p>
        )}

        {profileFlags.canApplyToJobs && !profileFlags.publicJobApply.hasPriScore && (
          <p className="sj-filter-hint">
            Without a Placement Readiness Index (PRI) score, you may submit up to{" "}
            {profileFlags.publicJobApply.withoutPriCap} public applications
            {profileFlags.publicJobApply.remainingWithoutPri != null
              ? ` (${profileFlags.publicJobApply.remainingWithoutPri} remaining). `
              : ". "}
            Build PRI through the LMS, assessments, or by applying to an internship; your college may also record a PRI score on your profile.
          </p>
        )}
      </div>
    </section>
  );
}
