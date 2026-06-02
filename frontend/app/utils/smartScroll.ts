import type { RefObject } from "react";

type SmartScrollOptions = {
  delayMs?: number;
  focusFirstField?: boolean;
  block?: ScrollLogicalPosition;
  safeOffset?: number;
};

const DEFAULT_SCROLL_DELAY_MS = 80;
const DEFAULT_SAFE_OFFSET = 88;

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
      scrollElementIntoSafeView(element, options);

      if (options.focusFirstField && !shouldAvoidProgrammaticFieldFocus()) {
        focusFirstFieldInside(element);
      }
    });
  }, delayMs);
}

export function scrollElementIntoSafeView(
  element: HTMLElement | null,
  options: SmartScrollOptions = {},
) {
  if (!element || typeof window === "undefined") {
    return;
  }

  const safeOffset = options.safeOffset ?? getSafeTopOffset();
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const viewportTop = window.visualViewport?.offsetTop ?? 0;
  const elementRect = element.getBoundingClientRect();
  const safeTop = viewportTop + safeOffset;
  const safeBottom = viewportTop + viewportHeight - 28;

  if (elementRect.top >= safeTop && elementRect.bottom <= safeBottom) {
    return;
  }

  if (elementRect.height > viewportHeight - safeOffset - 48) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
    return;
  }

  const targetTop =
    window.scrollY +
    elementRect.top -
    (options.block === "center"
      ? Math.max(safeOffset, (viewportHeight - elementRect.height) / 2)
      : safeOffset);

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}

export function focusAndScrollToInput(element: HTMLElement | null) {
  if (!element || typeof window === "undefined") {
    return;
  }

  element.focus({
    preventScroll: true,
  });

  window.setTimeout(() => {
    scrollElementIntoSafeView(element, {
      block: "center",
      safeOffset: getSafeTopOffset(),
    });
  }, DEFAULT_SCROLL_DELAY_MS);
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

function getSafeTopOffset() {
  if (typeof window === "undefined") {
    return DEFAULT_SAFE_OFFSET;
  }

  const isMobileShell = window.matchMedia?.("(max-width: 1023px)").matches;

  return isMobileShell ? 112 : DEFAULT_SAFE_OFFSET;
}
function shouldAvoidProgrammaticFieldFocus() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const isTouchDevice = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const isAndroid = navigator.userAgent.toLowerCase().includes("android");

  return isTouchDevice && isAndroid;
}
