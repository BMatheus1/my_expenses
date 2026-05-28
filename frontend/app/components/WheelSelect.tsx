"use client";

import { useEffect, useRef, useState } from "react";

type WheelSelectOption = {
  value: string;
  label: string;
};

type WheelSelectProps = {
  value: string;
  options: readonly WheelSelectOption[];
  onChange: (value: string) => void;
  title?: string;
  emptyMessage?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  initiallyOpen?: boolean;
};

export function WheelSelect({
  value,
  options,
  onChange,
  title = "Selecionado",
  emptyMessage = "Nenhuma opção disponível",
  disabled = false,
  size = "md",
  initiallyOpen = false,
}: WheelSelectProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null);

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  const containerHeightClass = size === "sm" ? "max-h-48" : "max-h-64";

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

  function handleToggle() {
    if (disabled || options.length === 0) {
      return;
    }

    setIsOpen((currentValue) => !currentValue);
  }

  function handleSelect(nextValue: string) {
    if (disabled) {
      return;
    }

    onChange(nextValue);
    setIsOpen(false);
  }

  if (options.length === 0) {
    return (
      <div className="app-card-soft rounded-2xl px-4 py-3 text-sm font-bold">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="wheel-select-trigger touch-button flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`${title}: ${selectedOption?.label}`}
        aria-expanded={isOpen}
      >
        <span className="min-w-0">
          <span className="app-title block truncate text-sm font-black">
            {selectedOption?.label}
          </span>

          <span className="app-muted mt-0.5 block text-xs font-semibold">
            Toque para trocar
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
            Toque em uma opção para escolher
          </p>

          <div
            className={`option-wheel-scroll ${containerHeightClass} overflow-y-auto overscroll-contain rounded-3xl p-2`}
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
                    disabled={disabled}
                    className={`touch-button flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed ${
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
