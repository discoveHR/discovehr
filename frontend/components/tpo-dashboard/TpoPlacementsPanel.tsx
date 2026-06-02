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
      <table className="company-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Branch</th>
            <th>Batch</th>
            <th>Company Email</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {postings.length === 0 ? (
            <tr>
              <td colSpan={6}>No placements yet.</td>
            </tr>
          ) : (
            postings.map((posting) => (
              <tr key={posting.id}>
                <td>{posting.title}</td>
                <td>{posting.branch}</td>
                <td>{posting.batch}</td>
                <td>{posting.companyEmail}</td>
                <td>{posting.status}</td>
                <td>
                  <button type="button" className="table-btn secondary" onClick={() => void handleLoadApplicants(posting.id)}>
                    View applicants
                  </button>
                  <button type="button" className="table-btn status-action" disabled={sendingPostingId === posting.id} onClick={() => void handleSendMagicLink(posting.id)}>
                    {sendingPostingId === posting.id ? "Sending..." : "Send access link"}
                  </button>
                  <a className="table-btn secondary status-action" href={downloadTpoApplicantsUrl(posting.id)}>
                    Download CSV
                  </a>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
