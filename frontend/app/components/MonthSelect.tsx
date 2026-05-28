"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MonthSelectVariant = "select" | "wheel";

type MonthSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  monthsBefore?: number;
  monthsAfter?: number;
  availableMonths?: readonly string[];
  variant?: MonthSelectVariant;
  initiallyOpen?: boolean;
};

type MonthOption = {
  value: string;
  label: string;
};

const MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function MonthSelect({
  value,
  onChange,
  className = "app-input px-4 py-3 text-sm",
  monthsBefore = 48,
  monthsAfter = 36,
  availableMonths = [],
  variant = "select",
  initiallyOpen = false,
}: MonthSelectProps) {
  const options = useMemo(
    () =>
      buildMonthOptions({
        selectedMonth: value,
        monthsBefore,
        monthsAfter,
        availableMonths,
      }),
    [value, monthsBefore, monthsAfter, availableMonths],
  );

  if (variant === "wheel") {
    return (
      <MonthWheel
        value={value}
        options={options}
        onChange={onChange}
        initiallyOpen={initiallyOpen}
      />
    );
  }

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function MonthWheel({
  value,
  options,
  onChange,
  initiallyOpen,
}: {
  value: string;
  options: MonthOption[];
  onChange: (value: string) => void;
  initiallyOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null);

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    selectedButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [isOpen, value]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="wheel-select-trigger touch-button flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition"
        aria-label={`Mês selecionado: ${selectedOption?.label}`}
        aria-expanded={isOpen}
      >
        <span className="min-w-0">
          <span className="app-title block truncate text-sm font-black">
            {selectedOption?.label}
          </span>

          <span className="app-muted mt-0.5 block text-xs font-semibold">
            Toque para trocar o mês
          </span>
        </span>

        <span
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-black"
          style={{
            backgroundColor: "var(--app-surface-soft)",
            color: "var(--app-text-soft)",
          }}
        >
          {isOpen ? "Fechar" : "Trocar"}
        </span>
      </button>

      {isOpen ? (
        <div className="wheel-select-panel rounded-3xl border p-3 shadow-sm">
          <p className="app-muted mb-3 px-2 text-xs font-black uppercase tracking-widest">
            Toque no mês desejado
          </p>

          <div
            className="month-wheel-scroll max-h-64 overflow-y-auto overscroll-contain rounded-3xl p-2"
            style={{ backgroundColor: "var(--app-surface-soft)" }}
          >
            <div className="grid gap-2">
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    ref={isSelected ? selectedButtonRef : undefined}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`touch-button flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition ${
                      isSelected
                        ? "app-brand-soft shadow-sm"
                        : "app-wheel-option app-muted hover:shadow-sm"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildMonthOptions({
  selectedMonth,
  monthsBefore,
  monthsAfter,
  availableMonths,
}: {
  selectedMonth: string;
  monthsBefore: number;
  monthsAfter: number;
  availableMonths: readonly string[];
}): MonthOption[] {
  const currentMonth = getCurrentMonthDate();
  const monthValues = new Set<string>();

  for (let offset = -monthsBefore; offset <= monthsAfter; offset += 1) {
    const date = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() + offset,
        1,
      ),
    );

    monthValues.add(toMonthValue(date));
  }

  for (const availableMonth of availableMonths) {
    const normalizedMonth = normalizeMonthValue(availableMonth);

    if (normalizedMonth) {
      monthValues.add(normalizedMonth);
    }
  }

  const normalizedSelectedMonth = normalizeMonthValue(selectedMonth);

  if (normalizedSelectedMonth) {
    monthValues.add(normalizedSelectedMonth);
  }

  return Array.from(monthValues)
    .sort((firstMonth, secondMonth) => secondMonth.localeCompare(firstMonth))
    .map((monthValue) => {
      const date = parseMonthValue(monthValue);

      return {
        value: monthValue,
        label: capitalizeFirstLetter(MONTH_FORMATTER.format(date)),
      };
    });
}

function getCurrentMonthDate() {
  const now = new Date();

  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
}

function normalizeMonthValue(value: string) {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim();

  if (/^\d{4}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmedValue)) {
    return trimmedValue.slice(0, 7);
  }

  return "";
}

function parseMonthValue(value: string) {
  const [year, month] = value.split("-").map(Number);

  if (!year || !month) {
    return getCurrentMonthDate();
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

function toMonthValue(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}
