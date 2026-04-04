import { APP_SHELL_STORAGE_KEYS, readBooleanPreference, readIntegerPreference } from "../utils/preferencesStorage";
import { usePersistentState } from "./usePersistentState";

export const useAppShellPreferences = () => {
  const [reminderEnabled, setReminderEnabled] = usePersistentState({
    storageKey: APP_SHELL_STORAGE_KEYS.reminderEnabled,
    parse: (raw) => raw !== "false",
    serialize: (value) => String(value),
  });

  const [reminderHour, setReminderHour] = usePersistentState({
    storageKey: APP_SHELL_STORAGE_KEYS.reminderHour,
    parse: () => readIntegerPreference(APP_SHELL_STORAGE_KEYS.reminderHour, 18, 0, 23),
    serialize: (value) => String(Math.min(23, Math.max(0, Math.round(value)))),
  });

  const [journalPreviewEnabled, setJournalPreviewEnabled] = usePersistentState({
    storageKey: APP_SHELL_STORAGE_KEYS.journalPreviewEnabled,
    parse: () => readBooleanPreference(APP_SHELL_STORAGE_KEYS.journalPreviewEnabled, true),
    serialize: (value) => String(value),
  });

  const [pagePreviewEnabled, setPagePreviewEnabled] = usePersistentState({
    storageKey: APP_SHELL_STORAGE_KEYS.pagePreviewEnabled,
    parse: () => readBooleanPreference(APP_SHELL_STORAGE_KEYS.pagePreviewEnabled, true),
    serialize: (value) => String(value),
  });

  const [autosaveEnabled, setAutosaveEnabled] = usePersistentState({
    storageKey: APP_SHELL_STORAGE_KEYS.autosaveEnabled,
    parse: () => readBooleanPreference(APP_SHELL_STORAGE_KEYS.autosaveEnabled, true),
    serialize: (value) => String(value),
  });

  return {
    reminderEnabled,
    setReminderEnabled,
    reminderHour,
    setReminderHour,
    journalPreviewEnabled,
    setJournalPreviewEnabled,
    pagePreviewEnabled,
    setPagePreviewEnabled,
    autosaveEnabled,
    setAutosaveEnabled,
  };
};
