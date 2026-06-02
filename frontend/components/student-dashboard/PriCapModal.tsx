import { ModalCloseButton } from "../common/ModalCloseButton";

type PriCapModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenLms: () => void;
  onOpenPriScore: () => void;
};

export function PriCapModal({ open, onClose, onOpenLms, onOpenPriScore }: PriCapModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pri-cap-apply-title" onClick={onClose}>
      <div className="modal-card modal-card--with-close" onClick={(e) => e.stopPropagation()}>
        <ModalCloseButton onClick={onClose} />
        <h3 id="pri-cap-apply-title">Placement Readiness Index (PRI) required</h3>
        <p>
          You have reached the limit of public job applications without PRI on the general job board. Continue by building PRI
          through the LMS, skills challenges and assessments, or your internship track. Your college may also publish a PRI
          score to your profile.
        </p>
        <div className="modal-actions">
          <button type="button" className="table-btn" onClick={onOpenLms}>
            Open LMS
          </button>
          <button type="button" className="table-btn" onClick={onOpenPriScore}>
            PRI score
          </button>
        </div>
      </div>
    </div>
  );
}
