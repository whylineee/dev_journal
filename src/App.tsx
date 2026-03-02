import { useState, useEffect, useRef, useMemo } from "react";
import { Layout } from "./components/Layout";
import { EntryForm } from "./components/EntryForm";
import { PageEditor } from "./components/PageEditor";
import { GitCommits } from "./components/GitCommits";
import { Stats } from "./components/Stats";
import { TasksBoard } from "./components/TasksBoard";
import { GoalsBoard } from "./components/GoalsBoard";
import { HabitsBoard } from "./components/HabitsBoard";
import { PlannerBoard } from "./components/PlannerBoard";
import { WeeklySummary } from "./components/WeeklySummary";
import { CommandAction, CommandPalette } from "./components/CommandPalette";
import { InsightsBoard } from "./components/InsightsBoard";
import { format } from "date-fns";
import { Box, Container } from "@mui/material";
import { useEntries } from "./hooks/useEntries";
import { usePages } from "./hooks/usePages";
import { useGoals } from "./hooks/useGoals";
import { useHabits } from "./hooks/useHabits";
import { useThemeContext } from "./theme/ThemeContext";
import { useI18n } from "./i18n/I18nContext";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useAppNotifications } from "./notifications/AppNotifications";

function App() {
  const [activeTab, setActiveTab] = useState<'planner' | 'journal' | 'page' | 'tasks' | 'goals' | 'habits' | 'insights'>('planner');
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { data: entries } = useEntries();
  const { data: pages } = usePages();
  const { data: goals } = useGoals();
  const { data: habits } = useHabits();
  const { appearanceMode, setAppearanceMode } = useThemeContext();
  const { language, setLanguage, t } = useI18n();
  const { notify } = useAppNotifications();
  const lastReminderDateRef = useRef<string | null>(localStorage.getItem("devJournal_lastReminderDate"));

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

      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }

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
  }, [entries, notify, reminderEnabled, reminderHour, t]);

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
        id: "open-tasks",
        title: t("Open Tasks Board"),
        subtitle: t("Switch to tasks management view"),
        section: t("Quick Actions"),
        keywords: ["tasks", "kanban"],
        onSelect: () => {
          localStorage.setItem("devJournal_tasks_overdue_only", "false");
          window.dispatchEvent(new CustomEvent("devJournal:tasksFilter", { detail: { overdueOnly: false } }));
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
          window.dispatchEvent(new CustomEvent("devJournal:tasksFilter", { detail: { overdueOnly: true } }));
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
          setSettingsOpen(true);
        },
      },
      {
        id: "toggle-theme-mode",
        title: t("Switch to {mode} Mode", {
          mode: appearanceMode === "dark" ? t("Light") : t("Dark"),
        }),
        subtitle: "Toggle appearance mode instantly",
        section: t("Quick Actions"),
        keywords: ["theme", "dark", "light"],
        onSelect: () => {
          setAppearanceMode(appearanceMode === "dark" ? "light" : "dark");
        },
      },
      {
        id: "toggle-language",
        title: `${t("Language")}: ${language === "en" ? t("English") : t("Ukrainian")}`,
        subtitle: `${t("Switch to {mode} Mode", { mode: language === "en" ? t("Ukrainian") : t("English") })}`,
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

    return actions;
  }, [appearanceMode, entries, goals, habits, language, pages, setAppearanceMode, setLanguage, t]);

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
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
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
      >
        <Container maxWidth="lg" sx={{ height: '100%', pb: 4 }}>
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
              onOpenJournalToday={() => {
                setActiveTab("journal");
                setSelectedDate(format(new Date(), "yyyy-MM-dd"));
              }}
              onOpenTasks={() => setActiveTab("tasks")}
              onOpenGoals={() => setActiveTab("goals")}
              onOpenHabits={() => setActiveTab("habits")}
            />
          ) : activeTab === 'tasks' ? (
            <TasksBoard />
          ) : activeTab === 'goals' ? (
            <GoalsBoard />
          ) : activeTab === 'habits' ? (
            <HabitsBoard />
          ) : activeTab === 'insights' ? (
            <InsightsBoard />
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
        </Container>
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
