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
      <div className="tpo-panel-section-head">
        <h3>Bulk student upload</h3>
        <p>Upload a CSV or XLSX file. Supports profile updates and optional invite creation for students not yet in Scout.</p>
      </div>
      <form className="job-form-grid" style={{ padding: "1rem 1.4rem 1.4rem" }} onSubmit={handleBulkStudentUpload}>
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
