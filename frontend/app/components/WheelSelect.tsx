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

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const selectedOption = options[selectedIndex] ?? options[0];
  const containerHeightClass = size === "sm" ? "h-40" : "h-52";
  const verticalPaddingClass = size === "sm" ? "py-14" : "py-20";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const selectedButton = buttonRefs.current[value];

    if (!selectedButton) {
      return;
    }

    selectedButton.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [isOpen, value]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }

      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

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

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 140);
  }

  function handleScroll() {
    if (disabled || options.length === 0) {
      return;
    }

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

      if (closestOption && closestOption.value !== value) {
        onChange(closestOption.value);
      }
    }, 90);
  }

  function selectByOffset(offset: number) {
    const nextOption = options[selectedIndex + offset];

    if (!nextOption || disabled) {
      return;
    }

    handleSelect(nextOption.value);
  }

  if (options.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-bold text-stone-500">
        {emptyMessage}
      </div>
    );
  }
  function handleClose(event?: React.SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    setIsOpen(false);
  }



  return (
    <div className="space-y-2">
      <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
          aria-label={`${title}: ${selectedOption?.label}`}
          aria-expanded={isOpen}
        >
          <span className="block truncate text-sm font-black text-stone-950">
            {selectedOption?.label}
          </span>

          <span className="mt-0.5 block text-xs font-semibold text-stone-400">
            Toque em trocar para selecionar outra opção
          </span>
        </button>

        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isOpen ? "Fechar" : "Trocar"}
        </button>
      </div>

      {isOpen ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-stone-400">
              Role para escolher
            </p>

            <button
              type="button"
              onPointerDown={handleClose}
              onClick={handleClose}
              className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-stone-200"
            >
              Concluir
            </button>
          </div>

          <button
            type="button"
            onClick={() => selectByOffset(-1)}
            disabled={disabled || selectedIndex <= 0}
            className="mx-auto mb-2 flex h-8 w-11 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-base font-black text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Opção anterior"
          >
            ▲
          </button>

          <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl border border-stone-100 bg-stone-50">
            <div className="pointer-events-none absolute left-3 right-3 top-1/2 z-10 h-12 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white shadow-sm" />

            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className={`option-wheel-scroll ${containerHeightClass} snap-y snap-mandatory overflow-y-auto scroll-smooth px-3 ${verticalPaddingClass}`}
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
                    onClick={() => handleSelect(option.value)}
                    disabled={disabled}
                    className={`relative z-20 mb-2 flex h-12 w-full snap-center items-center justify-center rounded-2xl px-4 text-sm font-black transition disabled:cursor-not-allowed ${
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
            onClick={() => selectByOffset(1)}
            disabled={disabled || selectedIndex >= options.length - 1}
            className="mx-auto mt-2 flex h-8 w-11 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-base font-black text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Próxima opção"
          >
            ▼
          </button>
        </div>
      ) : null}
    </div>
  );
}