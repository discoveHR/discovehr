"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  API_URL,
  downloadTpoReportUrl,
  enqueueTpoReportExport,
  ensureScoutAccessToken,
  fetchApplicationsReport,
  fetchEligibilityStudentsReport,
  fetchJobSelectionsReport,
  fetchRecruitmentStatusReport,
  fetchTestScoresReport,
  fetchTrainingAttendanceReport,
  getTpoReportExportStatus,
  listTpoReportJobs,
  TPO_REPORT_PAGE_SIZE,
} from "../../lib/api";
import type {
  TpoApplicationReportRow,
  TpoJobSelectionReportRow,
  TpoListedStudent,
  TpoRecruitmentByJob,
  TpoRecruitmentReportRow,
  TpoReportKey,
  TpoTestScoreReportRow,
  TpoTrainingReportRow,
} from "../../lib/api";
import { COUNTRY_OPTIONS, initialDownloadFilters, STATE_OPTIONS } from "./constants";
import type { DownloadFilterForm } from "./types";

const REPORT_ITEMS: { key: TpoReportKey; label: string; description: string }[] = [
  {
    key: "applications",
    label: "Application",
    description: "Students from your college and the jobs they applied to.",
  },
  {
    key: "training-attendance",
    label: "Training status",
    description: "Psychometric / readiness assessments assigned and completed.",
  },
  {
    key: "test-scores",
    label: "Assessment",
    description: "Completed assessment results and overall scores.",
  },
  {
    key: "recruitment-status",
    label: "Recruitment status",
    description: "Application pipeline by job and status.",
  },
  {
    key: "job-selections",
    label: "Placement",
    description: "Students marked Selected for a specific job posting.",
  },
  {
    key: "eligibility-students",
    label: "Eligibility",
    description: "Filter students by branch, batch, location, or posting audience.",
  },
];

type Props = {
  onError: (message: string) => void;
};

export function TpoReportsPanel({ onError }: Props) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const loadGenerationRef = useRef(0);

  const [activeReport, setActiveReport] = useState<TpoReportKey>("applications");
  const [isLoading, setIsLoading] = useState(false);
  const [jobOptions, setJobOptions] = useState<{ jobId: string; title: string }[]>([]);
  const [postingOptions, setPostingOptions] = useState<{ postingId: string; title: string }[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [eligibilityFilters, setEligibilityFilters] = useState<DownloadFilterForm>({ ...initialDownloadFilters });
  const [selectedPostingId, setSelectedPostingId] = useState("");

  const [applicationRows, setApplicationRows] = useState<TpoApplicationReportRow[]>([]);
  const [trainingRows, setTrainingRows] = useState<TpoTrainingReportRow[]>([]);
  const [scoreRows, setScoreRows] = useState<TpoTestScoreReportRow[]>([]);
  const [recruitmentRows, setRecruitmentRows] = useState<TpoRecruitmentReportRow[]>([]);
  const [recruitmentByJob, setRecruitmentByJob] = useState<TpoRecruitmentByJob[]>([]);
  const [selectionRows, setSelectionRows] = useState<TpoJobSelectionReportRow[]>([]);
  const [eligibilityRows, setEligibilityRows] = useState<TpoListedStudent[]>([]);
  const [summaryText, setSummaryText] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [reportTotalPages, setReportTotalPages] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportTruncated, setReportTruncated] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    listTpoReportJobs()
      .then(({ jobs, postings }) => {
        setJobOptions(jobs.map((j) => ({ jobId: j.jobId, title: j.title })));
        setPostingOptions(postings.map((p) => ({ postingId: p.postingId, title: p.title })));
        if (jobs[0]) setSelectedJobId(jobs[0].jobId);
      })
      .catch(() => {
        /* optional filters */
      });
  }, []);

  const applyPaginationMeta = useCallback((data: { page?: number; totalPages?: number; total?: number; reportTruncated?: boolean }) => {
    setReportPage(data.page ?? 1);
    setReportTotalPages(data.totalPages ?? 1);
    setReportTotal(data.total ?? 0);
    setReportTruncated(Boolean(data.reportTruncated));
  }, []);

  const loadReport = useCallback(async (pageOverride?: number) => {
    const generation = ++loadGenerationRef.current;
    const page = pageOverride ?? reportPage;
    setIsLoading(true);
    setSummaryText("");
    try {
      const tokenOk = await ensureScoutAccessToken();
      if (!tokenOk) {
        onErrorRef.current("Session expired. Please sign in again.");
        return;
      }

      if (activeReport === "applications") {
        const data = await fetchApplicationsReport(page);
        setApplicationRows(data.rows);
        applyPaginationMeta(data);
        setSummaryText(
          `${data.summary.total} application(s) on this page · ${data.summary.uniqueStudents ?? 0} student(s) · ${data.total} in scope`,
        );
      } else if (activeReport === "training-attendance") {
        const data = await fetchTrainingAttendanceReport(reportPage);
        setTrainingRows(data.rows);
        applyPaginationMeta(data);
        const done = data.summary.fullyCompletedOnPage ?? data.summary.fullyCompleted ?? 0;
        setSummaryText(
          `${done} completed on this page · ${data.summary.totalStudents} students in college scope · page ${data.page} of ${data.totalPages}`,
        );
      } else if (activeReport === "test-scores") {
        const data = await fetchTestScoresReport(page);
        setScoreRows(data.rows);
        applyPaginationMeta(data);
        setSummaryText(`${data.summary.total} result(s) on this page · ${data.total} students in scope`);
      } else if (activeReport === "recruitment-status") {
        const data = await fetchRecruitmentStatusReport(page);
        setRecruitmentRows(data.rows);
        setRecruitmentByJob(data.byJob);
        applyPaginationMeta(data);
        setSummaryText(
          `${data.summary.totalApplications} application(s) on page · ${data.byJob.length} job(s) · scope ${data.total} students`,
        );
      } else if (activeReport === "job-selections") {
        if (!selectedJobId) {
          onErrorRef.current("Select a job first.");
          return;
        }
        const data = await fetchJobSelectionsReport(selectedJobId, page);
        setSelectionRows(data.rows);
        applyPaginationMeta(data);
        setSummaryText(`${data.summary.selectedCount} selected for ${data.job.jobTitle}`);
      } else if (activeReport === "eligibility-students") {
        const data = await fetchEligibilityStudentsReport({
          ...eligibilityFilters,
          postingId: selectedPostingId || undefined,
          page,
        });
        setEligibilityRows(data.rows);
        applyPaginationMeta(data);
        setSummaryText(`${data.summary.total} on page · ${data.summary.scopeTotal ?? data.total} in scope`);
      }
    } catch (err) {
      if (generation === loadGenerationRef.current) {
        onErrorRef.current(err instanceof Error ? err.message : "Unable to load report.");
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeReport, applyPaginationMeta, eligibilityFilters, selectedJobId, selectedPostingId]);

  useEffect(() => {
    if (activeReport === "job-selections" && !selectedJobId) return;
    setReportPage(1);
    void loadReport(1);
    return () => {
      loadGenerationRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset to page 1 when report type or filters change
  }, [activeReport, selectedJobId, selectedPostingId, eligibilityFilters]);

  useEffect(() => {
    if (activeReport === "job-selections" && !selectedJobId) return;
    if (reportPage <= 1) return;
    void loadReport(reportPage);
    return () => {
      loadGenerationRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pagination only
  }, [reportPage]);

  function buildDownloadParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (activeReport === "job-selections" && selectedJobId) params.jobId = selectedJobId;
    if (activeReport === "eligibility-students") {
      if (eligibilityFilters.branch) params.branch = eligibilityFilters.branch;
      if (eligibilityFilters.batch) params.batch = eligibilityFilters.batch;
      if (eligibilityFilters.state) params.state = eligibilityFilters.state;
      if (eligibilityFilters.country) params.country = eligibilityFilters.country;
      if (eligibilityFilters.areaOfStudy) params.areaOfStudy = eligibilityFilters.areaOfStudy;
      if (selectedPostingId) params.postingId = selectedPostingId;
    }
    return params;
  }

  async function handleDownload() {
    const params = buildDownloadParams();
    if (reportTotal < 800) {
      window.open(downloadTpoReportUrl(activeReport, params, true), "_blank", "noopener,noreferrer");
      return;
    }

    setIsExporting(true);
    try {
      const { exportId } = await enqueueTpoReportExport(activeReport, params);
      for (let i = 0; i < 90; i += 1) {
        await new Promise((r) => setTimeout(r, 2000));
        const status = await getTpoReportExportStatus(exportId);
        if (status.status === "ready" && status.downloadUrl) {
          const base = status.downloadUrl.startsWith("/") ? `${API_URL}${status.downloadUrl}` : status.downloadUrl;
          window.open(base, "_blank", "noopener,noreferrer");
          return;
        }
        if (status.status === "failed") {
          throw new Error(status.message || "Export failed.");
        }
      }
      throw new Error("Export is taking longer than expected. Try again in a minute.");
    } catch (err) {
      onErrorRef.current(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  const activeMeta = REPORT_ITEMS.find((r) => r.key === activeReport);

  return (
    <div className="tpo-reports-layout">
      <aside className="tpo-reports-sidebar" aria-label="Report types">
        <h3 className="tpo-reports-sidebar-title">Reports</h3>
        <nav className="tpo-reports-nav">
          {REPORT_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`tpo-reports-nav-item ${activeReport === item.key ? "active" : ""}`}
              onClick={() => {
                setActiveReport(item.key);
                setReportPage(1);
              }}
            >
              <span className="tpo-reports-nav-label">{item.label}</span>
              <span className="tpo-reports-nav-desc">{item.description}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="tpo-reports-main company-table-wrap">
        <div className="company-table-head tpo-reports-head">
          <div>
            <h3>{activeMeta?.label}</h3>
            <span className="table-caption">{activeMeta?.description}</span>
            {summaryText ? <p className="tpo-reports-summary">{summaryText}</p> : null}
            {reportTruncated ? (
              <p className="tpo-reports-summary tpo-reports-truncated">
                Large college scope — data is paged ({TPO_REPORT_PAGE_SIZE} per page). Use Download CSV for a full export.
              </p>
            ) : null}
          </div>
          <div className="tpo-reports-actions">
            {activeReport === "job-selections" ? (
              <label className="tpo-reports-filter">
                Job
                <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                  <option value="">Select job</option>
                  {jobOptions.map((j) => (
                    <option key={j.jobId} value={j.jobId}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {activeReport === "eligibility-students" ? (
              <div className="tpo-reports-filters-grid">
                <input
                  placeholder="Branch"
                  value={eligibilityFilters.branch}
                  onChange={(e) => setEligibilityFilters((f) => ({ ...f, branch: e.target.value }))}
                />
                <input
                  placeholder="Batch"
                  value={eligibilityFilters.batch}
                  onChange={(e) => setEligibilityFilters((f) => ({ ...f, batch: e.target.value }))}
                />
                <select value={eligibilityFilters.state} onChange={(e) => setEligibilityFilters((f) => ({ ...f, state: e.target.value }))}>
                  <option value="">State</option>
                  {STATE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={eligibilityFilters.country}
                  onChange={(e) => setEligibilityFilters((f) => ({ ...f, country: e.target.value }))}
                >
                  <option value="">Country</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Area of study"
                  value={eligibilityFilters.areaOfStudy}
                  onChange={(e) => setEligibilityFilters((f) => ({ ...f, areaOfStudy: e.target.value }))}
                />
                <select value={selectedPostingId} onChange={(e) => setSelectedPostingId(e.target.value)}>
                  <option value="">Posting audience (optional)</option>
                  {postingOptions.map((p) => (
                    <option key={p.postingId} value={p.postingId}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="tpo-reports-pager" aria-label="Report pagination">
              <button
                type="button"
                className="table-btn secondary"
                disabled={isLoading || reportPage <= 1}
                onClick={() => setReportPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="tpo-reports-pager-meta">
                Page {reportPage} of {reportTotalPages}
                {reportTotal > 0 ? ` · ${reportTotal} students` : ""}
              </span>
              <button
                type="button"
                className="table-btn secondary"
                disabled={isLoading || reportPage >= reportTotalPages}
                onClick={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))}
              >
                Next
              </button>
            </div>
            <button type="button" className="table-btn secondary" onClick={() => void loadReport()} disabled={isLoading}>
              {isLoading ? "Loading…" : "Refresh"}
            </button>
            <button type="button" className="table-btn" onClick={() => void handleDownload()} disabled={isLoading || isExporting}>
              {isExporting ? "Preparing CSV…" : "Download CSV"}
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="empty-state">Loading report…</p>
        ) : (
          <ReportTable
            activeReport={activeReport}
            applicationRows={applicationRows}
            trainingRows={trainingRows}
            scoreRows={scoreRows}
            recruitmentRows={recruitmentRows}
            recruitmentByJob={recruitmentByJob}
            selectionRows={selectionRows}
            eligibilityRows={eligibilityRows}
          />
        )}
      </div>
    </div>
  );
}

function ReportTable(props: {
  activeReport: TpoReportKey;
  applicationRows: TpoApplicationReportRow[];
  trainingRows: TpoTrainingReportRow[];
  scoreRows: TpoTestScoreReportRow[];
  recruitmentRows: TpoRecruitmentReportRow[];
  recruitmentByJob: TpoRecruitmentByJob[];
  selectionRows: TpoJobSelectionReportRow[];
  eligibilityRows: TpoListedStudent[];
}) {
  const { activeReport } = props;

  if (activeReport === "applications") {
    return (
      <table className="company-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Branch</th>
            <th>Job</th>
            <th>Company</th>
            <th>Status</th>
            <th>Applied</th>
          </tr>
        </thead>
        <tbody>
          {props.applicationRows.length === 0 ? (
            <tr>
              <td colSpan={7}>No applications found for your students.</td>
            </tr>
          ) : (
            props.applicationRows.map((r) => (
              <tr key={r.applicationId}>
                <td>{r.fullName}</td>
                <td>{r.email}</td>
                <td>{r.branch}</td>
                <td>{r.jobTitle}</td>
                <td>{r.companyName}</td>
                <td>{r.applicationStatus}</td>
                <td>{r.appliedOn}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  if (activeReport === "training-attendance") {
    return (
      <table className="company-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Completed</th>
            <th>Total</th>
            <th>All done</th>
            <th>Assessments</th>
          </tr>
        </thead>
        <tbody>
          {props.trainingRows.length === 0 ? (
            <tr>
              <td colSpan={6}>No training assessment data yet.</td>
            </tr>
          ) : (
            props.trainingRows.map((r) => (
              <tr key={r.studentId}>
                <td>{r.fullName}</td>
                <td>{r.email}</td>
                <td>{r.assignmentsCompleted}</td>
                <td>{r.assignmentsTotal}</td>
                <td>{r.attendedAllTrainings ? "Yes" : "No"}</td>
                <td>{r.assessmentTitles || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  if (activeReport === "test-scores") {
    return (
      <table className="company-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Assessment</th>
            <th>Overall</th>
            <th>Scores</th>
            <th>Completed</th>
          </tr>
        </thead>
        <tbody>
          {props.scoreRows.length === 0 ? (
            <tr>
              <td colSpan={5}>No test results yet.</td>
            </tr>
          ) : (
            props.scoreRows.map((r) => (
              <tr key={r.resultId}>
                <td>{r.fullName}</td>
                <td>{r.assessmentTitle}</td>
                <td>{r.overallScore}</td>
                <td>{r.scoresSummary}</td>
                <td>{r.completedAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  if (activeReport === "recruitment-status") {
    return (
      <>
        {props.recruitmentByJob.length > 0 ? (
          <table className="company-table tpo-reports-subtable">
            <thead>
              <tr>
                <th>Job</th>
                <th>Submitted</th>
                <th>In review</th>
                <th>Shortlisted</th>
                <th>Selected</th>
                <th>Rejected</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {props.recruitmentByJob.map((j) => (
                <tr key={j.jobId}>
                  <td>{j.jobTitle}</td>
                  <td>{j.submitted}</td>
                  <td>{j.inReview}</td>
                  <td>{j.shortlisted}</td>
                  <td>{j.selected}</td>
                  <td>{j.rejected}</td>
                  <td>{j.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <table className="company-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Job</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {props.recruitmentRows.length === 0 ? (
              <tr>
                <td colSpan={3}>No recruitment data.</td>
              </tr>
            ) : (
              props.recruitmentRows.map((r) => (
                <tr key={r.applicationId}>
                  <td>{r.fullName}</td>
                  <td>{r.jobTitle}</td>
                  <td>{r.recruitmentStatus}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </>
    );
  }

  if (activeReport === "job-selections") {
    return (
      <table className="company-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Branch</th>
            <th>Batch</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {props.selectionRows.length === 0 ? (
            <tr>
              <td colSpan={5}>No selected students for this job.</td>
            </tr>
          ) : (
            props.selectionRows.map((r) => (
              <tr key={r.applicationId}>
                <td>{r.fullName}</td>
                <td>{r.email}</td>
                <td>{r.branch}</td>
                <td>{r.batch}</td>
                <td>{r.applicationStatus}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  return (
    <table className="company-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Branch</th>
          <th>Batch</th>
          <th>College</th>
          <th>State</th>
        </tr>
      </thead>
      <tbody>
        {props.eligibilityRows.length === 0 ? (
          <tr>
            <td colSpan={6}>No students match these filters.</td>
          </tr>
        ) : (
          props.eligibilityRows.map((r) => (
            <tr key={r.studentId || r.email}>
              <td>{r.fullName}</td>
              <td>{r.email}</td>
              <td>{r.branch}</td>
              <td>{r.batch}</td>
              <td>{r.college}</td>
              <td>{r.state}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
