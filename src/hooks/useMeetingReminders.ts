import { useEffect } from "react";
import { sendNotification } from "@tauri-apps/plugin-notification";
import type { Meeting } from "../types";
import { expandMeetingOccurrences } from "../utils/meetingUtils";
import { APP_SHELL_STORAGE_KEYS } from "../utils/preferencesStorage";

const readReminderMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(APP_SHELL_STORAGE_KEYS.meetingReminderMap);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeReminderMap = (value: Record<string, string>) => {
  localStorage.setItem(APP_SHELL_STORAGE_KEYS.meetingReminderMap, JSON.stringify(value));
};

interface UseMeetingRemindersOptions {
  meetings: Meeting[] | undefined;
  ensureNotificationPermission: () => Promise<boolean>;
  notify: (message: string, severity?: "success" | "info" | "warning" | "error") => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

export const useMeetingReminders = ({
  meetings,
  ensureNotificationPermission,
  notify,
  t,
}: UseMeetingRemindersOptions) => {
  useEffect(() => {
    let running = false;

    const checkMeetingReminders = async () => {
      if (running || !meetings?.length) {
        return;
      }
      running = true;

      try {
        const occurrences = expandMeetingOccurrences(meetings, new Date(), 2);
        const now = new Date();
        const reminderMap = readReminderMap();
        const permissionGranted = await ensureNotificationPermission();
        if (!permissionGranted) {
          return;
        }

        let updated = false;
        occurrences.forEach((occurrence) => {
          if (occurrence.meeting.reminder_minutes <= 0) {
            return;
          }
          if (
            occurrence.status === "done" ||
            occurrence.status === "cancelled" ||
            occurrence.status === "missed"
          ) {
            return;
          }

          const reminderAt = new Date(
            occurrence.start.getTime() - occurrence.meeting.reminder_minutes * 60 * 1000
          );
          const occurrenceKey = `${occurrence.meeting_id}:${occurrence.start.toISOString()}`;
          if (reminderMap[occurrenceKey]) {
            return;
          }
          if (now < reminderAt || now > occurrence.start) {
            return;
          }

          const body = t("{title} starts in {minutes} minutes.", {
            title: occurrence.title,
            minutes: occurrence.meeting.reminder_minutes,
          });
          sendNotification({
            title: t("Meeting reminder"),
            body,
          });
          notify(body, "info");
          reminderMap[occurrenceKey] = now.toISOString();
          updated = true;
        });

        if (updated) {
          writeReminderMap(reminderMap);
        }
      } finally {
        running = false;
      }
    };

    const interval = window.setInterval(checkMeetingReminders, 30000);
    checkMeetingReminders();
    return () => window.clearInterval(interval);
  }, [ensureNotificationPermission, meetings, notify, t]);
};
