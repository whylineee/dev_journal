import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "./components/Layout";
import type { CommandAction } from "./components/CommandPalette";
import { format } from "date-fns";
import { Box } from "@mui/material";
import { useEntries } from "./hooks/useEntries";
import { usePages } from "./hooks/usePages";
import { useGoals } from "./hooks/useGoals";
import { useHabits } from "./hooks/useHabits";
import { useProjects } from "./hooks/useProjects";
import { useMeetings } from "./hooks/useMeetings";
import { useThemeContext } from "./theme/ThemeContext";
import { useI18n } from "./i18n/I18nContext";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useAppNotifications } from "./notifications/AppNotifications";
import { expandMeetingOccurrences } from "./utils/meetingUtils";
import { EntryForm } from "./components/EntryForm";
import { PageEditor } from "./components/PageEditor";
import { GitCommits } from "./components/GitCommits";
import { Stats } from "./components/Stats";
import { TasksBoard } from "./components/TasksBoard";
import { GoalsBoard } from "./components/GoalsBoard";
import { HabitsBoard } from "./components/HabitsBoard";
import { ProjectsBoard } from "./components/ProjectsBoard";
import { PlannerBoard } from "./components/PlannerBoard";
import { WeeklySummary } from "./components/WeeklySummary";
import { CommandPalette } from "./components/CommandPalette";
import { InsightsBoard } from "./components/InsightsBoard";
import { FocusBoard } from "./components/FocusBoard";
import { SettingsScreen } from "./components/SettingsScreen";
import { readAppUsageMap, writeAppUsageMap } from "./utils/analyticsStorage";

const MEETING_REMINDER_STORAGE_KEY = "devJournal_meeting_reminders_sent";

function App() {
  const [activeTab, setActiveTab] = useState<'planner' | 'focus' | 'journal' | 'page' | 'tasks' | 'goals' | 'habits' | 'projects' | 'insights' | 'settings'>('planner');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(() => {
    return localStorage.getItem("devJournal_reminderEnabled") !== "false";
  });
  const [reminderHour, setReminderHour] = useState<number>(() => {
    const value = Number(localStorage.getItem("devJournal_reminderHour"));
    return Number.isInteger(value) && value >= 0 && value <= 23 ? value : 18;
  });
  const [journalPreviewEnabled, setJournalPreviewEnabled] = useState<boolean>(() => {
    return localStorage.getItem("devJournal_journalPreviewEnabled") !== "false";
  });
  const [pagePreviewEnabled, setPagePreviewEnabled] = useState<boolean>(() => {
    return localStorage.getItem("devJournal_pagePreviewEnabled") !== "false";
  });
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(() => {
    return localStorage.getItem("devJournal_autosaveEnabled") !== "false";
  });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { data: entries } = useEntries();
  const { data: pages } = usePages();
  const { data: goals } = useGoals();
  const { data: habits } = useHabits();
  const { data: projects } = useProjects();
  const { data: meetings } = useMeetings();
  const { appearanceMode, setAppearanceMode } = useThemeContext();
  const { language, setLanguage, t } = useI18n();
  const { notify } = useAppNotifications();
  const lastReminderDateRef = useRef<string | null>(localStorage.getItem("devJournal_lastReminderDate"));
  const notificationPermissionRequestedRef = useRef(false);
  const notificationPermissionDeniedRef = useRef(false);

  const ensureNotificationPermission = useCallback(async () => {
    try {
      const permissionGranted = await isPermissionGranted();
      if (permissionGranted) {
        notificationPermissionDeniedRef.current = false;
        notificationPermissionRequestedRef.current = true;
        return true;
      }

      if (notificationPermissionDeniedRef.current || notificationPermissionRequestedRef.current) {
        return false;
      }

      notificationPermissionRequestedRef.current = true;
      const permission = await requestPermission();
      const granted = permission === "granted";
      notificationPermissionDeniedRef.current = !granted;

      return granted;
    } catch {
      notificationPermissionDeniedRef.current = true;
      return false;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("devJournal_reminderEnabled", String(reminderEnabled));
  }, [reminderEnabled]);

  useEffect(() => {
    localStorage.setItem("devJournal_reminderHour", String(reminderHour));
  }, [reminderHour]);
  useEffect(() => {
    localStorage.setItem("devJournal_journalPreviewEnabled", String(journalPreviewEnabled));
  }, [journalPreviewEnabled]);
  useEffect(() => {
    localStorage.setItem("devJournal_pagePreviewEnabled", String(pagePreviewEnabled));
  }, [pagePreviewEnabled]);
  useEffect(() => {
    localStorage.setItem("devJournal_autosaveEnabled", String(autosaveEnabled));
  }, [autosaveEnabled]);

  useEffect(() => {
    const checkTime = async () => {
      if (!reminderEnabled) {
        return;
      }

      const tauriInvoke = typeof window !== "undefined"
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

      if (permissionGranted) {
        sendNotification({
          title: t("Dev Journal Reminder"),
          body: t("It's past {hour}:00. Time to write your dev journal!", {
            hour: String(reminderHour).padStart(2, "0"),
          }),
        });
        notify(
          t("It's past {hour}:00. Time to write your dev journal!", {
            hour: String(reminderHour).padStart(2, "0"),
          }),
          "info"
        );
        lastReminderDateRef.current = todayStr;
        localStorage.setItem("devJournal_lastReminderDate", todayStr);
      }
    };

    const interval = setInterval(checkTime, 60000);
    checkTime();

    return () => clearInterval(interval);
  }, [ensureNotificationPermission, entries, notify, reminderEnabled, reminderHour, t]);

  useEffect(() => {
    const readReminderMap = (): Record<string, string> => {
      try {
        const raw = localStorage.getItem(MEETING_REMINDER_STORAGE_KEY);
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
      localStorage.setItem(MEETING_REMINDER_STORAGE_KEY, JSON.stringify(value));
    };

    const checkMeetingReminders = async () => {
      if (!meetings?.length) {
        return;
      }

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
        if (occurrence.status === "done" || occurrence.status === "cancelled" || occurrence.status === "missed") {
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
    };

    const interval = window.setInterval(checkMeetingReminders, 30000);
    checkMeetingReminders();
    return () => window.clearInterval(interval);
  }, [ensureNotificationPermission, meetings, notify, t]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const persistUsage = (map: Record<string, number>) => {
      writeAppUsageMap(map);
    };

    const addUsageMs = (elapsedMs: number) => {
      if (elapsedMs <= 0) {
        return;
      }

      const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1000));
      const usageMap = readAppUsageMap();
      const today = format(new Date(), "yyyy-MM-dd");
      usageMap[today] = (usageMap[today] ?? 0) + elapsedSeconds;
      persistUsage(usageMap);
    };

    const isActive = () => document.visibilityState === "visible" && document.hasFocus();
    let lastTick = Date.now();
    let wasActive = isActive();

    const handleTick = () => {
      const now = Date.now();
      if (wasActive) {
        addUsageMs(now - lastTick);
      }
      lastTick = now;
      wasActive = isActive();
    };

    const interval = window.setInterval(handleTick, 15000);
    const syncActiveState = () => {
      handleTick();
    };

    window.addEventListener("focus", syncActiveState);
    window.addEventListener("blur", syncActiveState);
    document.addEventListener("visibilitychange", syncActiveState);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncActiveState);
      window.removeEventListener("blur", syncActiveState);
      document.removeEventListener("visibilitychange", syncActiveState);
      handleTick();
    };
  }, []);

  const commandActions = useMemo<CommandAction[]>(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const actions: CommandAction[] = [
      {
        id: "open-planner",
        title: t("Open Planner"),
        subtitle: t("Switch to daily command center"),
        section: t("Quick Actions"),
        keywords: ["planner", "today", "dashboard"],
        onSelect: () => {
          setActiveTab("planner");
        },
      },
      {
        id: "go-today",
        title: t("Go to Today Journal"),
        subtitle: t("Open today's daily entry"),
        section: t("Quick Actions"),
        keywords: ["today", "journal", "daily"],
        onSelect: () => {
          setActiveTab("journal");
          setSelectedDate(today);
        },
      },
      {
        id: "open-focus",
        title: t("Open Focus Session"),
        subtitle: t("Pomodoro timer and deep work"),
        section: t("Quick Actions"),
        keywords: ["focus", "pomodoro", "timer", "session"],
        onSelect: () => {
          setActiveTab("focus");
        },
      },
      {
        id: "open-tasks",
        title: t("Open Tasks Board"),
        subtitle: t("Switch to tasks management view"),
        section: t("Quick Actions"),
        keywords: ["tasks", "kanban"],
        onSelect: () => {
          localStorage.setItem("devJournal_tasks_overdue_only", "false");
          window.dispatchEvent(
            new CustomEvent("devJournal:tasksFilter", {
              detail: { overdueOnly: false, resetFilters: true },
            })
          );
          setActiveTab("tasks");
        },
      },
      {
        id: "open-overdue-tasks",
        title: t("Open Overdue Tasks"),
        subtitle: t("Switch to tasks with overdue filter"),
        section: t("Quick Actions"),
        keywords: ["tasks", "overdue", "deadline"],
        onSelect: () => {
          localStorage.setItem("devJournal_tasks_overdue_only", "true");
          window.dispatchEvent(
            new CustomEvent("devJournal:tasksFilter", {
              detail: { overdueOnly: true, resetFilters: true },
            })
          );
          setActiveTab("tasks");
        },
      },
      {
        id: "open-goals",
        title: t("Open Goals Board"),
        subtitle: t("Switch to long-term goals tracking"),
        section: t("Quick Actions"),
        keywords: ["goals", "milestones", "planning"],
        onSelect: () => {
          setActiveTab("goals");
        },
      },
      {
        id: "open-habits",
        title: t("Open Habits Tracker"),
        subtitle: t("Switch to routine and streak tracking"),
        section: t("Quick Actions"),
        keywords: ["habits", "streak", "routine"],
        onSelect: () => {
          setActiveTab("habits");
        },
      },
      {
        id: "open-projects",
        title: t("Open Projects"),
        subtitle: t("Manage cross-cutting project scopes"),
        section: t("Quick Actions"),
        keywords: ["projects", "hub", "portfolio"],
        onSelect: () => {
          setActiveTab("projects");
        },
      },
      {
        id: "open-insights",
        title: t("Open Insights"),
        subtitle: t("Decision logs, incidents and retros"),
        section: t("Quick Actions"),
        keywords: ["insights", "adr", "retro", "debug"],
        onSelect: () => {
          setActiveTab("insights");
        },
      },
      {
        id: "new-page",
        title: t("Create New Page"),
        subtitle: t("Open editor in new page mode"),
        section: t("Quick Actions"),
        keywords: ["page", "new", "note"],
        onSelect: () => {
          setActiveTab("page");
          setSelectedPageId(null);
        },
      },
      {
        id: "open-settings",
        title: t("Open Settings"),
        subtitle: t("Theme, reminders and data controls"),
        section: t("Quick Actions"),
        keywords: ["settings", "theme", "preferences"],
        onSelect: () => {
          setActiveTab("settings");
        },
      },
      {
        id: "toggle-theme-mode",
        title: t("Switch to {mode} Mode", {
          mode: appearanceMode === "dark" ? t("Light") : t("Dark"),
        }),
        subtitle: t("Toggle appearance mode instantly"),
        section: t("Quick Actions"),
        keywords: ["theme", "dark", "light"],
        onSelect: () => {
          setAppearanceMode(appearanceMode === "dark" ? "light" : "dark");
        },
      },
      {
        id: "toggle-language",
        title: `${t("Language")}: ${language === "en" ? t("English") : t("Ukrainian")}`,
        subtitle: t("Switch language to {language}", {
          language: language === "en" ? t("Ukrainian") : t("English"),
        }),
        section: t("Quick Actions"),
        keywords: ["language", "locale", "ua", "en"],
        onSelect: () => {
          setLanguage(language === "en" ? "uk" : "en");
        },
      },
    ];

    (entries ?? []).slice(0, 10).forEach((entry) => {
      actions.push({
        id: `entry-${entry.date}`,
        title: `Open Journal: ${entry.date}`,
        subtitle: t("Jump to saved daily entry"),
        section: t("Journal"),
        keywords: ["journal", entry.date],
        onSelect: () => {
          setActiveTab("journal");
          setSelectedDate(entry.date);
        },
      });
    });

    (pages ?? []).slice(0, 10).forEach((page) => {
      actions.push({
        id: `page-${page.id}`,
        title: `Open Page: ${page.title || "Untitled"}`,
        subtitle: t("Jump to page editor"),
        section: t("Pages"),
        keywords: ["page", page.title ?? ""],
        onSelect: () => {
          setActiveTab("page");
          setSelectedPageId(page.id);
        },
      });
    });

    (goals ?? []).slice(0, 10).forEach((goal) => {
      actions.push({
        id: `goal-${goal.id}`,
        title: t("Open Goals: {title}", { title: goal.title || "Untitled" }),
        subtitle: `${goal.progress}% complete`,
        section: t("Goals"),
        keywords: ["goal", "milestone", goal.title ?? ""],
        onSelect: () => {
          setActiveTab("goals");
        },
      });
    });

    (habits ?? []).slice(0, 10).forEach((habit) => {
      actions.push({
        id: `habit-${habit.id}`,
        title: t("Open Habits: {title}", { title: habit.title || "Untitled" }),
        subtitle: t("Streak {count}d", { count: habit.current_streak }),
        section: t("Habits"),
        keywords: ["habit", "routine", habit.title ?? ""],
        onSelect: () => {
          setActiveTab("habits");
        },
      });
    });

    (projects ?? []).slice(0, 10).forEach((project) => {
      actions.push({
        id: `project-${project.id}`,
        title: t("Open Project: {title}", { title: project.name || "Untitled" }),
        subtitle: t("Project hub detail and linked work"),
        section: t("Projects"),
        keywords: ["project", "hub", project.name ?? ""],
        onSelect: () => {
          setActiveTab("projects");
        },
      });
    });

    return actions;
  }, [appearanceMode, entries, goals, habits, language, pages, projects, setAppearanceMode, setLanguage, t]);

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
      >
        <Box sx={{ height: '100%', pb: 4, width: "100%" }}>
          {activeTab === 'journal' ? (
              <>
                <EntryForm
                  date={selectedDate}
                  previewEnabled={journalPreviewEnabled}
                  autosaveEnabled={autosaveEnabled}
                />
                <Box sx={{ mt: 4 }}>
                  <WeeklySummary />
                </Box>
                <Box sx={{ mt: 6 }}>
                  <Stats />
                </Box>
                <Box sx={{ mt: 4 }}>
                  <GitCommits />
                </Box>
              </>
            ) : activeTab === 'planner' ? (
              <PlannerBoard
                onOpenTasks={() => setActiveTab("tasks")}
                onOpenGoals={() => setActiveTab("goals")}
                onOpenHabits={() => setActiveTab("habits")}
                onOpenProjects={() => setActiveTab("projects")}
                onOpenFocus={() => setActiveTab("focus")}
              />
            ) : activeTab === 'focus' ? (
              <FocusBoard />
            ) : activeTab === 'tasks' ? (
              <TasksBoard />
            ) : activeTab === 'goals' ? (
              <GoalsBoard />
            ) : activeTab === 'habits' ? (
              <HabitsBoard />
            ) : activeTab === 'projects' ? (
              <ProjectsBoard />
            ) : activeTab === 'insights' ? (
              <InsightsBoard />
            ) : activeTab === 'settings' ? (
              <SettingsScreen
                reminderEnabled={reminderEnabled}
                onReminderEnabledChange={setReminderEnabled}
                reminderHour={reminderHour}
                onReminderHourChange={setReminderHour}
                journalPreviewEnabled={journalPreviewEnabled}
                onJournalPreviewEnabledChange={setJournalPreviewEnabled}
                pagePreviewEnabled={pagePreviewEnabled}
                onPagePreviewEnabledChange={setPagePreviewEnabled}
                autosaveEnabled={autosaveEnabled}
                onAutosaveEnabledChange={setAutosaveEnabled}
              />
            ) : (
              <PageEditor
                pageId={selectedPageId}
                previewEnabled={pagePreviewEnabled}
                autosaveEnabled={autosaveEnabled}
                onSaveSuccess={(id) => {
                  setSelectedPageId(id);
                }}
                onDeleteSuccess={() => {
                  setSelectedPageId(null);
                }}
              />
            )}
        </Box>
      </Layout>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        actions={commandActions}
      />
    </>
  );
}

export default App;
