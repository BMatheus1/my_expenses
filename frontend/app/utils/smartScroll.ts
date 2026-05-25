import type { RefObject } from "react";

type SmartScrollOptions = {
  delayMs?: number;
  focusFirstField?: boolean;
  block?: ScrollLogicalPosition;
};

const DEFAULT_SCROLL_DELAY_MS = 80;

const FOCUSABLE_FIELD_SELECTOR = [
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function smartScrollToRef(
  ref: RefObject<HTMLElement | null>,
  options: SmartScrollOptions = {},
) {
  smartScrollToElement(ref.current, options);
}

export function smartScrollToElement(
  element: HTMLElement | null,
  options: SmartScrollOptions = {},
) {
  if (!element || typeof window === "undefined") {
    return;
  }

  const delayMs = options.delayMs ?? DEFAULT_SCROLL_DELAY_MS;

  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: options.block ?? "start",
        inline: "nearest",
      });

      if (options.focusFirstField) {
        focusFirstFieldInside(element);
      }
    });
  }, delayMs);
}

export function scrollToPageTop(delayMs = 0) {
  if (typeof window === "undefined") {
    return;
  }

  window.setTimeout(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, delayMs);
}

function focusFirstFieldInside(element: HTMLElement) {
  const firstField = element.querySelector<HTMLElement>(FOCUSABLE_FIELD_SELECTOR);

  if (!firstField) {
    return;
  }

  window.setTimeout(() => {
    firstField.focus({
      preventScroll: true,
    });
  }, 250);
}