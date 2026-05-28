import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from "@capacitor/local-notifications";

import type { CreditCard } from "../types/credit-card";
import type { Expense } from "../types/expense";

export type SmartNotificationTargetView = "expenses" | "credit-cards";

export type SmartNotificationPreferences = {
  version?: number;
  enabled: boolean;
  afternoonReminder: boolean;
  eveningReminder: boolean;
  invoiceReminder: boolean;
};

export type SmartNotificationPermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unavailable";

export const SMART_NOTIFICATIONS_CHANGED_EVENT =
  "my-expenses:smart-notifications-changed";

const SMART_NOTIFICATION_NAVIGATE_EVENT =
  "my-expenses:smart-notification-navigate";

const PENDING_NOTIFICATION_TARGET_KEY =
  "my-expenses:pending-notification-target";

const INSTALL_PERMISSION_REQUESTED_KEY =
  "my-expenses:smart-notifications:install-permission-requested";

const NOTIFICATION_CHANNEL_ID = "financial-reminders";
const CURRENT_PREFERENCES_VERSION = 2;
const REMINDER_ID_BASE = 410_000;
const REMINDER_ID_MAX = 699_999;
const INVOICE_ID_BASE = 700_000;
const INVOICE_ID_MAX = 1_800_000;
const REMINDER_SCHEDULE_DAYS = 14;
const INVOICE_SCHEDULE_DAYS = 75;
const INVOICE_REMINDER_HOUR = 10;
const INVOICE_REMINDER_MINUTE = 0;

const DEFAULT_PREFERENCES: SmartNotificationPreferences = {
  version: CURRENT_PREFERENCES_VERSION,
  enabled: true,
  afternoonReminder: true,
  eveningReminder: true,
  invoiceReminder: true,
};

const DAILY_REMINDER_SLOTS = [
  {
    key: "afternoonReminder" as const,
    slotIndex: 1,
    hour: 14,
    minute: 30,
    title: "Passando rapidinho 💸",
    body: "Quer registrar os gastos de hoje? Leva menos de 1 minuto.",
  },
  {
    key: "eveningReminder" as const,
    slotIndex: 2,
    hour: 20,
    minute: 0,
    title: "Fechando o dia ✨",
    body: "Anote seus últimos gastos e mantenha sua carteira em ordem.",
  },
];

let nativeActionListenerRegistered = false;

export function isNativeNotificationRuntime() {
  return (
    typeof window !== "undefined" &&
    typeof Capacitor.isNativePlatform === "function" &&
    Capacitor.isNativePlatform()
  );
}

export function readSmartNotificationPreferences(userId: string) {
  if (typeof window === "undefined") {
    return getDefaultPreferences();
  }

  const savedValue = window.localStorage.getItem(getPreferencesStorageKey(userId));

  if (!savedValue) {
    return getDefaultPreferences();
  }

  try {
    const parsedValue = JSON.parse(savedValue) as Partial<SmartNotificationPreferences>;

    return normalizePreferences(parsedValue);
  } catch {
    return getDefaultPreferences();
  }
}

export function saveSmartNotificationPreferences(
  userId: string,
  preferences: SmartNotificationPreferences,
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPreferences = normalizePreferences(preferences);

  window.localStorage.setItem(
    getPreferencesStorageKey(userId),
    JSON.stringify(normalizedPreferences),
  );

  dispatchSmartNotificationsChanged();
}

export async function requestInstallNotificationPermissionOnce() {
  if (!isNativeNotificationRuntime() || typeof window === "undefined") {
    return "unavailable" satisfies SmartNotificationPermissionStatus;
  }

  const hasAlreadyRequestedOnThisInstall =
    window.localStorage.getItem(INSTALL_PERMISSION_REQUESTED_KEY) === "true";
  const currentPermissionStatus = await getSmartNotificationPermissionStatus();

  if (currentPermissionStatus === "granted") {
    await ensureSmartNotificationChannel();
    markInstallPermissionAsRequested();
    dispatchSmartNotificationsChanged();
    return currentPermissionStatus;
  }

  if (currentPermissionStatus === "denied") {
    markInstallPermissionAsRequested();
    dispatchSmartNotificationsChanged();
    return currentPermissionStatus;
  }

  if (hasAlreadyRequestedOnThisInstall) {
    return currentPermissionStatus;
  }

  const requestedPermissionStatus = await requestSmartNotificationPermission();

  markInstallPermissionAsRequested();

  if (requestedPermissionStatus === "granted") {
    await ensureSmartNotificationChannel();
  }

  dispatchSmartNotificationsChanged();

  return requestedPermissionStatus;
}

export async function getSmartNotificationPermissionStatus(): Promise<SmartNotificationPermissionStatus> {
  if (!isNativeNotificationRuntime()) {
    return "unavailable";
  }

  try {
    const permissionStatus = await LocalNotifications.checkPermissions();

    return normalizePermissionStatus(permissionStatus.display);
  } catch {
    return "unavailable";
  }
}

export async function requestSmartNotificationPermission(): Promise<SmartNotificationPermissionStatus> {
  if (!isNativeNotificationRuntime()) {
    return "unavailable";
  }

  try {
    const currentPermission = await LocalNotifications.checkPermissions();

    if (currentPermission.display === "granted") {
      return "granted";
    }

    const requestedPermission = await LocalNotifications.requestPermissions();

    return normalizePermissionStatus(requestedPermission.display);
  } catch {
    return "unavailable";
  }
}

export async function enableSmartNotificationsForUser(userId: string) {
  const permissionStatus = await requestSmartNotificationPermission();

  if (permissionStatus !== "granted") {
    dispatchSmartNotificationsChanged();
    return permissionStatus;
  }

  saveSmartNotificationPreferences(userId, {
    ...readSmartNotificationPreferences(userId),
    version: CURRENT_PREFERENCES_VERSION,
    enabled: true,
    afternoonReminder: true,
    eveningReminder: true,
    invoiceReminder: true,
  });

  await ensureSmartNotificationChannel();

  return permissionStatus;
}

export async function disableSmartNotificationsForUser(userId: string) {
  saveSmartNotificationPreferences(userId, {
    ...readSmartNotificationPreferences(userId),
    version: CURRENT_PREFERENCES_VERSION,
    enabled: false,
  });

  await cancelSmartNotifications();
}

export async function reconcileSmartNotificationsForUser({
  userId,
  creditCards,
  expenses,
}: {
  userId: string;
  creditCards: CreditCard[];
  expenses: Expense[];
}) {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  const preferences = readSmartNotificationPreferences(userId);

  if (!preferences.enabled) {
    await cancelSmartNotifications();
    return;
  }

  const permissionStatus = await getSmartNotificationPermissionStatus();

  if (permissionStatus !== "granted") {
    await cancelSmartNotifications();
    return;
  }

  await ensureSmartNotificationChannel();
  await cancelSmartNotifications();

  const notifications = [
    ...buildDailyReminderNotifications(preferences, expenses),
    ...buildInvoiceReminderNotifications(preferences, creditCards, expenses),
  ];

  if (notifications.length === 0) {
    return;
  }

  await LocalNotifications.schedule({ notifications });
}

export function subscribeSmartNotificationNavigation(
  callback: (targetView: SmartNotificationTargetView) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  ensureNativeActionListener();

  function handleNavigation(event: Event) {
    const targetView = (event as CustomEvent<{ targetView?: string }>).detail
      ?.targetView;

    if (isValidTargetView(targetView)) {
      callback(targetView);
    }
  }

  window.addEventListener(SMART_NOTIFICATION_NAVIGATE_EVENT, handleNavigation);

  window.setTimeout(() => {
    const pendingTargetView = consumePendingTargetView();

    if (pendingTargetView) {
      callback(pendingTargetView);
    }
  }, 250);

  return () => {
    window.removeEventListener(
      SMART_NOTIFICATION_NAVIGATE_EVENT,
      handleNavigation,
    );
  };
}

function ensureNativeActionListener() {
  if (!isNativeNotificationRuntime() || nativeActionListenerRegistered) {
    return;
  }

  nativeActionListenerRegistered = true;

  void LocalNotifications.addListener(
    "localNotificationActionPerformed",
    (event: { notification: { extra?: { targetView?: unknown } } }) => {
      const targetView = event.notification.extra?.targetView;

      if (!isValidTargetView(targetView)) {
        return;
      }

      window.localStorage.setItem(PENDING_NOTIFICATION_TARGET_KEY, targetView);
      window.dispatchEvent(
        new CustomEvent(SMART_NOTIFICATION_NAVIGATE_EVENT, {
          detail: { targetView },
        }),
      );
    },
  );
}

async function ensureSmartNotificationChannel() {
  if (!isNativeNotificationRuntime() || Capacitor.getPlatform() !== "android") {
    return;
  }

  try {
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: "Lembretes financeiros",
      description:
        "Lembretes leves para registrar gastos e acompanhar faturas.",
      importance: 4,
      visibility: 1,
      lights: true,
      vibration: false,
    } as never);
  } catch {
    // O canal pode já existir. Nesse caso não há ação necessária.
  }
}

async function cancelSmartNotifications() {
  if (!isNativeNotificationRuntime()) {
    return;
  }

  try {
    const pendingNotifications = await LocalNotifications.getPending();
    const smartNotifications = pendingNotifications.notifications
      .filter((notification: { id: number }) => isSmartNotificationId(notification.id))
      .map((notification: { id: number }) => ({ id: notification.id }));

    if (smartNotifications.length === 0) {
      return;
    }

    await LocalNotifications.cancel({ notifications: smartNotifications });
  } catch {
    // Cancelamento é uma ação de manutenção. Falhas aqui não devem quebrar o app.
  }
}

function buildDailyReminderNotifications(
  preferences: SmartNotificationPreferences,
  expenses: Expense[],
): LocalNotificationSchema[] {
  const notifications: LocalNotificationSchema[] = [];
  const now = new Date();

  for (let offset = 0; offset < REMINDER_SCHEDULE_DAYS; offset += 1) {
    const targetDate = addDays(startOfLocalDay(now), offset);
    const dateValue = toDateValue(targetDate);
    const hasExpenseForDate = expenses.some((expense) => expense.date === dateValue);

    if (hasExpenseForDate) {
      continue;
    }

    for (const slot of DAILY_REMINDER_SLOTS) {
      if (!preferences[slot.key]) {
        continue;
      }

      const reminderDate = withTime(targetDate, slot.hour, slot.minute);

      if (reminderDate.getTime() <= now.getTime()) {
        continue;
      }

      notifications.push({
        id: buildDailyReminderId(reminderDate, slot.slotIndex),
        title: slot.title,
        body: slot.body,
        channelId: NOTIFICATION_CHANNEL_ID,
        schedule: {
          at: reminderDate,
          allowWhileIdle: false,
        },
        extra: {
          kind: "expense-reminder",
          targetView: "expenses",
          date: dateValue,
        },
      });
    }
  }

  return notifications;
}

function buildInvoiceReminderNotifications(
  preferences: SmartNotificationPreferences,
  creditCards: CreditCard[],
  expenses: Expense[],
): LocalNotificationSchema[] {
  if (!preferences.invoiceReminder) {
    return [];
  }

  const notifications: LocalNotificationSchema[] = [];
  const now = new Date();
  const scheduleUntil = addDays(now, INVOICE_SCHEDULE_DAYS);

  for (const card of creditCards) {
    for (let monthOffset = 0; monthOffset < 3; monthOffset += 1) {
      const invoiceMonth = getMonthFromDate(addMonths(startOfLocalMonth(now), monthOffset));
      const invoiceTotal = getInvoiceTotalForCard(expenses, card.id, invoiceMonth);

      if (invoiceTotal <= 0) {
        continue;
      }

      const dueDate = getDueDateForInvoiceMonth(invoiceMonth, card.due_day);
      const reminderDate = withTime(
        addDays(dueDate, -3),
        INVOICE_REMINDER_HOUR,
        INVOICE_REMINDER_MINUTE,
      );

      if (
        reminderDate.getTime() <= now.getTime() ||
        reminderDate.getTime() > scheduleUntil.getTime()
      ) {
        continue;
      }

      notifications.push({
        id: buildInvoiceReminderId(card.id, invoiceMonth),
        title: "Lembrete de fatura 💳",
        body: `Sua fatura do cartão ${card.name} vence em 3 dias. Vale conferir com calma para evitar atraso.`,
        channelId: NOTIFICATION_CHANNEL_ID,
        schedule: {
          at: reminderDate,
          allowWhileIdle: false,
        },
        extra: {
          kind: "invoice-reminder",
          targetView: "credit-cards",
          cardId: card.id,
          invoiceMonth,
        },
      });
    }
  }

  return notifications;
}

function getInvoiceTotalForCard(
  expenses: Expense[],
  cardId: string,
  invoiceMonth: string,
) {
  return expenses.reduce((total, expense) => {
    if (expense.payment_method !== "credit_card") {
      return total;
    }

    if (expense.credit_card_id !== cardId) {
      return total;
    }

    const expenseInvoiceMonth = expense.invoice_month || expense.date.slice(0, 7);

    if (expenseInvoiceMonth !== invoiceMonth) {
      return total;
    }

    return total + expense.amount;
  }, 0);
}

function normalizePreferences(
  preferences: Partial<SmartNotificationPreferences>,
): SmartNotificationPreferences {
  const savedVersion = preferences.version ?? 1;

  return {
    version: CURRENT_PREFERENCES_VERSION,
    enabled:
      savedVersion < CURRENT_PREFERENCES_VERSION
        ? true
        : preferences.enabled ?? DEFAULT_PREFERENCES.enabled,
    afternoonReminder:
      preferences.afternoonReminder ?? DEFAULT_PREFERENCES.afternoonReminder,
    eveningReminder:
      preferences.eveningReminder ?? DEFAULT_PREFERENCES.eveningReminder,
    invoiceReminder:
      preferences.invoiceReminder ?? DEFAULT_PREFERENCES.invoiceReminder,
  };
}

function getDefaultPreferences() {
  return { ...DEFAULT_PREFERENCES };
}

function normalizePermissionStatus(
  status: string,
): SmartNotificationPermissionStatus {
  if (status === "granted" || status === "denied" || status === "prompt") {
    return status;
  }

  return "unavailable";
}

function getPreferencesStorageKey(userId: string) {
  return `my-expenses:smart-notifications:${userId}`;
}

function markInstallPermissionAsRequested() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(INSTALL_PERMISSION_REQUESTED_KEY, "true");
}

function dispatchSmartNotificationsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(SMART_NOTIFICATIONS_CHANGED_EVENT));
}

function isSmartNotificationId(id: number) {
  return (
    (id >= REMINDER_ID_BASE && id <= REMINDER_ID_MAX) ||
    (id >= INVOICE_ID_BASE && id <= INVOICE_ID_MAX)
  );
}

function buildDailyReminderId(date: Date, slotIndex: number) {
  const daysSinceEpoch = Math.floor(startOfLocalDay(date).getTime() / 86_400_000);

  return REMINDER_ID_BASE + (daysSinceEpoch % 25_000) * 10 + slotIndex;
}

function buildInvoiceReminderId(cardId: string, invoiceMonth: string) {
  return INVOICE_ID_BASE + (hashString(`${cardId}:${invoiceMonth}`) % 900_000);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function consumePendingTargetView() {
  const pendingValue = window.localStorage.getItem(PENDING_NOTIFICATION_TARGET_KEY);

  if (!isValidTargetView(pendingValue)) {
    return null;
  }

  window.localStorage.removeItem(PENDING_NOTIFICATION_TARGET_KEY);

  return pendingValue;
}

function isValidTargetView(value: unknown): value is SmartNotificationTargetView {
  return value === "expenses" || value === "credit-cards";
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLocalMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function withTime(date: Date, hour: number, minute: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0,
  );
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getDueDateForInvoiceMonth(invoiceMonth: string, dueDay: number) {
  const [year, month] = invoiceMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const safeDueDay = Math.min(Math.max(dueDay, 1), lastDay);

  return new Date(year, month - 1, safeDueDay);
}

function getMonthFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
