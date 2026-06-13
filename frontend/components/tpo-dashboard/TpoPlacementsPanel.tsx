import { downloadTpoApplicantsUrl } from "../../lib/api";
import type { TpoDashboardState } from "./hooks/useTpoDashboard";

type Props = Pick<TpoDashboardState, "postings" | "handleLoadApplicants" | "handleSendMagicLink" | "sendingPostingId">;

export function TpoPlacementsPanel({ postings, handleLoadApplicants, handleSendMagicLink, sendingPostingId }: Props) {
  return (
    <div className="company-table-wrap">
      <div className="company-table-head">
        <h3>Placement list</h3>
        <span className="table-caption">All placement drives for this TPO. Use actions to view applicants or share company access.</span>
      </div>
      <div className="tpo-table-scroll">
        <table className="company-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Branch</th>
              <th>Batch</th>
              <th>Company Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {postings.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="tpo-empty">
                    <div className="tpo-empty-icon">
                      <svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                    </div>
                    <div>
                      <strong>No placements yet</strong>
                      <p>Company drives will appear here once added.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              postings.map((posting) => (
                <tr key={posting.id}>
                  <td>{posting.title}</td>
                  <td>{posting.branch}</td>
                  <td>{posting.batch}</td>
                  <td>{posting.companyEmail}</td>
                  <td>
                    <span className={`status-pill ${posting.status?.toLowerCase()}`}>{posting.status}</span>
                  </td>
                  <td>
                    <div className="tpo-table-actions">
                      <button type="button" className="table-btn secondary" onClick={() => void handleLoadApplicants(posting.id)}>
                        View applicants
                      </button>
                      <button type="button" className="table-btn" disabled={sendingPostingId === posting.id} onClick={() => void handleSendMagicLink(posting.id)}>
                        {sendingPostingId === posting.id ? "Sending…" : "Send access link"}
                      </button>
                      <a className="table-btn secondary" href={downloadTpoApplicantsUrl(posting.id)}>
                        Download CSV
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
