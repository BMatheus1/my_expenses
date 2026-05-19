import type { ReactNode } from "react";

type ExpenseFiltersProps = {
  selectedMonth: string;
  selectedCategory: string;
  searchTerm: string;
  categories: readonly string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectedMonthChange: (value: string) => void;
  onSelectedCategoryChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onClearFilters: () => void;
};

export function ExpenseFilters({
  selectedMonth,
  selectedCategory,
  searchTerm,
  categories,
  isOpen,
  onToggle,
  onSelectedMonthChange,
  onSelectedCategoryChange,
  onSearchTermChange,
  onClearFilters,
}: ExpenseFiltersProps) {
  const hasActiveFilters = selectedCategory !== "Todas" || searchTerm.trim();

  return (
    <section className="rounded-3xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-stone-50"
        aria-expanded={isOpen}
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-stone-950">Filtros</h2>

            {hasActiveFilters && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Ativo
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-stone-500">
            Filtre por mês, categoria ou descrição.
          </p>
        </div>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-base font-bold text-stone-700">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-stone-100 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <FilterField label="Mês">
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => onSelectedMonthChange(event.target.value)}
                className="app-input px-4 py-3 text-sm"
              />
            </FilterField>

            <FilterField label="Categoria">
              <select
                value={selectedCategory}
                onChange={(event) =>
                  onSelectedCategoryChange(event.target.value)
                }
                className="app-input px-4 py-3 text-sm"
              >
                <option value="Todas">Todas</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Buscar">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder="Descrição..."
                className="app-input px-4 py-3 text-sm"
              />
            </FilterField>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-full border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

type FilterFieldProps = {
  label: string;
  children: ReactNode;
};

function FilterField({ label, children }: FilterFieldProps) {
  return (
    <label className="space-y-1.5 text-xs font-bold text-stone-600">
      <span>{label}</span>
      {children}
    </label>
  );
}