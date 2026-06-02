import { ModalCloseButton } from "../common/ModalCloseButton";

type ProfileRequiredModalProps = {
  open: boolean;
  onClose: () => void;
  onGoToProfile: () => void;
};

export function ProfileRequiredModal({ open, onClose, onGoToProfile }: ProfileRequiredModalProps) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-required-apply-title"
      onClick={onClose}
    >
      <div className="modal-card modal-card--with-close" onClick={(e) => e.stopPropagation()}>
        <ModalCloseButton onClick={onClose} />
        <h3 id="profile-required-apply-title">Complete your profile before applying</h3>
        <p>
          Finish every required field in your profile, then use <strong>Submit and lock profile</strong>. After your profile is
          complete and locked, you can apply to jobs from this dashboard.
        </p>
        <div className="modal-actions">
          <button type="button" className="table-btn" onClick={onGoToProfile}>
            Go to profile
          </button>
        </div>
      </div>
    </div>
  );
}