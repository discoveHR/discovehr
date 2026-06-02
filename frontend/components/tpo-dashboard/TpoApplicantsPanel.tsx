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
        <p className="empty-state">Loading applicants...</p>
      ) : (
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
                <td colSpan={5}>No applicants matched yet.</td>
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
      )}
    </div>
  );
}
