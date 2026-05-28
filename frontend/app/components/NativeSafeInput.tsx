"use client";

import {
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";

type NativeSafeInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
  maxLength?: number;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  ariaLabel?: string;
  sanitize?: (value: string) => string;
  enterKeyHint?: InputHTMLAttributes<HTMLInputElement>["enterKeyHint"];
};

type NativeSafeTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  ariaLabel?: string;
  rows?: number;
};

export function NativeSafeInput({
  value,
  onChange,
  placeholder,
  inputMode = "text",
  type = "text",
  maxLength,
  disabled = false,
  required = false,
  className = "app-input",
  ariaLabel,
  sanitize,
  enterKeyHint = "done",
}: NativeSafeInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function focusHiddenInput() {
    if (disabled) {
      return;
    }

    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });

    window.requestAnimationFrame(() => {
      try {
        const endPosition = input.value.length;
        input.setSelectionRange(endPosition, endPosition);
      } catch {
        // Some Android keyboards reject selection changes for numeric layouts.
      }
    });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = sanitize
      ? sanitize(event.target.value)
      : event.target.value;

    onChange(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  }

  const safeType = type === "number" ? "text" : type;
  const displayValue = type === "password" && value ? "•".repeat(value.length) : value;

  return (
    <span className="native-safe-field-shell">
      <button
        type="button"
        className={`${className} native-safe-field-trigger ${
          value ? "" : "native-safe-field-trigger-empty"
        }`}
        onClick={focusHiddenInput}
        disabled={disabled}
        aria-label={ariaLabel || placeholder || "Campo de texto"}
      >
        <span className="native-safe-field-value">
          {displayValue || placeholder || "\u00A0"}
        </span>
      </button>

      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        inputMode={inputMode}
        type={safeType}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint={enterKeyHint}
        tabIndex={-1}
        aria-hidden="true"
        className="native-safe-field-control"
      />
    </span>
  );
}

export function NativeSafeTextarea({
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  className = "app-input",
  ariaLabel,
  rows = 3,
}: NativeSafeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function focusHiddenTextarea() {
    if (disabled) {
      return;
    }

    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.focus({ preventScroll: true });

    window.requestAnimationFrame(() => {
      try {
        const endPosition = textarea.value.length;
        textarea.setSelectionRange(endPosition, endPosition);
      } catch {
        // Android WebView can reject selection changes in rare cases.
      }
    });
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  return (
    <span className="native-safe-field-shell">
      <button
        type="button"
        className={`${className} native-safe-field-trigger native-safe-textarea-trigger ${
          value ? "" : "native-safe-field-trigger-empty"
        }`}
        onClick={focusHiddenTextarea}
        disabled={disabled}
        aria-label={ariaLabel || placeholder || "Campo de texto"}
      >
        <span className="native-safe-field-value">
          {value || placeholder || "\u00A0"}
        </span>
      </button>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        rows={rows}
        disabled={disabled}
        required={required}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        tabIndex={-1}
        aria-hidden="true"
        className="native-safe-field-control native-safe-textarea-control"
      />
    </span>
  );
}
