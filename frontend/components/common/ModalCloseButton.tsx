"use client";

type ModalCloseButtonProps = {
  onClick: () => void;
  /** Screen reader label (visible control shows ×). */
  ariaLabel?: string;
  /** `light` for dark modal headers; `inline` for flex toolbars (no absolute positioning). */
  variant?: "default" | "light" | "inline";
  /** Optional extra class; override colours with `--modal-close-*` CSS variables on a parent. */
  className?: string;
  disabled?: boolean;
};

export function ModalCloseButton({
  onClick,
  ariaLabel = "Close",
  variant = "default",
  className = "",
  disabled = false,
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      className={`modal-close-btn modal-close-btn--${variant}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}
