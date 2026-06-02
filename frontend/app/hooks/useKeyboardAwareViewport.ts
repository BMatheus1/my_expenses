"use client";

import { useEffect } from "react";

export function useKeyboardAwareViewport() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const viewport = window.visualViewport;

    function syncViewportHeight() {
      const height = viewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty(
        "--safe-viewport-height",
        `${Math.round(height)}px`,
      );
    }

    syncViewportHeight();
    viewport?.addEventListener("resize", syncViewportHeight);
    viewport?.addEventListener("scroll", syncViewportHeight);
    window.addEventListener("resize", syncViewportHeight);

    return () => {
      viewport?.removeEventListener("resize", syncViewportHeight);
      viewport?.removeEventListener("scroll", syncViewportHeight);
      window.removeEventListener("resize", syncViewportHeight);
      document.documentElement.style.removeProperty("--safe-viewport-height");
    };
  }, []);
}
