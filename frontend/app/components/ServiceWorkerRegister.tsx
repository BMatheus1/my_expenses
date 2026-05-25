"use client";

import { useEffect } from "react";

const SERVICE_WORKER_PATH = "/sw.js";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const canUseServiceWorker =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (!canUseServiceWorker) {
      return;
    }

    function registerServiceWorker() {
      navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch((error) => {
        console.error("Erro ao registrar o service worker:", error);
      });
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });

    return () => {
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}