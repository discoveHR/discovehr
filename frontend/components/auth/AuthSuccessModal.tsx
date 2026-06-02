"use client";

type AuthSuccessModalProps = {
  open: boolean;
  title?: string;
  message: string;
  continueLabel?: string;
  loading?: boolean;
  onContinue: () => void;
};

export function AuthSuccessModal({
  open,
  title = "Success",
  message,
  continueLabel = "Continue",
  loading = false,
  onContinue,
}: AuthSuccessModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop auth-success-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-success-title">
      <div className="modal-card auth-success-modal">
        <div className="auth-success-icon" aria-hidden="true">
          ✓
        </div>
        <h3 id="auth-success-title">{title}</h3>
        <p>{message}</p>
        <div className="modal-actions auth-success-actions">
          <button type="button" className="btn auth-success-btn" onClick={onContinue} disabled={loading}>
            {loading ? "Please wait…" : continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
