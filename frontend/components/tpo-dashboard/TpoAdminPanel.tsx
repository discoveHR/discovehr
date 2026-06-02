import type { TpoDashboardState } from "./hooks/useTpoDashboard";

type Props = Pick<
  TpoDashboardState,
  | "bulkUploadForm"
  | "setBulkUploadForm"
  | "bulkUploadFile"
  | "setBulkUploadFile"
  | "isBulkUploading"
  | "handleBulkStudentUpload"
>;

export function TpoAdminPanel({
  bulkUploadForm,
  setBulkUploadForm,
  bulkUploadFile,
  setBulkUploadFile,
  isBulkUploading,
  handleBulkStudentUpload,
}: Props) {
  return (
    <div className="tpo-panel">
      <div className="company-table-head">
        <h3>Bulk student profile update (CSV/XLSX)</h3>
        <span className="table-caption">Upload student sheet. Supports existing profile updates and optional invite creation for missing users.</span>
      </div>
      <form className="job-form-grid" onSubmit={handleBulkStudentUpload}>
        <div className="job-form-row">
          <label>Student file</label>
          <input type="file" accept=".csv,.xlsx" onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)} required />
          <span className="table-caption">
            Required column: <strong>Email</strong> (heading may be Email, Student Email, or E-mail). Every data row must include a valid email.
          </span>
        </div>
        <div className="job-form-dual">
          <div className="job-form-row">
            <label>Default batch (optional)</label>
            <input
              value={bulkUploadForm.defaultBatch}
              onChange={(e) => setBulkUploadForm((p) => ({ ...p, defaultBatch: e.target.value }))}
            />
          </div>
          <div className="job-form-row">
            <label>Default department (optional)</label>
            <input
              value={bulkUploadForm.defaultDepartment}
              onChange={(e) => setBulkUploadForm((p) => ({ ...p, defaultDepartment: e.target.value }))}
            />
          </div>
        </div>
        <div className="job-form-row">
          <label>Default year (optional)</label>
          <input value={bulkUploadForm.defaultYear} onChange={(e) => setBulkUploadForm((p) => ({ ...p, defaultYear: e.target.value }))} />
        </div>
        <div className="job-form-row">
          <label>
            <input
              type="checkbox"
              checked={bulkUploadForm.createInviteForMissing}
              onChange={(e) => setBulkUploadForm((p) => ({ ...p, createInviteForMissing: e.target.checked }))}
            />{" "}
            Create invite for students not yet in Scout
          </label>
        </div>
        <div className="job-form-actions">
          <button type="submit" className="table-btn" disabled={isBulkUploading}>
            {isBulkUploading ? "Uploading…" : "Upload students"}
          </button>
        </div>
      </form>
    </div>
  );
}
