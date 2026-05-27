"use client";

import { useEffect, useMemo, useRef } from "react";

type MonthSelectVariant = "select" | "wheel";

type MonthSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  monthsBefore?: number;
  monthsAfter?: number;
  availableMonths?: readonly string[];
  variant?: MonthSelectVariant;
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
    return <MonthWheel value={value} options={options} onChange={onChange} />;
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
}: {
  value: string;
  options: MonthOption[];
  onChange: (value: string) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollTimeoutRef = useRef<number | null>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const selectedOption = options[selectedIndex] ?? options[0];

  useEffect(() => {
    const selectedButton = buttonRefs.current[value];

    if (!selectedButton) {
      return;
    }

    selectedButton.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [value]);

  function handleScroll() {
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      const container = scrollContainerRef.current;

      if (!container) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      let closestOption = selectedOption;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const option of options) {
        const button = buttonRefs.current[option.value];

        if (!button) {
          continue;
        }

        const buttonRect = button.getBoundingClientRect();
        const buttonCenterY = buttonRect.top + buttonRect.height / 2;
        const distance = Math.abs(centerY - buttonCenterY);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestOption = option;
        }
      }

      if (closestOption.value !== value) {
        onChange(closestOption.value);
      }
    }, 90);
  }

  function selectMonthByOffset(offset: number) {
    const nextOption = options[selectedIndex + offset];

    if (!nextOption) {
      return;
    }

    onChange(nextOption.value);
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-stone-400">
          Mês selecionado
        </p>

        <p className="mt-1 text-base font-black text-stone-950">
          {selectedOption?.label}
        </p>
      </div>

      <button
        type="button"
        onClick={() => selectMonthByOffset(-1)}
        disabled={selectedIndex <= 0}
        className="mx-auto mb-2 flex h-9 w-12 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-lg font-black text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Próximo mês"
      >
        ▲
      </button>

      <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl border border-stone-100 bg-stone-50">
        <div className="pointer-events-none absolute left-3 right-3 top-1/2 z-10 h-12 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white shadow-sm" />

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="month-wheel-scroll h-52 snap-y snap-mandatory overflow-y-auto scroll-smooth px-3 py-20"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                ref={(element) => {
                  buttonRefs.current[option.value] = element;
                }}
                type="button"
                onClick={() => onChange(option.value)}
                className={`relative z-20 mb-2 flex h-12 w-full snap-center items-center justify-center rounded-2xl px-4 text-sm font-black transition ${
                  isSelected
                    ? "app-brand-soft scale-105 shadow-sm"
                    : "text-stone-400 hover:bg-white hover:text-stone-700"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => selectMonthByOffset(1)}
        disabled={selectedIndex >= options.length - 1}
        className="mx-auto mt-2 flex h-9 w-12 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-lg font-black text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Mês anterior"
      >
        ▼
      </button>
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