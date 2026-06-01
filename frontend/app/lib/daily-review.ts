"use client";

import type { Expense } from "../types/expense";

const DAILY_REVIEW_ENABLED_KEY = "my-expenses:daily-review:enabled";
const DAILY_REVIEW_DISMISSED_PREFIX = "my-expenses:daily-review:dismissed";
const DAILY_REVIEW_SETTINGS_EVENT = "my-expenses:daily-review-settings-changed";

export function getDailyReviewEnabled(userId: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const savedValue = window.localStorage.getItem(
    getDailyReviewEnabledKey(userId),
  );

  return savedValue !== "false";
}

export function saveDailyReviewEnabled(userId: string, value: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getDailyReviewEnabledKey(userId), String(value));
  window.dispatchEvent(new Event(DAILY_REVIEW_SETTINGS_EVENT));
}

export function subscribeToDailyReviewSettings(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(DAILY_REVIEW_SETTINGS_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(DAILY_REVIEW_SETTINGS_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function dismissDailyReviewCard(userId: string, dateValue: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getDailyReviewDismissedKey(userId), dateValue);
}

export function wasDailyReviewCardDismissed(
  userId: string,
  dateValue: string,
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(getDailyReviewDismissedKey(userId)) === dateValue;
}

export function shouldShowDailyReviewCard({
  expenses,
  today,
  currentHour,
  isEnabled,
  isDismissed,
}: {
  expenses: Expense[];
  today: string;
  currentHour: number;
  isEnabled: boolean;
  isDismissed: boolean;
}) {
  if (!isEnabled || isDismissed || currentHour < 18) {
    return false;
  }

  const todayExpensesCount = expenses.filter((expense) => expense.date === today).length;

  return todayExpensesCount <= 2;
}

function getDailyReviewEnabledKey(userId: string) {
  return `${DAILY_REVIEW_ENABLED_KEY}:${userId}`;
}

function getDailyReviewDismissedKey(userId: string) {
  return `${DAILY_REVIEW_DISMISSED_PREFIX}:${userId}`;
}
