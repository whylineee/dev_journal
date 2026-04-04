import { useEffect, useMemo, useState } from "react";
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
import { useAppNotifications } from "./notifications/AppNotifications";
import { useAppShellPreferences } from "./hooks/useAppShellPreferences";
import { useNotificationPermission } from "./hooks/useNotificationPermission";
import { useJournalReminder } from "./hooks/useJournalReminder";
import { useMeetingReminders } from "./hooks/useMeetingReminders";
import { useAppUsageTracking } from "./hooks/useAppUsageTracking";
import { dispatchTasksFilterPreference } from "./utils/preferencesStorage";

function App() {
  const [activeTab, setActiveTab] = useState<'planner' | 'focus' | 'journal' | 'page' | 'tasks' | 'goals' | 'habits' | 'projects' | 'insights' | 'settings'>('planner');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const {
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
  } = useAppShellPreferences();
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
  const ensureNotificationPermission = useNotificationPermission();

  useJournalReminder({
    entries,
    reminderEnabled,
    reminderHour,
    ensureNotificationPermission,
    notify,
    t,
  });

  useMeetingReminders({
    meetings,
    ensureNotificationPermission,
    notify,
    t,
  });

  useAppUsageTracking();

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
          dispatchTasksFilterPreference(false, true);
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
          dispatchTasksFilterPreference(true, true);
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
