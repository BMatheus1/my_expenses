type ConfirmModalVariant = "danger" | "default";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  const confirmButtonClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-emerald-700 text-white hover:bg-emerald-800";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950 bg-opacity-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4">
      <div className="mobile-sheet-panel w-full max-w-md rounded-3xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-xl font-bold text-stone-700">
          !
        </div>

        <h2 className="mt-5 text-xl font-bold text-stone-950">{title}</h2>

        <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-full border border-stone-200 px-5 py-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-full px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClass}`}
          >
            {isLoading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
