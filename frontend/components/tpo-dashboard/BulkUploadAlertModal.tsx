import { ModalCloseButton } from "../common/ModalCloseButton";

type Props = {
  message: string;
  onClose: () => void;
};

export function BulkUploadAlertModal({ message, onClose }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="bulk-upload-alert-title" onClick={onClose}>
      <div className="modal-card modal-card--with-close" onClick={(e) => e.stopPropagation()}>
        <ModalCloseButton onClick={onClose} />
        <h3 id="bulk-upload-alert-title">Bulk upload error</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="table-btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
