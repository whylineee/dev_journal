import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddTaskIcon from "@mui/icons-material/AddTask";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { alpha, useTheme } from "@mui/material/styles";
import { addDays, addMinutes, endOfWeek, format, isWithinInterval, parseISO, startOfDay, startOfWeek } from "date-fns";
import { useEntries } from "../hooks/useEntries";
import { useGoals } from "../hooks/useGoals";
import { useHabits, useToggleHabitCompletion } from "../hooks/useHabits";
import { useProjects } from "../hooks/useProjects";
import { useCreateTask, useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import {
  useCreateMeeting,
  useDeleteMeeting,
  useMaterializeMeetingActionItems,
  useMeetings,
  useUpdateMeeting,
} from "../hooks/useMeetings";
import { isGoalNearDeadline } from "../utils/goalUtils";
import { expandMeetingOccurrences } from "../utils/meetingUtils";
import { isTaskDueToday, isTaskOverdue } from "../utils/taskUtils";
import { useI18n } from "../i18n/I18nContext";
import { useAppNotifications } from "../notifications/AppNotifications";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Meeting, MeetingRecurrence, MeetingStatus } from "../types";

const DAILY_WINS_STORAGE_KEY = "devJournal_daily_wins";
const PLANNER_COLLAPSE_STORAGE_KEY = "devJournal_planner_collapsed_sections";
const FOCUS_SESSIONS_STORAGE_KEY = "devJournal_focus_sessions";

const toLocalDatetimeInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const buildGoogleCalendarLink = (params: {
  title: string;
  details: string;
  startAt: string;
  endAt: string;
  location?: string;
}) => {
  const start = new Date(params.startAt);
  const end = new Date(params.endAt);
  const formatDate = (value: Date) =>
    value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const search = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    details: params.details,
    dates: `${formatDate(start)}/${formatDate(end)}`,
  });

  if (params.location?.trim()) {
    search.set("location", params.location.trim());
  }

  return `https://calendar.google.com/calendar/render?${search.toString()}`;
};

const parseLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

type PlannerSectionKey =
  | "tasksToday"
  | "overdueTasks"
  | "goalsNearDeadline"
  | "habitsToday"
  | "meetings"
  | "tomorrowPlan"
  | "focusSession"
  | "dailyWins";

interface PlannerBoardProps {
  onOpenTasks: () => void;
  onOpenGoals: () => void;
  onOpenHabits: () => void;
  onOpenProjects: () => void;
  onOpenFocus: () => void;
}

export const PlannerBoard = ({
  onOpenTasks,
  onOpenGoals,
  onOpenHabits,
  onOpenProjects,
  onOpenFocus,
}: PlannerBoardProps) => {
  const { t } = useI18n();
  const { notify } = useAppNotifications();
  const muiTheme = useTheme();
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const toggleHabitCompletion = useToggleHabitCompletion();
  const updateTaskStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const materializeMeetingActionItems = useMaterializeMeetingActionItems();

  const { data: entries = [] } = useEntries();
  const { data: tasks = [] } = useTasks();
  const { data: goals = [] } = useGoals();
  const { data: habits = [] } = useHabits();
  const { data: projects = [] } = useProjects();
  const { data: meetings = [] } = useMeetings();

  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickDueMode, setQuickDueMode] = useState<"today" | "tomorrow" | "none">("today");
  const [quickProjectId, setQuickProjectId] = useState<number | "">("");
  const [quickTaskFeedback, setQuickTaskFeedback] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingMeetUrl, setMeetingMeetUrl] = useState("");
  const [meetingCalendarUrl, setMeetingCalendarUrl] = useState("");
  const [meetingProjectId, setMeetingProjectId] = useState<number | "">("");
  const [meetingParticipants, setMeetingParticipants] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingDecisions, setMeetingDecisions] = useState("");
  const [meetingActionItems, setMeetingActionItems] = useState("");
  const [meetingRecurrence, setMeetingRecurrence] = useState<MeetingRecurrence>("none");
  const [meetingRecurrenceUntil, setMeetingRecurrenceUntil] = useState("");
  const [meetingReminderMinutes, setMeetingReminderMinutes] = useState(10);
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>("planned");
  const [editingMeetingId, setEditingMeetingId] = useState<number | null>(null);
  const [meetingStartAt, setMeetingStartAt] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(roundedMinutes, 0, 0);
    return toLocalDatetimeInputValue(addMinutes(now, 30));
  });
  const [meetingEndAt, setMeetingEndAt] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(roundedMinutes, 0, 0);
    return toLocalDatetimeInputValue(addMinutes(now, 90));
  });
  const [meetingFeedback, setMeetingFeedback] = useState("");
  const [focusSessionsMap] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(FOCUS_SESSIONS_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [dailyWinsInput, setDailyWinsInput] = useState("");
  const [dailyWinsMap, setDailyWinsMap] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem(DAILY_WINS_STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [collapsedSections, setCollapsedSections] = useState<Partial<Record<PlannerSectionKey, boolean>>>(() => {
    try {
      const raw = localStorage.getItem(PLANNER_COLLAPSE_STORAGE_KEY);
      if (!raw) {
        return { meetings: true, tomorrowPlan: true, dailyWins: true };
      }
      const parsed = JSON.parse(raw) as Partial<Record<PlannerSectionKey, boolean>>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });

  const overdueTasks = useMemo(
    () => tasks.filter((task) => isTaskOverdue(task)).slice(0, 6),
    [tasks]
  );

  const dueTodayTasks = useMemo(
    () => tasks.filter((task) => isTaskDueToday(task)).slice(0, 6),
    [tasks]
  );

  const dueTomorrowTasks = useMemo(
    () => tasks.filter((task) => task.due_date === tomorrow && task.status !== "done").slice(0, 6),
    [tasks, tomorrow]
  );

  const nearGoals = useMemo(
    () => goals.filter((goal) => isGoalNearDeadline(goal, 14)).slice(0, 6),
    [goals]
  );

  const projectHubItems = useMemo(() => {
    return projects
      .filter((project) => project.status === "active" || project.status === "paused")
      .map((project) => {
        const projectTasks = tasks.filter((task) => task.project_id === project.id);
        const openTasks = projectTasks.filter((task) => task.status !== "done").length;
        const doneTasks = projectTasks.filter((task) => task.status === "done").length;
        const projectGoals = goals.filter((goal) => goal.project_id === project.id).length;
        const projectEntries = entries.filter((entry) => entry.project_id === project.id).length;
        return {
          id: project.id,
          name: project.name,
          color: project.color,
          openTasks,
          doneTasks,
          projectGoals,
          projectEntries,
        };
      })
      .sort((a, b) => b.openTasks - a.openTasks)
      .slice(0, 6);
  }, [entries, goals, projects, tasks]);

  const habitsWithTodayState = useMemo(
    () =>
      habits.map((habit) => ({
        ...habit,
        doneToday: habit.completed_dates.includes(today),
      })),
    [habits, today]
  );

  const upcomingMeetings = useMemo(() => {
    const now = new Date();
    return expandMeetingOccurrences(meetings, now, 14)
      .filter((occurrence) => occurrence.end.getTime() >= now.getTime() - 15 * 60 * 1000)
      .slice(0, 8);
  }, [meetings]);

  const todayMeetings = useMemo(
    () => upcomingMeetings.filter((occurrence) => format(occurrence.start, "yyyy-MM-dd") === today),
    [today, upcomingMeetings]
  );

  const weeklyMeetingOccurrences = useMemo(
    () => expandMeetingOccurrences(meetings, new Date(), 7),
    [meetings]
  );
  const editingMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === editingMeetingId) ?? null,
    [editingMeetingId, meetings]
  );

  const meetingDayBuckets = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) =>
      format(addDays(new Date(), index), "yyyy-MM-dd")
    );
    const counts = new Map<string, number>();
    days.forEach((day) => counts.set(day, 0));

    weeklyMeetingOccurrences.forEach((occurrence) => {
      const dayKey = format(occurrence.start, "yyyy-MM-dd");
      if (counts.has(dayKey)) {
        counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
      }
    });

    return days.map((day) => ({
      day,
      count: counts.get(day) ?? 0,
    }));
  }, [weeklyMeetingOccurrences]);

  const focusSessionsTodayCount = focusSessionsMap[today] ?? 0;

  const journalStreak = useMemo(() => {
    let streak = 0;
    const sortedDates = entries
      .map((e) => e.date)
      .sort()
      .reverse();
    const dateSet = new Set(sortedDates);
    const current = new Date();
    if (!dateSet.has(today)) {
      current.setDate(current.getDate() - 1);
    }
    while (dateSet.has(format(current, "yyyy-MM-dd"))) {
      streak++;
      current.setDate(current.getDate() - 1);
    }
    return streak;
  }, [entries, today]);

  const todayDashboardCards = useMemo(
    () => [
      { label: t("Due today"), value: dueTodayTasks.length, tone: "info" as const },
      { label: t("Overdue"), value: overdueTasks.length, tone: "error" as const },
      { label: t("Meetings"), value: todayMeetings.length, tone: "primary" as const },
      {
        label: t("Habits done today"),
        value: `${habitsWithTodayState.filter((habit) => habit.doneToday).length}/${habitsWithTodayState.length}`,
        tone: "success" as const,
      },
    ],
    [dueTodayTasks.length, overdueTasks.length, todayMeetings.length, habitsWithTodayState, t]
  );

  const usageStatsCards = useMemo(
    () => [
      { label: t("Focus sessions"), value: focusSessionsTodayCount, tone: "info" as const },
      { label: t("Journal streak"), value: `${journalStreak}d`, tone: "success" as const },
    ],
    [focusSessionsTodayCount, journalStreak, t]
  );

  const priorityTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "done")
        .sort((a, b) => {
          if (a.status === "in_progress" && b.status !== "in_progress") return -1;
          if (a.status !== "in_progress" && b.status === "in_progress") return 1;
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date && !b.due_date) return -1;
          if (!a.due_date && b.due_date) return 1;
          return b.updated_at.localeCompare(a.updated_at);
        })
        .slice(0, 5),
    [tasks],
  );

  const currentWeekInterval = useMemo(
    () => ({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
    []
  );

  const weeklyReview = useMemo(() => {
    const completedTasks = tasks.filter((task) => {
      if (!task.completed_at) {
        return false;
      }
      try {
        return isWithinInterval(parseISO(task.completed_at), currentWeekInterval);
      } catch {
        return false;
      }
    });

    const journalEntries = entries.filter((entry) => {
      try {
        return isWithinInterval(parseISO(`${entry.date}T00:00:00`), currentWeekInterval);
      } catch {
        return false;
      }
    });

    const habitCompletions = habits.reduce((sum, habit) => {
      return (
        sum +
        habit.completed_dates.filter((date) => {
          try {
            return isWithinInterval(parseISO(`${date}T00:00:00`), currentWeekInterval);
          } catch {
            return false;
          }
        }).length
      );
    }, 0);

    const winsThisWeek = Object.entries(dailyWinsMap).reduce((sum, [date, items]) => {
      try {
        return isWithinInterval(parseISO(`${date}T00:00:00`), currentWeekInterval) ? sum + items.length : sum;
      } catch {
        return sum;
      }
    }, 0);

    const meetingsThisWeek = weeklyMeetingOccurrences.filter((occurrence) =>
      isWithinInterval(occurrence.start, currentWeekInterval)
    );

    const focusSessionsThisWeek = Object.entries(focusSessionsMap).reduce((sum, [date, count]) => {
      try {
        return isWithinInterval(parseISO(`${date}T00:00:00`), currentWeekInterval) ? sum + count : sum;
      } catch {
        return sum;
      }
    }, 0);

    return {
      completedTasks,
      journalEntries,
      habitCompletions,
      winsThisWeek,
      meetingsThisWeek,
      focusSessionsThisWeek,
    };
  }, [currentWeekInterval, dailyWinsMap, entries, focusSessionsMap, habits, tasks, weeklyMeetingOccurrences]);

  const busy =
    toggleHabitCompletion.isPending ||
    updateTaskStatus.isPending ||
    createTask.isPending ||
    createMeeting.isPending ||
    updateMeeting.isPending ||
    deleteMeeting.isPending ||
    materializeMeetingActionItems.isPending;

  const dailyWins = dailyWinsMap[today] ?? [];
  const focusSessionsToday = focusSessionsMap[today] ?? 0;
  const isDark = muiTheme.palette.mode === "dark";
  const hasTodayEntry = useMemo(
    () => entries.some((entry) => entry.date === today),
    [entries, today]
  );
  const plannerCardSx = {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3.5,
    border: "1px solid",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.50)",
    bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.40)",
    backdropFilter: "blur(20px) saturate(1.3)",
    WebkitBackdropFilter: "blur(20px) saturate(1.3)",
    boxShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)"
      : "0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.60)",
  };

  const resetMeetingForm = () => {
    setEditingMeetingId(null);
    setMeetingTitle("");
    setMeetingAgenda("");
    setMeetingMeetUrl("");
    setMeetingCalendarUrl("");
    setMeetingProjectId("");
    setMeetingParticipants("");
    setMeetingNotes("");
    setMeetingDecisions("");
    setMeetingActionItems("");
    setMeetingRecurrence("none");
    setMeetingRecurrenceUntil("");
    setMeetingReminderMinutes(10);
    setMeetingStatus("planned");
    setMeetingFeedback("");
  };

  const loadMeetingIntoForm = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id);
    setMeetingTitle(meeting.title);
    setMeetingAgenda(meeting.agenda);
    setMeetingMeetUrl(meeting.meet_url ?? "");
    setMeetingCalendarUrl(meeting.calendar_event_url ?? "");
    setMeetingProjectId(meeting.project_id ?? "");
    setMeetingParticipants(meeting.participants.join("\n"));
    setMeetingNotes(meeting.notes);
    setMeetingDecisions(meeting.decisions);
    setMeetingActionItems(meeting.action_items.map((item) => item.title).join("\n"));
    setMeetingRecurrence(meeting.recurrence);
    setMeetingRecurrenceUntil(meeting.recurrence_until ? format(parseISO(meeting.recurrence_until), "yyyy-MM-dd") : "");
    setMeetingReminderMinutes(meeting.reminder_minutes);
    setMeetingStatus(meeting.status === "live" || meeting.status === "missed" ? "planned" : meeting.status);
    setMeetingStartAt(toLocalDatetimeInputValue(parseISO(meeting.start_at)));
    setMeetingEndAt(toLocalDatetimeInputValue(parseISO(meeting.end_at)));
    setMeetingFeedback("");
  };

  const handleQuickAddTask = () => {
    const title = quickTaskTitle.trim();
    if (!title) {
      return;
    }

    createTask.mutate(
      {
        title,
        description: "",
        status: "todo",
        priority: "medium",
        project_id: quickProjectId === "" ? null : quickProjectId,
        goal_id: null,
        due_date: quickDueMode === "today" ? today : quickDueMode === "tomorrow" ? tomorrow : null,
        recurrence: "none",
        recurrence_until: null,
        time_estimate_minutes: 0,
      },
      {
        onSuccess: () => {
          setQuickTaskTitle("");
          setQuickTaskFeedback(t("Task added to board."));
        },
      }
    );
  };

  const handleCreateMeeting = () => {
    const normalizedTitle = meetingTitle.trim();
    if (!normalizedTitle) {
      return;
    }

    const start = new Date(meetingStartAt);
    const end = new Date(meetingEndAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      setMeetingFeedback(t("Meeting end time must be after start time."));
      return;
    }

    const participants = parseLines(meetingParticipants);
    const action_items = parseLines(meetingActionItems).map((title, index) => {
      const existingItem = editingMeeting?.action_items[index];
      return {
        id: existingItem?.id ?? `draft-${Date.now()}-${index}`,
        title,
        completed: existingItem?.completed ?? false,
        task_id: existingItem?.task_id ?? null,
      };
    });
    const recurrence_until =
      meetingRecurrence !== "none" && meetingRecurrenceUntil
        ? new Date(`${meetingRecurrenceUntil}T23:59:59`).toISOString()
        : null;

    const payload = {
      title: normalizedTitle,
      agenda: meetingAgenda.trim(),
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      meet_url: meetingMeetUrl.trim() || null,
      calendar_event_url: meetingCalendarUrl.trim() || null,
      project_id: meetingProjectId === "" ? null : meetingProjectId,
      participants,
      notes: meetingNotes.trim(),
      decisions: meetingDecisions.trim(),
      action_items,
      recurrence: meetingRecurrence,
      recurrence_until,
      reminder_minutes: meetingReminderMinutes,
      status: meetingStatus,
    } as const;

    if (editingMeetingId !== null) {
      updateMeeting.mutate(
        {
          id: editingMeetingId,
          ...payload,
        },
        {
          onSuccess: () => {
            resetMeetingForm();
            setMeetingFeedback(t("Meeting updated."));
          },
          onError: () => {
            setMeetingFeedback(t("Failed to update meeting."));
          },
        }
      );
      return;
    }

    createMeeting.mutate(payload, {
      onSuccess: () => {
        resetMeetingForm();
        setMeetingFeedback(t("Meeting scheduled."));
      },
      onError: () => {
        setMeetingFeedback(t("Failed to schedule meeting."));
      },
    });
  };

  const openExternalUrl = (url: string, fallbackMessage: string) => {
    openUrl(url).catch(() => {
      notify(fallbackMessage, "error");
    });
  };

  const cancelMeeting = (meetingId: number) => {
    const target = meetings.find((meeting) => meeting.id === meetingId);
    if (!target) {
      return;
    }

    updateMeeting.mutate({
      id: target.id,
      title: target.title,
      agenda: target.agenda,
      start_at: target.start_at,
      end_at: target.end_at,
      meet_url: target.meet_url,
      calendar_event_url: target.calendar_event_url,
      project_id: target.project_id,
      participants: target.participants,
      notes: target.notes,
      decisions: target.decisions,
      action_items: target.action_items,
      recurrence: target.recurrence,
      recurrence_until: target.recurrence_until,
      reminder_minutes: target.reminder_minutes,
      status: "cancelled",
    });
  };

  const setMeetingWorkflowStatus = (meeting: Meeting, status: MeetingStatus) => {
    updateMeeting.mutate({
      id: meeting.id,
      title: meeting.title,
      agenda: meeting.agenda,
      start_at: meeting.start_at,
      end_at: meeting.end_at,
      meet_url: meeting.meet_url,
      calendar_event_url: meeting.calendar_event_url,
      project_id: meeting.project_id,
      participants: meeting.participants,
      notes: meeting.notes,
      decisions: meeting.decisions,
      action_items: meeting.action_items,
      recurrence: meeting.recurrence,
      recurrence_until: meeting.recurrence_until,
      reminder_minutes: meeting.reminder_minutes,
      status,
    });
  };

  const persistDailyWins = (nextMap: Record<string, string[]>) => {
    setDailyWinsMap(nextMap);
    localStorage.setItem(DAILY_WINS_STORAGE_KEY, JSON.stringify(nextMap));
  };

  const handleAddDailyWin = () => {
    const value = dailyWinsInput.trim();
    if (!value) {
      return;
    }
    const nextMap = { ...dailyWinsMap, [today]: [value, ...dailyWins].slice(0, 7) };
    persistDailyWins(nextMap);
    setDailyWinsInput("");
  };

  const handleRemoveDailyWin = (index: number) => {
    const nextWins = dailyWins.filter((_, itemIndex) => itemIndex !== index);
    const nextMap = { ...dailyWinsMap, [today]: nextWins };
    persistDailyWins(nextMap);
  };

  const isSectionCollapsed = (section: PlannerSectionKey) => Boolean(collapsedSections[section]);

  const toggleSection = (section: PlannerSectionKey) => {
    setCollapsedSections((previous) => {
      const next = { ...previous, [section]: !previous[section] };
      localStorage.setItem(PLANNER_COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const renderSectionToggle = (section: PlannerSectionKey) => (
    <IconButton
      size="small"
      onClick={() => toggleSection(section)}
      aria-label={isSectionCollapsed(section) ? t("Expand section") : t("Collapse section")}
      title={isSectionCollapsed(section) ? t("Expand section") : t("Collapse section")}
      sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
    >
      {isSectionCollapsed(section) ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
    </IconButton>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: { xs: 1, md: 1.25 }, pb: 3 }}>
      {/* ── Header ── */}
      <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.25 }}>
          {t("Planner")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("Daily command center for journal, tasks, goals, and habits.")}
        </Typography>
      </Box>

      <Box sx={{ ...plannerCardSx, p: { xs: 2, sm: 2.25 }, mb: { xs: 1.75, md: 2.25 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("Today Dashboard")}
          </Typography>
          <Chip
            size="small"
            color={hasTodayEntry ? "success" : "warning"}
            variant="outlined"
            label={hasTodayEntry ? t("Journal Today") : t("Missing")}
          />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(4, minmax(0, 1fr))",
              lg: "repeat(8, minmax(0, 1fr))",
            },
            gap: 0.75,
          }}
        >
          {[...todayDashboardCards, ...usageStatsCards].map((card) => (
            <Box
              key={card.label}
              sx={{
                p: { xs: 0.9, sm: 1 },
                minHeight: { xs: 64, sm: 72 },
                borderRadius: 1.75,
                border: "1px solid",
                borderColor: isDark
                  ? alpha(muiTheme.palette[card.tone].main, 0.2)
                  : alpha(muiTheme.palette[card.tone].main, 0.15),
                bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.40)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.66rem", lineHeight: 1.15 }}>
                {card.label}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {card.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            mt: 1.25,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
            gap: 1,
          }}
        >
          <Box
            sx={{
              p: 1,
              minHeight: 90,
              borderRadius: 1.75,
              border: "1px solid",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.35)",
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.30)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.6, display: "block" }}>
              {t("Priority Stack")}
            </Typography>
            <Stack spacing={0.5}>
              {priorityTasks.slice(0, 2).map((task) => (
                <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
                    {task.title}
                  </Typography>
                  <Chip size="small" variant="outlined" label={task.status === "in_progress" ? "IP" : "TD"} sx={{ height: 20, fontSize: "0.6rem" }} />
                </Stack>
              ))}
              {priorityTasks.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  {t("No open tasks to focus on right now.")}
                </Typography>
              )}
              {priorityTasks.length > 2 ? (
                <Typography variant="caption" color="text.secondary">
                  +{priorityTasks.length - 2}
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Box
            sx={{
              p: 1,
              minHeight: 90,
              borderRadius: 1.75,
              border: "1px solid",
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.35)",
              bgcolor: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.30)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 0.6, display: "block" }}>
              {t("Next Meeting")}
            </Typography>
            {todayMeetings[0] ? (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {todayMeetings[0].title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(todayMeetings[0].start, "HH:mm")} – {format(todayMeetings[0].end, "HH:mm")}
                  {todayMeetings[0].meeting.participants.length > 0 && ` · ${todayMeetings[0].meeting.participants.slice(0, 2).join(", ")}`}
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {t("No meetings scheduled for today.")}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Quick Capture (compact, inline) ── */}
      <Box
        sx={{
          mb: { xs: 1.75, md: 2.25 },
          p: { xs: 1.5, md: 2 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: alpha(muiTheme.palette.primary.main, 0.12),
          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.35)",
          backdropFilter: "blur(16px) saturate(1.3)",
          WebkitBackdropFilter: "blur(16px) saturate(1.3)",
          overflow: "hidden",
          contain: "layout paint",
          position: "relative" as const,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t("Quick Capture")}
        </Typography>
        <Box
          sx={{
            mt: 0.5,
            display: "grid",
            gap: 1.25,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "minmax(0, 2fr) minmax(180px, 1fr) minmax(140px, 0.8fr) auto",
            },
            alignItems: "center",
          }}
        >
          <TextField
            fullWidth
            size="small"
            value={quickTaskTitle}
            onChange={(event) => setQuickTaskTitle(event.target.value)}
            placeholder={t("Quick task title")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleQuickAddTask();
              }
            }}
            sx={{
              minWidth: 0,
              gridColumn: { xs: "1", sm: "1 / -1", lg: "auto" },
            }}
          />
          <TextField
            select
            size="small"
            value={quickProjectId === "" ? "" : String(quickProjectId)}
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuickProjectId(nextValue === "" ? "" : Number(nextValue));
            }}
            SelectProps={{ native: true }}
            sx={{ minWidth: { xs: "100%", md: 170 }, flex: { md: 0.8 } }}
          >
            <option value="">{t("No project")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t("Due")}
            value={quickDueMode}
            onChange={(event) => setQuickDueMode(event.target.value as "today" | "tomorrow" | "none")}
            SelectProps={{ native: true }}
            sx={{ minWidth: { xs: "100%", md: 130 }, flex: { md: 0.6 } }}
          >
            <option value="today">{t("Today")}</option>
            <option value="tomorrow">{t("Tomorrow")}</option>
            <option value="none">{t("No date")}</option>
          </TextField>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddTaskIcon />}
            disabled={busy || quickTaskTitle.trim().length === 0}
            onClick={handleQuickAddTask}
            sx={{
              minWidth: { xs: "100%", lg: 120 },
              width: { xs: "100%", lg: "auto" },
              whiteSpace: "nowrap",
              justifySelf: { lg: "end" },
              contain: "layout",
            }}
          >
            {t("Add Task")}
          </Button>
        </Box>
        {quickTaskFeedback ? (
          <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 1 }}>
            {quickTaskFeedback}
          </Typography>
        ) : null}
      </Box>

      {/* ── Project Hub (only if projects exist) ── */}
      {projectHubItems.length > 0 && (
        <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Project Hub")}
            </Typography>
            <Button size="small" onClick={onOpenProjects} sx={{ textTransform: "none" }}>
              {t("View All")} ({projects.length})
            </Button>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            {projectHubItems.map((project) => (
              <Box
                key={project.id}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: alpha(project.color || muiTheme.palette.divider, 0.4),
                  borderLeft: `3px solid ${project.color || muiTheme.palette.primary.main}`,
                  bgcolor: alpha(muiTheme.palette.background.paper, 0.6),
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  {project.name}
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <Typography variant="caption" color="text.secondary">
                    {t("Open Tasks")}: {project.openTasks}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("Done")}: {project.doneTasks}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("Goals")}: {project.projectGoals}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Meetings Planner ── */}
      <Box sx={{ ...plannerCardSx, mb: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("Meetings")}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              size="small"
              variant="outlined"
              icon={<CalendarMonthIcon sx={{ fontSize: 14 }} />}
              label={`${meetingDayBuckets.reduce((sum, item) => sum + item.count, 0)} ${t("this week")}`}
            />
            {renderSectionToggle("meetings")}
          </Stack>
        </Stack>

        <Collapse in={!isSectionCollapsed("meetings")} timeout="auto" unmountOnExit>
          <Box
            sx={{
              mt: 2,
              display: "grid",
              gap: 2.5,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", xl: "1.05fr 1.2fr" },
                gap: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(muiTheme.palette.background.paper, 0.45),
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {editingMeetingId === null ? t("Schedule meeting") : t("Edit meeting")}
                  </Typography>
                  {editingMeetingId !== null ? (
                    <Button size="small" color="inherit" onClick={resetMeetingForm}>
                      {t("Cancel")}
                    </Button>
                  ) : null}
                </Stack>
                <Stack spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={t("Meeting title")}
                    value={meetingTitle}
                    onChange={(event) => setMeetingTitle(event.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    placeholder={t("Agenda")}
                    value={meetingAgenda}
                    onChange={(event) => setMeetingAgenda(event.target.value)}
                  />
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      label={t("Start")}
                      value={meetingStartAt}
                      onChange={(event) => setMeetingStartAt(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      type="datetime-local"
                      label={t("End")}
                      value={meetingEndAt}
                      onChange={(event) => setMeetingEndAt(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                    <TextField
                      select
                      size="small"
                      label={t("Repeat")}
                      value={meetingRecurrence}
                      onChange={(event) => setMeetingRecurrence(event.target.value as MeetingRecurrence)}
                      SelectProps={{ native: true }}
                      fullWidth
                    >
                      <option value="none">{t("Does not repeat")}</option>
                      <option value="daily">{t("Daily")}</option>
                      <option value="weekdays">{t("Weekdays")}</option>
                      <option value="weekly">{t("Weekly")}</option>
                    </TextField>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label={t("Repeat until")}
                      value={meetingRecurrenceUntil}
                      onChange={(event) => setMeetingRecurrenceUntil(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={meetingRecurrence === "none"}
                    />
                  </Stack>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                    <TextField
                      fullWidth
                      size="small"
                      label={t("Reminder (minutes)")}
                      type="number"
                      value={meetingReminderMinutes}
                      onChange={(event) => setMeetingReminderMinutes(Number(event.target.value) || 0)}
                      inputProps={{ min: 0, max: 240, step: 5 }}
                    />
                    <TextField
                      select
                      size="small"
                      label={t("Status")}
                      value={meetingStatus}
                      onChange={(event) => setMeetingStatus(event.target.value as MeetingStatus)}
                      SelectProps={{ native: true }}
                      fullWidth
                    >
                      <option value="planned">{t("Planned")}</option>
                      <option value="live">{t("Live")}</option>
                      <option value="done">{t("Done")}</option>
                      <option value="missed">{t("Missed")}</option>
                      <option value="cancelled">{t("Cancelled")}</option>
                    </TextField>
                  </Stack>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={t("Google Meet URL")}
                    value={meetingMeetUrl}
                    onChange={(event) => setMeetingMeetUrl(event.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={t("Calendar event URL (optional)")}
                    value={meetingCalendarUrl}
                    onChange={(event) => setMeetingCalendarUrl(event.target.value)}
                  />
                  <TextField
                    select
                    size="small"
                    value={meetingProjectId === "" ? "" : String(meetingProjectId)}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setMeetingProjectId(nextValue === "" ? "" : Number(nextValue));
                    }}
                    SelectProps={{ native: true }}
                    fullWidth
                  >
                    <option value="">{t("No project")}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </TextField>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    label={t("Participants")}
                    placeholder={t("One participant per line")}
                    value={meetingParticipants}
                    onChange={(event) => setMeetingParticipants(event.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    label={t("Notes")}
                    value={meetingNotes}
                    onChange={(event) => setMeetingNotes(event.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    label={t("Decisions")}
                    value={meetingDecisions}
                    onChange={(event) => setMeetingDecisions(event.target.value)}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    label={t("Action items")}
                    placeholder={t("One action item per line")}
                    value={meetingActionItems}
                    onChange={(event) => setMeetingActionItems(event.target.value)}
                  />

                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<VideoCallIcon />}
                      disabled={busy || meetingTitle.trim().length === 0}
                      onClick={handleCreateMeeting}
                    >
                      {editingMeetingId === null ? t("Add meeting") : t("Save meeting")}
                    </Button>
                    {editingMeetingId !== null ? (
                      <Button variant="outlined" size="small" onClick={resetMeetingForm}>
                        {t("Clear")}
                      </Button>
                    ) : null}
                  </Stack>
                  {meetingFeedback ? (
                    <Typography variant="caption" color="text.secondary">
                      {meetingFeedback}
                    </Typography>
                  ) : null}
                </Stack>
              </Box>

              <Box>
                <Stack direction="row" spacing={0.8} sx={{ mb: 1.5, flexWrap: "wrap" }}>
                  {meetingDayBuckets.map((bucket) => (
                    <Chip
                      key={bucket.day}
                      size="small"
                      variant={bucket.day === today ? "filled" : "outlined"}
                      color={bucket.day === today ? "primary" : "default"}
                      label={`${format(parseISO(bucket.day), "EEE d")} · ${bucket.count}`}
                    />
                  ))}
                </Stack>

                <Stack spacing={1}>
                  {upcomingMeetings.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t("No meetings yet.")}
                    </Typography>
                  ) : (
                    upcomingMeetings.map((occurrence) => {
                      const meeting = occurrence.meeting;
                      const meetingProject = projects.find((project) => project.id === meeting.project_id) ?? null;
                      const calendarUrl =
                        meeting.calendar_event_url ??
                        buildGoogleCalendarLink({
                          title: meeting.title,
                          details: [meeting.agenda, meeting.notes, meeting.decisions].filter(Boolean).join("\n\n"),
                          startAt: occurrence.start.toISOString(),
                          endAt: occurrence.end.toISOString(),
                          location: meeting.meet_url ?? undefined,
                        });

                      return (
                        <Box
                          key={occurrence.occurrence_id}
                          sx={{
                            borderRadius: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            p: 1.25,
                            bgcolor: alpha(muiTheme.palette.background.paper, 0.45),
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                {meeting.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {format(occurrence.start, "MMM d, HH:mm")} - {format(occurrence.end, "HH:mm")}
                              </Typography>
                              {meetingProject ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  {t("Project")}: {meetingProject.name}
                                </Typography>
                              ) : null}
                              {meeting.agenda ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35 }}>
                                  {meeting.agenda}
                                </Typography>
                              ) : null}
                            </Box>
                            <Stack alignItems="flex-end" spacing={0.5}>
                              <Chip
                                size="small"
                                label={
                                  occurrence.status === "done"
                                    ? t("Done")
                                    : occurrence.status === "live"
                                      ? t("Live")
                                      : occurrence.status === "missed"
                                        ? t("Missed")
                                        : occurrence.status === "cancelled"
                                          ? t("Cancelled")
                                          : t("Planned")
                                }
                                color={
                                  occurrence.status === "done"
                                    ? "success"
                                    : occurrence.status === "live"
                                      ? "warning"
                                      : occurrence.status === "missed"
                                        ? "error"
                                        : occurrence.status === "cancelled"
                                          ? "default"
                                          : "primary"
                                }
                                variant={occurrence.status === "planned" ? "filled" : "outlined"}
                              />
                              {meeting.recurrence !== "none" ? (
                                <Chip size="small" variant="outlined" label={t(meeting.recurrence === "weekdays" ? "Weekdays" : meeting.recurrence === "weekly" ? "Weekly" : "Daily")} />
                              ) : null}
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap" }}>
                            {meeting.participants.slice(0, 3).map((participant) => (
                              <Chip key={participant} size="small" variant="outlined" label={participant} />
                            ))}
                            {meeting.action_items.length > 0 ? (
                              <Chip size="small" variant="outlined" label={`${t("Action items")}: ${meeting.action_items.length}`} />
                            ) : null}
                            {meeting.reminder_minutes > 0 ? (
                              <Chip size="small" variant="outlined" label={`${t("Reminder")}: ${meeting.reminder_minutes}m`} />
                            ) : null}
                          </Stack>

                          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap" }}>
                            {meeting.meet_url ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VideoCallIcon />}
                                onClick={() => openExternalUrl(meeting.meet_url!, t("Unable to open meeting URL."))}
                              >
                                {t("Open Meet")}
                              </Button>
                            ) : null}
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CalendarMonthIcon />}
                              onClick={() => openExternalUrl(calendarUrl, t("Unable to open calendar URL."))}
                            >
                              {t("Open Calendar")}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                materializeMeetingActionItems.mutate({
                                  meeting_id: meeting.id,
                                  due_date: format(occurrence.start, "yyyy-MM-dd"),
                                })
                              }
                              disabled={busy || meeting.action_items.every((item) => item.task_id !== null)}
                            >
                              {t("Create tasks")}
                            </Button>
                            <Button size="small" onClick={() => loadMeetingIntoForm(meeting)} startIcon={<EditOutlinedIcon />}>
                              {t("Edit")}
                            </Button>
                            {occurrence.status !== "live" && occurrence.status !== "done" ? (
                              <Button size="small" onClick={() => setMeetingWorkflowStatus(meeting, "live")} disabled={busy}>
                                {t("Go live")}
                              </Button>
                            ) : null}
                            {occurrence.status !== "done" ? (
                              <Button size="small" onClick={() => setMeetingWorkflowStatus(meeting, "done")} disabled={busy}>
                                {t("Mark done")}
                              </Button>
                            ) : (
                              <Button size="small" onClick={() => setMeetingWorkflowStatus(meeting, "planned")} disabled={busy}>
                                {t("Reopen")}
                              </Button>
                            )}
                            {meeting.status !== "cancelled" ? (
                              <Button size="small" color="warning" onClick={() => cancelMeeting(meeting.id)} disabled={busy}>
                                {t("Cancel")}
                              </Button>
                            ) : null}
                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteOutlineIcon />}
                              onClick={() => deleteMeeting.mutate(meeting.id)}
                              disabled={busy}
                            >
                              {t("Delete")}
                            </Button>
                          </Stack>
                        </Box>
                      );
                    })
                  )}
                </Stack>
              </Box>
            </Box>

            <Box
              sx={{
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
              }}
            >
              <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t("Weekly calendar")}
                </Typography>
              </Box>
              <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "72px repeat(7, minmax(120px, 1fr))",
                    minWidth: 912,
                    minHeight: 540,
                  }}
                >
                  <Box sx={{ borderRight: "1px solid", borderColor: "divider", bgcolor: alpha(muiTheme.palette.text.primary, 0.02) }}>
                    {Array.from({ length: 14 }, (_, index) => 8 + index).map((hour) => (
                      <Box key={hour} sx={{ height: 38, px: 1, pt: 0.4, borderBottom: "1px solid", borderColor: "divider" }}>
                        <Typography variant="caption" color="text.secondary">
                          {String(hour).padStart(2, "0")}:00
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  {Array.from({ length: 7 }, (_, index) => addDays(startOfDay(new Date()), index)).map((day) => {
                    const dayOccurrences = weeklyMeetingOccurrences.filter(
                      (occurrence) => format(occurrence.start, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                    );
                    return (
                      <Box key={day.toISOString()} sx={{ position: "relative", borderRight: "1px solid", borderColor: "divider" }}>
                        <Box sx={{ height: 34, px: 1, py: 0.6, borderBottom: "1px solid", borderColor: "divider", bgcolor: format(day, "yyyy-MM-dd") === today ? alpha(muiTheme.palette.primary.main, 0.08) : "transparent" }}>
                          <Typography variant="caption" color="text.secondary">
                            {format(day, "EEE d")}
                          </Typography>
                        </Box>
                        <Box sx={{ position: "relative", height: 506 }}>
                          {Array.from({ length: 14 }, (_, index) => (
                            <Box
                              key={`${day.toISOString()}-${index}`}
                              sx={{
                                height: 36,
                                borderBottom: "1px solid",
                                borderColor: alpha(muiTheme.palette.divider, 0.75),
                              }}
                            />
                          ))}
                          {dayOccurrences.map((occurrence) => {
                            const top = Math.max(0, ((occurrence.start.getHours() + occurrence.start.getMinutes() / 60) - 8) * 36);
                            const height = Math.max(28, ((occurrence.end.getTime() - occurrence.start.getTime()) / (60 * 60 * 1000)) * 36);
                            return (
                              <Box
                                key={occurrence.occurrence_id}
                                sx={{
                                  position: "absolute",
                                  left: 6,
                                  right: 6,
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  borderRadius: 1.5,
                                  px: 0.8,
                                  py: 0.55,
                                  overflow: "hidden",
                                  bgcolor:
                                    occurrence.status === "done"
                                      ? alpha(muiTheme.palette.success.main, 0.18)
                                      : occurrence.status === "live"
                                        ? alpha(muiTheme.palette.warning.main, 0.2)
                                        : occurrence.status === "missed"
                                          ? alpha(muiTheme.palette.error.main, 0.16)
                                          : alpha(muiTheme.palette.primary.main, 0.16),
                                  border: "1px solid",
                                  borderColor:
                                    occurrence.status === "done"
                                      ? "success.main"
                                      : occurrence.status === "live"
                                        ? "warning.main"
                                        : occurrence.status === "missed"
                                          ? "error.main"
                                          : "primary.main",
                                }}
                              >
                                <Typography variant="caption" sx={{ display: "block", fontWeight: 700, lineHeight: 1.15 }}>
                                  {occurrence.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                                  {format(occurrence.start, "HH:mm")} - {format(occurrence.end, "HH:mm")}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* ── Dashboard Grid ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {/* Tasks Due Today */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Tasks Due Today")}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("View All")}
              </Button>
              {renderSectionToggle("tasksToday")}
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("tasksToday")} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {dueTodayTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("No tasks due today.")}
                </Typography>
              ) : (
                dueTodayTasks.map((task) => (
                  <Stack key={task.id} direction="row" alignItems="center" spacing={1}>
                    <Checkbox
                      size="small"
                      checked={task.status === "done"}
                      disabled={busy}
                      onChange={(event) =>
                        updateTaskStatus.mutate({
                          id: task.id,
                          status: event.target.checked ? "done" : "todo",
                        })
                      }
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ textDecoration: task.status === "done" ? "line-through" : "none" }}
                      >
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.priority}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Stack>
          </Collapse>
        </Box>

        {/* Overdue Tasks */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Overdue Tasks")}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" onClick={onOpenTasks} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("Resolve")}
              </Button>
              {renderSectionToggle("overdueTasks")}
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("overdueTasks")} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {overdueTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("No overdue tasks.")}
                </Typography>
              ) : (
                overdueTasks.map((task) => (
                  <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                      {task.title}
                    </Typography>
                    <Chip label={task.due_date ?? t("No date")} color="error" variant="outlined" size="small" />
                  </Stack>
                ))
              )}
            </Stack>
          </Collapse>
        </Box>

        {/* Goals Near Deadline */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Goals Near Deadline")}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" onClick={onOpenGoals} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("Manage")}
              </Button>
              {renderSectionToggle("goalsNearDeadline")}
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("goalsNearDeadline")} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {nearGoals.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("No active goals with deadlines in next 14 days.")}
                </Typography>
              ) : (
                nearGoals.map((goal) => (
                  <Stack key={goal.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {goal.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {goal.progress}%
                      </Typography>
                    </Box>
                    <Chip label={goal.target_date ?? t("No date")} variant="outlined" size="small" />
                  </Stack>
                ))
              )}
            </Stack>
          </Collapse>
        </Box>

        {/* Habits Today */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Habits Today")}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" onClick={onOpenHabits} endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} sx={{ textTransform: "none" }}>
                {t("Track")}
              </Button>
              {renderSectionToggle("habitsToday")}
            </Stack>
          </Stack>
          <Collapse in={!isSectionCollapsed("habitsToday")} timeout="auto" unmountOnExit>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {habitsWithTodayState.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("No habits configured yet.")}
                </Typography>
              ) : (
                habitsWithTodayState.map((habit) => (
                  <Stack key={habit.id} direction="row" alignItems="center" spacing={1}>
                    <Checkbox
                      size="small"
                      checked={habit.doneToday}
                      disabled={busy}
                      onChange={(event) =>
                        toggleHabitCompletion.mutate({
                          habit_id: habit.id,
                          date: today,
                          completed: event.target.checked,
                        })
                      }
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" noWrap>
                        {habit.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {habit.this_week_count}/{habit.target_per_week} weekly · {habit.current_streak}d streak
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Stack>
          </Collapse>
        </Box>
      </Box>

      {/* ── Tomorrow Plan ── */}
      <Box sx={{ ...plannerCardSx, mt: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("Tomorrow Plan")}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {dueTomorrowTasks.length} {t("Tasks")}
            </Typography>
            {renderSectionToggle("tomorrowPlan")}
          </Stack>
        </Stack>
        <Collapse in={!isSectionCollapsed("tomorrowPlan")} timeout="auto" unmountOnExit>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {dueTomorrowTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("No tasks planned for tomorrow yet.")}
              </Typography>
            ) : (
              dueTomorrowTasks.map((task) => (
                <Stack key={task.id} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {task.title}
                  </Typography>
                  <Chip size="small" variant="outlined" label={task.priority} />
                </Stack>
              ))
            )}
          </Stack>
        </Collapse>
      </Box>

      <Box sx={{ ...plannerCardSx, mt: { xs: 1.5, md: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("Weekly Review")}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={`${format(currentWeekInterval.start, "MMM d")} - ${format(currentWeekInterval.end, "MMM d")}`}
          />
        </Stack>
        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" },
            gap: 1,
          }}
        >
          {[
            { label: t("Done"), value: weeklyReview.completedTasks.length },
            { label: t("Meetings"), value: weeklyReview.meetingsThisWeek.length },
            { label: t("Journal"), value: weeklyReview.journalEntries.length },
            { label: t("Habits"), value: weeklyReview.habitCompletions },
            { label: t("Daily Wins"), value: weeklyReview.winsThisWeek },
            { label: t("Focus Session"), value: weeklyReview.focusSessionsThisWeek },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                p: 1.2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: alpha(muiTheme.palette.background.paper, 0.4),
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            mt: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Completed this week")}
            </Typography>
            <Stack spacing={0.8}>
              {weeklyReview.completedTasks.slice(0, 5).map((task) => (
                <Stack key={task.id} direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {task.title}
                  </Typography>
                  <Chip size="small" variant="outlined" label={task.priority} />
                </Stack>
              ))}
              {weeklyReview.completedTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("No completed tasks this week yet.")}
                </Typography>
              ) : null}
            </Stack>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {t("Weekly notes")}
            </Typography>
            <Stack spacing={0.8}>
              <Typography variant="body2" color="text.secondary">
                {t("Meetings with notes")}: {meetings.filter((meeting) => meeting.notes.trim().length > 0).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("Goals Near Deadline")}: {nearGoals.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("Focus sessions today")}: {focusSessionsToday}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("Wins logged today")}: {dailyWins.length}
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* ── Focus & Wins side-by-side ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: { xs: 1.5, md: 2 },
          mt: { xs: 1.5, md: 2 },
        }}
      >
        {/* Focus Session — compact widget */}
        <Box
          sx={{
            ...plannerCardSx,
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              borderColor: isDark
                ? `${muiTheme.palette.primary.main}30`
                : `${muiTheme.palette.primary.main}25`,
              boxShadow: isDark
                ? `0 8px 32px rgba(0,0,0,0.30), 0 0 0 1px ${muiTheme.palette.primary.main}15`
                : `0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px ${muiTheme.palette.primary.main}12`,
            },
          }}
          onClick={onOpenFocus}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Focus Session")}
            </Typography>
            <Chip
              size="small"
              variant="outlined"
              label={`${t("Today")}: ${focusSessionsToday}`}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {t("Open full focus view →")}
          </Typography>
        </Box>

        {/* Daily Wins */}
        <Box sx={{ ...plannerCardSx }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("Daily Wins")}
            </Typography>
            {renderSectionToggle("dailyWins")}
          </Stack>
          <Collapse in={!isSectionCollapsed("dailyWins")} timeout="auto" unmountOnExit>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                value={dailyWinsInput}
                onChange={(event) => setDailyWinsInput(event.target.value)}
                placeholder={t("Example: shipped onboarding empty-state fix")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddDailyWin();
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleAddDailyWin}
                disabled={dailyWinsInput.trim().length === 0}
                sx={{ width: { xs: "100%", sm: "auto" } }}
              >
                {t("Add win")}
              </Button>
            </Stack>
            <Stack spacing={0.75} sx={{ mt: 1.5 }}>
              {dailyWins.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("No wins logged yet today.")}
                </Typography>
              ) : (
                dailyWins.map((item, index) => (
                  <Stack key={`${item}-${index}`} direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                    <Typography variant="body2" sx={{ minWidth: 0 }}>
                      • {item}
                    </Typography>
                    <Button size="small" color="error" onClick={() => handleRemoveDailyWin(index)}>
                      {t("Delete")}
                    </Button>
                  </Stack>
                ))
              )}
            </Stack>
          </Collapse>
        </Box>
      </Box>
    </Box>
  );
};
