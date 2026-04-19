import type { ThemePresetId } from "../theme/presets";
import { DEFAULT_THEME_PRESET, isThemePresetId } from "../theme/presets";

export type AppearanceMode = "dark" | "light";
export type FontPreset = "inter" | "roboto" | "mono";
export type UiDensity = "comfortable" | "compact";

export interface AppShellPreferences {
  reminderEnabled: boolean;
  reminderHour: number;
  journalPreviewEnabled: boolean;
  pagePreviewEnabled: boolean;
  autosaveEnabled: boolean;
  lastReminderDate: string | null;
  meetingReminderMap: Record<string, string>;
}

export interface ThemePreferences {
  themePreset: ThemePresetId;
  appearanceMode: AppearanceMode;
  fontPreset: FontPreset;
  uiDensity: UiDensity;
  borderRadius: number;
}

export interface PlannerPreferences {
  dailyWins: Record<string, string[]>;
  collapsedSections: Record<string, boolean>;
}

export interface TasksPreferences {
  showOverdueOnly: boolean;
}

export interface PreferencesSnapshot {
  appShell?: Partial<AppShellPreferences>;
  theme?: Partial<ThemePreferences>;
  planner?: Partial<PlannerPreferences>;
  tasks?: Partial<TasksPreferences>;
}

export const PREFERENCES_APPLIED_EVENT = "devJournal:preferencesApplied";
export const TASKS_FILTER_EVENT = "devJournal:tasksFilter";

export const APP_SHELL_STORAGE_KEYS = {
  reminderEnabled: "devJournal_reminderEnabled",
  reminderHour: "devJournal_reminderHour",
  journalPreviewEnabled: "devJournal_journalPreviewEnabled",
  pagePreviewEnabled: "devJournal_pagePreviewEnabled",
  autosaveEnabled: "devJournal_autosaveEnabled",
  lastReminderDate: "devJournal_lastReminderDate",
  meetingReminderMap: "devJournal_meeting_reminders_sent",
} as const;

export const THEME_STORAGE_KEYS = {
  themePreset: "devJournal_themePreset",
  appearanceMode: "devJournal_appearanceMode",
  fontPreset: "devJournal_fontPreset",
  uiDensity: "devJournal_uiDensity",
  borderRadius: "devJournal_borderRadius",
} as const;

export const PLANNER_DAILY_WINS_STORAGE_KEY = "devJournal_daily_wins";
export const PLANNER_COLLAPSE_STORAGE_KEY = "devJournal_planner_collapsed_sections";
export const TASKS_OVERDUE_ONLY_STORAGE_KEY = "devJournal_tasks_overdue_only";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (key: string) => {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeString = (key: string, value: string) => {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures so preference updates do not break the UI flow.
  }
};

const removeString = (key: string) => {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures so preference updates do not break the UI flow.
  }
};

export const readBooleanPreference = (key: string, fallback: boolean) => {
  const raw = readString(key);
  if (raw === null) {
    return fallback;
  }
  return raw !== "false";
};

export const readIntegerPreference = (
  key: string,
  fallback: number,
  min: number,
  max: number
) => {
  const raw = readString(key);
  if (raw === null) {
    return fallback;
  }

  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
};

export const readEnumPreference = <T extends string>(
  key: string,
  fallback: T,
  values: readonly T[]
) => {
  const raw = readString(key);
  return raw !== null && values.includes(raw as T) ? (raw as T) : fallback;
};

export const readJsonRecord = <T>(
  key: string,
  validateValue: (value: unknown) => value is T
) => {
  try {
    const raw = readString(key);
    if (!raw) {
      return {} as Record<string, T>;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return {} as Record<string, T>;
    }

    return Object.entries(parsed).reduce<Record<string, T>>((acc, [recordKey, value]) => {
      if (recordKey.length > 0 && validateValue(value)) {
        acc[recordKey] = value;
      }
      return acc;
    }, {});
  } catch {
    return {} as Record<string, T>;
  }
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const readAppShellPreferences = (): AppShellPreferences => ({
  reminderEnabled: readBooleanPreference(APP_SHELL_STORAGE_KEYS.reminderEnabled, true),
  reminderHour: readIntegerPreference(APP_SHELL_STORAGE_KEYS.reminderHour, 18, 0, 23),
  journalPreviewEnabled: readBooleanPreference(
    APP_SHELL_STORAGE_KEYS.journalPreviewEnabled,
    true
  ),
  pagePreviewEnabled: readBooleanPreference(APP_SHELL_STORAGE_KEYS.pagePreviewEnabled, true),
  autosaveEnabled: readBooleanPreference(APP_SHELL_STORAGE_KEYS.autosaveEnabled, true),
  lastReminderDate: readString(APP_SHELL_STORAGE_KEYS.lastReminderDate),
  meetingReminderMap: readJsonRecord(
    APP_SHELL_STORAGE_KEYS.meetingReminderMap,
    (value): value is string => typeof value === "string"
  ),
});

export const readThemePreferences = (
  resolveAppearanceMode: () => AppearanceMode,
  clampBorderRadius: (value: number) => number
): ThemePreferences => ({
  themePreset: (() => {
    const value = readString(THEME_STORAGE_KEYS.themePreset);
    return isThemePresetId(value) ? value : DEFAULT_THEME_PRESET;
  })(),
  appearanceMode: readEnumPreference(
    THEME_STORAGE_KEYS.appearanceMode,
    resolveAppearanceMode(),
    ["dark", "light"] as const
  ),
  fontPreset: readEnumPreference(
    THEME_STORAGE_KEYS.fontPreset,
    "inter",
    ["inter", "roboto", "mono"] as const
  ),
  uiDensity: readEnumPreference(
    THEME_STORAGE_KEYS.uiDensity,
    "comfortable",
    ["comfortable", "compact"] as const
  ),
  borderRadius: clampBorderRadius(Number(readString(THEME_STORAGE_KEYS.borderRadius))),
});

export const readPlannerPreferences = (): PlannerPreferences => ({
  dailyWins: readJsonRecord(PLANNER_DAILY_WINS_STORAGE_KEY, isStringArray),
  collapsedSections: readJsonRecord(
    PLANNER_COLLAPSE_STORAGE_KEY,
    (value): value is boolean => typeof value === "boolean"
  ),
});

export const readTasksPreferences = (): TasksPreferences => ({
  showOverdueOnly: readString(TASKS_OVERDUE_ONLY_STORAGE_KEY) === "true",
});

export const exportPreferenceSnapshot = (
  resolveAppearanceMode: () => AppearanceMode,
  clampBorderRadius: (value: number) => number
): PreferencesSnapshot => ({
  appShell: readAppShellPreferences(),
  theme: readThemePreferences(resolveAppearanceMode, clampBorderRadius),
  planner: readPlannerPreferences(),
  tasks: readTasksPreferences(),
});

const writeMeetingReminderMap = (value: Record<string, string>) => {
  writeString(APP_SHELL_STORAGE_KEYS.meetingReminderMap, JSON.stringify(value));
};

const writePlannerPreferences = (value: PlannerPreferences) => {
  writeString(PLANNER_DAILY_WINS_STORAGE_KEY, JSON.stringify(value.dailyWins));
  writeString(PLANNER_COLLAPSE_STORAGE_KEY, JSON.stringify(value.collapsedSections));
};

const dispatchWindowEvent = (eventName: string, detail?: unknown) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(eventName, detail === undefined ? undefined : { detail }));
};

export const dispatchTasksFilterPreference = (
  overdueOnly: boolean,
  resetFilters = false
) => {
  writeString(TASKS_OVERDUE_ONLY_STORAGE_KEY, String(overdueOnly));
  dispatchWindowEvent(TASKS_FILTER_EVENT, { overdueOnly, resetFilters });
};

export const applyPreferenceSnapshot = (snapshot: PreferencesSnapshot) => {
  if (snapshot.appShell) {
    const appShell = snapshot.appShell;
    if (typeof appShell.reminderEnabled === "boolean") {
      writeString(APP_SHELL_STORAGE_KEYS.reminderEnabled, String(appShell.reminderEnabled));
    }
    if (typeof appShell.reminderHour === "number") {
      writeString(
        APP_SHELL_STORAGE_KEYS.reminderHour,
        String(Math.min(23, Math.max(0, Math.round(appShell.reminderHour))))
      );
    }
    if (typeof appShell.journalPreviewEnabled === "boolean") {
      writeString(
        APP_SHELL_STORAGE_KEYS.journalPreviewEnabled,
        String(appShell.journalPreviewEnabled)
      );
    }
    if (typeof appShell.pagePreviewEnabled === "boolean") {
      writeString(APP_SHELL_STORAGE_KEYS.pagePreviewEnabled, String(appShell.pagePreviewEnabled));
    }
    if (typeof appShell.autosaveEnabled === "boolean") {
      writeString(APP_SHELL_STORAGE_KEYS.autosaveEnabled, String(appShell.autosaveEnabled));
    }
    if (typeof appShell.lastReminderDate === "string" || appShell.lastReminderDate === null) {
      if (appShell.lastReminderDate === null) {
        removeString(APP_SHELL_STORAGE_KEYS.lastReminderDate);
      } else {
        writeString(APP_SHELL_STORAGE_KEYS.lastReminderDate, appShell.lastReminderDate);
      }
    }
    if (appShell.meetingReminderMap && isPlainObject(appShell.meetingReminderMap)) {
      writeMeetingReminderMap(
        Object.entries(appShell.meetingReminderMap).reduce<Record<string, string>>(
          (acc, [key, value]) => {
            if (key.length > 0 && typeof value === "string") {
              acc[key] = value;
            }
            return acc;
          },
          {}
        )
      );
    }
  }

  if (snapshot.theme) {
    const theme = snapshot.theme;
    if (typeof theme.themePreset === "string" && isThemePresetId(theme.themePreset)) {
      writeString(THEME_STORAGE_KEYS.themePreset, theme.themePreset);
    }
    if (theme.appearanceMode === "dark" || theme.appearanceMode === "light") {
      writeString(THEME_STORAGE_KEYS.appearanceMode, theme.appearanceMode);
    }
    if (
      theme.fontPreset === "inter" ||
      theme.fontPreset === "roboto" ||
      theme.fontPreset === "mono"
    ) {
      writeString(THEME_STORAGE_KEYS.fontPreset, theme.fontPreset);
    }
    if (theme.uiDensity === "comfortable" || theme.uiDensity === "compact") {
      writeString(THEME_STORAGE_KEYS.uiDensity, theme.uiDensity);
    }
    if (typeof theme.borderRadius === "number" && Number.isFinite(theme.borderRadius)) {
      writeString(THEME_STORAGE_KEYS.borderRadius, String(Math.round(theme.borderRadius)));
    }
  }

  if (snapshot.planner) {
    writePlannerPreferences({
      dailyWins:
        snapshot.planner.dailyWins && isPlainObject(snapshot.planner.dailyWins)
          ? Object.entries(snapshot.planner.dailyWins).reduce<Record<string, string[]>>(
              (acc, [key, value]) => {
                if (key.length > 0 && isStringArray(value)) {
                  acc[key] = value.map((item) => item.trim()).filter(Boolean);
                }
                return acc;
              },
              {}
            )
          : readPlannerPreferences().dailyWins,
      collapsedSections:
        snapshot.planner.collapsedSections && isPlainObject(snapshot.planner.collapsedSections)
          ? Object.entries(snapshot.planner.collapsedSections).reduce<Record<string, boolean>>(
              (acc, [key, value]) => {
                if (key.length > 0 && typeof value === "boolean") {
                  acc[key] = value;
                }
                return acc;
              },
              {}
            )
          : readPlannerPreferences().collapsedSections,
    });
  }

  if (snapshot.tasks && typeof snapshot.tasks.showOverdueOnly === "boolean") {
    dispatchTasksFilterPreference(snapshot.tasks.showOverdueOnly, true);
  }

  dispatchWindowEvent(PREFERENCES_APPLIED_EVENT);
};
