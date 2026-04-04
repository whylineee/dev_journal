import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installBrowserMocks } from "./helpers/browserMocks";
import {
  APP_SHELL_STORAGE_KEYS,
  applyPreferenceSnapshot,
  exportPreferenceSnapshot,
  PLANNER_COLLAPSE_STORAGE_KEY,
  PLANNER_DAILY_WINS_STORAGE_KEY,
  PREFERENCES_APPLIED_EVENT,
  TASKS_FILTER_EVENT,
  TASKS_OVERDUE_ONLY_STORAGE_KEY,
  THEME_STORAGE_KEYS,
} from "../src/utils/preferencesStorage";

const browser = installBrowserMocks();

beforeEach(() => {
  browser.reset();
});

test("exportPreferenceSnapshot collects persisted UI and theme preferences", () => {
  localStorage.setItem(APP_SHELL_STORAGE_KEYS.reminderEnabled, "false");
  localStorage.setItem(APP_SHELL_STORAGE_KEYS.reminderHour, "21");
  localStorage.setItem(APP_SHELL_STORAGE_KEYS.journalPreviewEnabled, "true");
  localStorage.setItem(APP_SHELL_STORAGE_KEYS.pagePreviewEnabled, "false");
  localStorage.setItem(APP_SHELL_STORAGE_KEYS.autosaveEnabled, "true");
  localStorage.setItem(APP_SHELL_STORAGE_KEYS.lastReminderDate, "2026-04-04");
  localStorage.setItem(
    APP_SHELL_STORAGE_KEYS.meetingReminderMap,
    JSON.stringify({ "meeting-1": "2026-04-04T09:00:00Z" })
  );
  localStorage.setItem(THEME_STORAGE_KEYS.themePreset, "forest");
  localStorage.setItem(THEME_STORAGE_KEYS.appearanceMode, "dark");
  localStorage.setItem(THEME_STORAGE_KEYS.fontPreset, "mono");
  localStorage.setItem(THEME_STORAGE_KEYS.uiDensity, "compact");
  localStorage.setItem(THEME_STORAGE_KEYS.borderRadius, "14");
  localStorage.setItem(
    PLANNER_DAILY_WINS_STORAGE_KEY,
    JSON.stringify({ "2026-04-04": ["Ship refactor"] })
  );
  localStorage.setItem(
    PLANNER_COLLAPSE_STORAGE_KEY,
    JSON.stringify({ meetings: true, dailyWins: false })
  );
  localStorage.setItem(TASKS_OVERDUE_ONLY_STORAGE_KEY, "true");

  const snapshot = exportPreferenceSnapshot(
    () => "light",
    (value) => Math.min(18, Math.max(6, Math.round(value)))
  );

  assert.deepEqual(snapshot, {
    appShell: {
      reminderEnabled: false,
      reminderHour: 21,
      journalPreviewEnabled: true,
      pagePreviewEnabled: false,
      autosaveEnabled: true,
      lastReminderDate: "2026-04-04",
      meetingReminderMap: { "meeting-1": "2026-04-04T09:00:00Z" },
    },
    theme: {
      themePreset: "forest",
      appearanceMode: "dark",
      fontPreset: "mono",
      uiDensity: "compact",
      borderRadius: 14,
    },
    planner: {
      dailyWins: { "2026-04-04": ["Ship refactor"] },
      collapsedSections: { meetings: true, dailyWins: false },
    },
    tasks: {
      showOverdueOnly: true,
    },
  });
});

test("applyPreferenceSnapshot sanitizes persisted values and emits sync events", () => {
  applyPreferenceSnapshot({
    appShell: {
      reminderEnabled: false,
      reminderHour: 28,
      journalPreviewEnabled: true,
      autosaveEnabled: false,
      meetingReminderMap: {
        valid: "2026-04-04T09:00:00Z",
        broken: 42 as unknown as string,
      },
    },
    theme: {
      themePreset: "unknown" as unknown as "forest",
      appearanceMode: "dark",
      fontPreset: "mono",
      uiDensity: "compact",
      borderRadius: 12.6,
    },
    planner: {
      dailyWins: {
        "2026-04-04": ["Ship refactor", "  ", "Write tests"],
      },
      collapsedSections: {
        meetings: true,
        dailyWins: false,
      },
    },
    tasks: {
      showOverdueOnly: true,
    },
  });

  assert.equal(localStorage.getItem(APP_SHELL_STORAGE_KEYS.reminderEnabled), "false");
  assert.equal(localStorage.getItem(APP_SHELL_STORAGE_KEYS.reminderHour), "23");
  assert.equal(localStorage.getItem(APP_SHELL_STORAGE_KEYS.autosaveEnabled), "false");
  assert.equal(localStorage.getItem(THEME_STORAGE_KEYS.themePreset), null);
  assert.equal(localStorage.getItem(THEME_STORAGE_KEYS.appearanceMode), "dark");
  assert.equal(localStorage.getItem(THEME_STORAGE_KEYS.borderRadius), "13");
  assert.deepEqual(
    JSON.parse(localStorage.getItem(APP_SHELL_STORAGE_KEYS.meetingReminderMap) ?? "{}"),
    { valid: "2026-04-04T09:00:00Z" }
  );
  assert.deepEqual(
    JSON.parse(localStorage.getItem(PLANNER_DAILY_WINS_STORAGE_KEY) ?? "{}"),
    { "2026-04-04": ["Ship refactor", "Write tests"] }
  );
  assert.equal(localStorage.getItem(TASKS_OVERDUE_ONLY_STORAGE_KEY), "true");
  assert.ok(browser.events.includes(TASKS_FILTER_EVENT));
  assert.equal(browser.events[browser.events.length - 1], PREFERENCES_APPLIED_EVENT);
});
