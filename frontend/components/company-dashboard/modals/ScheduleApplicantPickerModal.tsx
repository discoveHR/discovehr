"use client";

import { useEffect, useState } from "react";
import { listCompanyApplicants, type CompanyApplicantItem, type JobItem } from "../../../lib/api";
import { ModalCloseButton } from "../../common/ModalCloseButton";

type Props = {
  open: boolean;
  jobs: JobItem[];
  /** When set (from scheduler toolbar), only applicants for this job are shown. */
  initialJobId?: string;
  selectedApplicationId?: string;
  onClose: () => void;
  onSelect: (applicant: CompanyApplicantItem) => void;
  onError: (message: string) => void;
  /** Called when user changes job filter inside modal (parent can clear mismatched selection). */
  onJobFilterChange?: (jobId: string) => void;
};

const PAGE_SIZE = 25;

function formatAppliedOn(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function filterScheduleable(applicants: CompanyApplicantItem[], jobId: string, search: string) {
  let list = applicants.filter((a) => !["Rejected", "Selected"].includes(a.status));
  if (jobId) {
    list = list.filter((a) => a.jobId === jobId);
  }
  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        a.studentEmail.toLowerCase().includes(q) ||
        (a.jobTitle || "").toLowerCase().includes(q),
    );
  }
  return list;
}

export function ScheduleApplicantPickerModal({
  open,
  jobs,
  initialJobId = "",
  selectedApplicationId,
  onClose,
  onSelect,
  onError,
  onJobFilterChange,
}: Props) {
  const jobFilterLocked = Boolean(initialJobId);
  const [jobFilter, setJobFilter] = useState(initialJobId);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CompanyApplicantItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const activeJobFilter = jobFilterLocked ? initialJobId : jobFilter;
  const activeJobTitle = jobs.find((j) => j.id === activeJobFilter)?.title;

  useEffect(() => {
    if (!open) return;
    setJobFilter(initialJobId);
    setSearch("");
    setPage(1);
  }, [open, initialJobId]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(
      async () => {
        setIsLoading(true);
        try {
          const result = await listCompanyApplicants({
            jobId: activeJobFilter || undefined,
            page,
            pageSize: PAGE_SIZE,
            sort: "recent",
          });
          if (cancelled) return;

          const applicants = filterScheduleable(result.applicants, activeJobFilter, search);
          setRows(applicants);
          setTotalPages(result.pagination?.totalPages ?? 1);
          setTotal(result.pagination?.total ?? applicants.length);
        } catch (err) {
          if (!cancelled) {
            onError(err instanceof Error ? err.message : "Unable to load applicants.");
            setRows([]);
            setTotal(0);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      },
      search.trim() ? 300 : 0,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, activeJobFilter, page, search, onError]);

  function handleJobFilterChange(nextJobId: string) {
    if (jobFilterLocked) return;
    setJobFilter(nextJobId);
    setPage(1);
    onJobFilterChange?.(nextJobId);
  }

  if (!open) return null;

  return (
    <div className="company-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="company-modal company-modal-wide schedule-picker-modal"
        role="dialog"
        aria-labelledby="schedule-applicant-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="company-modal-head">
          <div>
            <h4 id="schedule-applicant-picker-title">Select applicant</h4>
            <p className="table-caption">
              {activeJobFilter && activeJobTitle
                ? `Showing applications for ${activeJobTitle} only.`
                : "Choose a job to narrow the list, or browse all applications."}
            </p>
          </div>
          <ModalCloseButton onClick={onClose} variant="inline" />
        </div>

        <div className="schedule-picker-toolbar">
          <label>
            Job {jobFilterLocked ? "(from scheduler filter)" : ""}
            <select
              value={activeJobFilter}
              onChange={(e) => handleJobFilterChange(e.target.value)}
              disabled={jobFilterLocked}
            >
              <option value="">All jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
          <label className="schedule-picker-search">
            Search
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, email, or job title…"
            />
          </label>
        </div>

        {isLoading ? <p className="empty-state">Loading applicants…</p> : null}

        {!isLoading && rows.length === 0 ? (
          <p className="empty-state">
            {activeJobFilter
              ? `No scheduleable applicants for ${activeJobTitle || "this job"}.`
              : "No scheduleable applicants found. Try another job or search."}
          </p>
        ) : null}

        {!isLoading && rows.length > 0 ? (
          <div className="company-table-wrap schedule-picker-table-wrap">
            <table className="company-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.applicationId}
                    className={selectedApplicationId === row.applicationId ? "selected-row" : undefined}
                  >
                    <td>
                      <strong>{row.studentName}</strong>
                      <br />
                      <span className="table-caption">{row.studentEmail}</span>
                    </td>
                    <td>{row.jobTitle || "—"}</td>
                    <td>{row.status}</td>
                    <td>{formatAppliedOn(row.appliedOn)}</td>
                    <td>
                      <button
                        type="button"
                        className="table-btn"
                        onClick={() => {
                          onSelect(row);
                          onClose();
                        }}
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="schedule-picker-footer">
          <span className="table-caption">
            {total > 0
              ? `${total.toLocaleString()} application(s)${activeJobFilter ? " for this job" : ""} · page ${page} of ${totalPages}`
              : ""}
            {search.trim() ? " · search filters names on the current page" : ""}
          </span>
          <div className="table-pagination">
            <button
              type="button"
              className="table-btn secondary"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="table-btn secondary"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

