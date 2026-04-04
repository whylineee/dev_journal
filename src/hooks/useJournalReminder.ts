import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { sendNotification } from "@tauri-apps/plugin-notification";
import type { Entry } from "../types";
import {
  APP_SHELL_STORAGE_KEYS,
  PREFERENCES_APPLIED_EVENT,
} from "../utils/preferencesStorage";

interface UseJournalReminderOptions {
  entries: Entry[] | undefined;
  reminderEnabled: boolean;
  reminderHour: number;
  ensureNotificationPermission: () => Promise<boolean>;
  notify: (message: string, severity?: "success" | "info" | "warning" | "error") => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

export const useJournalReminder = ({
  entries,
  reminderEnabled,
  reminderHour,
  ensureNotificationPermission,
  notify,
  t,
}: UseJournalReminderOptions) => {
  const lastReminderDateRef = useRef<string | null>(
    localStorage.getItem(APP_SHELL_STORAGE_KEYS.lastReminderDate)
  );

  useEffect(() => {
    const syncReminderDate = () => {
      lastReminderDateRef.current = localStorage.getItem(APP_SHELL_STORAGE_KEYS.lastReminderDate);
    };

    window.addEventListener(PREFERENCES_APPLIED_EVENT, syncReminderDate);
    return () => window.removeEventListener(PREFERENCES_APPLIED_EVENT, syncReminderDate);
  }, []);

  useEffect(() => {
    const checkTime = async () => {
      if (!reminderEnabled) {
        return;
      }

      const tauriInvoke =
        typeof window !== "undefined"
          ? (window as { __TAURI_INTERNALS__?: { invoke?: unknown } }).__TAURI_INTERNALS__?.invoke
          : undefined;
      if (typeof tauriInvoke !== "function") {
        return;
      }

      const now = new Date();
      if (now.getHours() < reminderHour) {
        return;
      }

      const todayStr = format(now, "yyyy-MM-dd");
      if (lastReminderDateRef.current === todayStr) {
        return;
      }

      const hasTodayEntry = entries?.some((entry) => entry.date === todayStr);
      if (hasTodayEntry) {
        return;
      }

      const permissionGranted = await ensureNotificationPermission();
      if (!permissionGranted) {
        return;
      }

      const message = t("It's past {hour}:00. Time to write your dev journal!", {
        hour: String(reminderHour).padStart(2, "0"),
      });
      sendNotification({
        title: t("Dev Journal Reminder"),
        body: message,
      });
      notify(message, "info");
      lastReminderDateRef.current = todayStr;
      localStorage.setItem(APP_SHELL_STORAGE_KEYS.lastReminderDate, todayStr);
    };

    const interval = window.setInterval(checkTime, 60000);
    checkTime();

    return () => window.clearInterval(interval);
  }, [ensureNotificationPermission, entries, notify, reminderEnabled, reminderHour, t]);
};
