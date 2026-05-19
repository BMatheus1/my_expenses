import type { ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  badge?: string;
};

export function CollapsibleSection({
  title,
  description,
  isOpen,
  onToggle,
  children,
  badge,
}: CollapsibleSectionProps) {
  return (
      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-stone-50 sm:px-6"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-stone-950">{title}</h2>

            {badge && (
              <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
                {badge}
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-stone-500">{description}</p>
        </div>

        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-lg font-semibold text-stone-700 transition">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-stone-100 px-5 py-5 sm:px-6">
          {children}
        </div>
      )}
    </section>
  );
}