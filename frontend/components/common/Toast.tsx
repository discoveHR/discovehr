import { ModalCloseButton } from "./ModalCloseButton";

type ToastProps = {
  message: string;
  type: "success" | "error" | "warning";
  onClose: () => void;
};

export function Toast({ message, type, onClose }: ToastProps) {
  return (
    <div className={`toast ${type}`}>
      <span>{message}</span>
      <ModalCloseButton onClick={onClose} ariaLabel="Dismiss" variant="inline" />
    </div>
  );
}
