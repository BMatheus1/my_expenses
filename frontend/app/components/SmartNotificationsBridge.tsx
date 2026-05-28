"use client";

import { useCallback, useEffect } from "react";

import {
  DASHBOARD_CACHE_UPDATED_EVENT,
  readDashboardCache,
} from "../lib/dashboard-cache";
import {
  reconcileSmartNotificationsForUser,
  SMART_NOTIFICATIONS_CHANGED_EVENT,
  subscribeSmartNotificationNavigation,
} from "../lib/notification-service";
import type { User } from "../types/auth";
import type { AppView } from "./Sidebar";

type SmartNotificationsBridgeProps = {
  currentUser: User;
  onActiveViewChange: (view: AppView) => void;
};

export function SmartNotificationsBridge({
  currentUser,
  onActiveViewChange,
}: SmartNotificationsBridgeProps) {
  const reconcileNotifications = useCallback(() => {
    const cachedDashboard = readDashboardCache();

    void reconcileSmartNotificationsForUser({
      userId: currentUser.id,
      creditCards: cachedDashboard?.creditCards ?? [],
      expenses: cachedDashboard?.expenses ?? [],
    });
  }, [currentUser.id]);

  useEffect(() => {
    return subscribeSmartNotificationNavigation((targetView) => {
      onActiveViewChange(targetView);
    });
  }, [onActiveViewChange]);

  useEffect(() => {
    reconcileNotifications();

    function handleSyncRequest() {
      reconcileNotifications();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        reconcileNotifications();
      }
    }

    window.addEventListener(
      SMART_NOTIFICATIONS_CHANGED_EVENT,
      handleSyncRequest,
    );
    window.addEventListener(DASHBOARD_CACHE_UPDATED_EVENT, handleSyncRequest);
    window.addEventListener("focus", handleSyncRequest);
    window.addEventListener("online", handleSyncRequest);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(
        SMART_NOTIFICATIONS_CHANGED_EVENT,
        handleSyncRequest,
      );
      window.removeEventListener(DASHBOARD_CACHE_UPDATED_EVENT, handleSyncRequest);
      window.removeEventListener("focus", handleSyncRequest);
      window.removeEventListener("online", handleSyncRequest);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reconcileNotifications]);

  return null;
}
