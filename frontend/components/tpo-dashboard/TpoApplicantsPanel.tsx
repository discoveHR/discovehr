import type { TpoDashboardState } from "./hooks/useTpoDashboard";

type Props = Pick<TpoDashboardState, "selectedPostingId" | "isApplicantsLoading" | "applicants">;

export function TpoApplicantsPanel({ selectedPostingId, isApplicantsLoading, applicants }: Props) {
  return (
    <div className="company-table-wrap">
      <div className="company-table-head">
        <h3>Applicants {selectedPostingId ? `(${selectedPostingId})` : ""}</h3>
        <span className="table-caption">Filtered by posting branch/batch. Choose a posting from Placements or Internal job posting if this list is empty.</span>
      </div>
      {isApplicantsLoading ? (
        <div className="tpo-panel-loading">Loading applicants…</div>
      ) : (
        <div className="tpo-table-scroll">
        <table className="company-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Branch</th>
              <th>Batch</th>
              <th>Resume</th>
            </tr>
          </thead>
          <tbody>
            {applicants.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="tpo-empty">
                    <div className="tpo-empty-icon">
                      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                    <div>
                      <strong>No applicants yet</strong>
                      <p>Select a posting from Placements or Internal Jobs to view its applicants.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              applicants.map((item) => (
                <tr key={`${item.studentId}-${item.studentEmail}`}>
                  <td>{item.studentName}</td>
                  <td>{item.studentEmail}</td>
                  <td>{item.branch}</td>
                  <td>{item.batch}</td>
                  <td>{item.resumeFile ? <a href={item.resumeFile}>View resume</a> : "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
