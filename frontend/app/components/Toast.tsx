type ToastVariant = "success" | "error";

type ToastProps = {
  isOpen: boolean;
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
};

export function Toast({
  isOpen,
  message,
  variant = "success",
  onClose,
}: ToastProps) {
  if (!isOpen) {
    return null;
  }

  const variantClasses =
    variant === "success"
      ? "border-emerald-100 bg-emerald-50 text-emerald-900"
      : "border-red-100 bg-red-50 text-red-900";

  const iconClasses =
    variant === "success"
      ? "bg-emerald-700 text-white"
      : "bg-red-600 text-white";

  return (
    <div className="fixed right-6 top-6 z-50 w-full max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-3xl border p-4 shadow-lg ${variantClasses}`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${iconClasses}`}
        >
          ✓
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 text-lg font-bold leading-none transition hover:bg-white hover:bg-opacity-60"
          aria-label="Fechar aviso"
        >
          ×
        </button>
      </div>
    </div>
  );
}