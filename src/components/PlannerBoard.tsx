import { useEffect, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { addDays, format } from "date-fns";
import { PlannerDashboardSection } from "./planner/PlannerDashboardSection";
import { PlannerMeetingsSection } from "./planner/PlannerMeetingsSection";
import { PlannerWeeklyReviewSection } from "./planner/PlannerWeeklyReviewSection";
import { useEntries } from "../hooks/useEntries";
import { useGoals } from "../hooks/useGoals";
import { useHabits, useToggleHabitCompletion } from "../hooks/useHabits";
import { useProjects } from "../hooks/useProjects";
import { useCreateTask, useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import {
  useDeleteMeeting,
  useMaterializeMeetingActionItems,
  useMeetings,
} from "../hooks/useMeetings";
import { usePlannerMeetingForm } from "../hooks/usePlannerMeetingForm";
import { usePlannerPreferences } from "../hooks/usePlannerPreferences";
import {
  FOCUS_SESSIONS_UPDATED_EVENT,
  readFocusSessionsMap,
} from "../utils/focusSessionStorage";
import {
  getCurrentWeekInterval,
  getDueTodayTasks,
  getHabitsWithTodayState,
  getJournalStreak,
  getMeetingDayBuckets,
  getNearGoals,
  getOverdueTasks,
  getPriorityTasks,
  getTodayMeetings,
  getUpcomingMeetings,
  getWeeklyMeetingOccurrences,
  getWeeklyReview,
} from "../utils/plannerSelectors";
import { isSafeExternalUrl } from "../utils/urlUtils";
import { useI18n } from "../i18n/I18nContext";
import { useAppNotifications } from "../notifications/AppNotifications";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Meeting, MeetingStatus } from "../types";

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
  onOpenProjects: _onOpenProjects,
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
  const [quickTaskFeedbackTone, setQuickTaskFeedbackTone] = useState<"success" | "error">("success");
  const [focusSessionsMap, setFocusSessionsMap] = useState<Record<string, number>>(() =>
    readFocusSessionsMap()
  );
  const [dailyWinsInput, setDailyWinsInput] = useState("");
  const { dailyWins, dailyWinsMap, addDailyWin, removeDailyWin, isSectionCollapsed, toggleSection } =
    usePlannerPreferences(today);
  const {
    createMeeting,
    editingMeetingId,
    loadMeetingIntoForm,
    meetingAgenda,
    meetingActionItems,
    meetingCalendarUrl,
    meetingDecisions,
    meetingEndAt,
    meetingFeedback,
    meetingMeetUrl,
    meetingNotes,
    meetingParticipants,
    meetingProjectId,
    meetingRecurrence,
    meetingRecurrenceUntil,
    meetingReminderMinutes,
    meetingStartAt,
    meetingStatus,
    meetingTitle,
    resetMeetingForm,
    setMeetingAgenda,
    setMeetingActionItems,
    setMeetingCalendarUrl,
    setMeetingDecisions,
    setMeetingEndAt,
    setMeetingMeetUrl,
    setMeetingNotes,
    setMeetingParticipants,
    setMeetingProjectId,
    setMeetingRecurrence,
    setMeetingRecurrenceUntil,
    setMeetingReminderMinutes,
    setMeetingStartAt,
    setMeetingStatus,
    setMeetingTitle,
    submitMeeting,
    updateMeeting,
  } = usePlannerMeetingForm({ meetings, t });

  useEffect(() => {
    const syncFocusSessions = () => {
      setFocusSessionsMap(readFocusSessionsMap());
    };

    window.addEventListener(FOCUS_SESSIONS_UPDATED_EVENT, syncFocusSessions);
    window.addEventListener("storage", syncFocusSessions);
    return () => {
      window.removeEventListener(FOCUS_SESSIONS_UPDATED_EVENT, syncFocusSessions);
      window.removeEventListener("storage", syncFocusSessions);
    };
  }, []);
  const overdueTasks = useMemo(() => getOverdueTasks(tasks), [tasks]);
  const dueTodayTasks = useMemo(() => getDueTodayTasks(tasks), [tasks]);
  const nearGoals = useMemo(() => getNearGoals(goals), [goals]);
  const habitsWithTodayState = useMemo(() => getHabitsWithTodayState(habits, today), [habits, today]);
  const upcomingMeetings = useMemo(() => getUpcomingMeetings(meetings), [meetings, today]);
  const todayMeetings = useMemo(() => getTodayMeetings(upcomingMeetings, today), [today, upcomingMeetings]);
  const weeklyMeetingOccurrences = useMemo(() => getWeeklyMeetingOccurrences(meetings), [meetings, today]);
  const meetingDayBuckets = useMemo(
    () => getMeetingDayBuckets(weeklyMeetingOccurrences),
    [weeklyMeetingOccurrences]
  );
  const journalStreak = useMemo(() => getJournalStreak(entries, today), [entries, today]);

  const plannerOverviewStats = useMemo(
    () => [
      { label: t("Due today"), value: dueTodayTasks.length, tone: "info" as const },
      { label: t("Overdue"), value: overdueTasks.length, tone: "error" as const },
      { label: t("Meetings"), value: todayMeetings.length, tone: "primary" as const },
      { label: t("Journal streak"), value: `${journalStreak}d`, tone: "success" as const },
    ],
    [dueTodayTasks.length, overdueTasks.length, journalStreak, todayMeetings.length, t]
  );

  const priorityTasks = useMemo(() => getPriorityTasks(tasks), [tasks]);
  const currentWeekInterval = useMemo(() => getCurrentWeekInterval(today), [today]);
  const weeklyReview = useMemo(
    () =>
      getWeeklyReview({
        currentWeekInterval,
        dailyWinsMap,
        entries,
        focusSessionsMap,
        habits,
        tasks,
        weeklyMeetingOccurrences,
      }),
    [currentWeekInterval, dailyWinsMap, entries, focusSessionsMap, habits, tasks, weeklyMeetingOccurrences]
  );

  const busy =
    toggleHabitCompletion.isPending ||
    updateTaskStatus.isPending ||
    createTask.isPending ||
    createMeeting.isPending ||
    updateMeeting.isPending ||
    deleteMeeting.isPending ||
    materializeMeetingActionItems.isPending;

  const focusSessionsToday = focusSessionsMap[today] ?? 0;
  const isDark = muiTheme.palette.mode === "dark";
  const plannerCardSx = {
    p: { xs: 1.5, sm: 2 },
    mb: 1.5,
    borderRadius: 2,
    bgcolor: "background.paper",
    border: "1px solid",
    borderColor: "divider",
    boxShadow: isDark ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.04)",
  };
  const plannerSurfaceSx = {
    ...plannerCardSx,
    borderRadius: 2.5,
  };
  const plannerInsetCardSx = {
    p: 1.2,
    minHeight: 80,
    borderRadius: 1.5,
    border: "1px solid",
    borderColor: "divider",
    bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
  };

  const handleQuickAddTask = () => {
    const title = quickTaskTitle.trim();
    if (!title) {
      setQuickTaskFeedback(t("Task title is required."));
      setQuickTaskFeedbackTone("error");
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
          setQuickTaskFeedbackTone("success");
        },
        onError: (error) => {
          const details =
            error instanceof Error ? error.message : typeof error === "string" ? error : "";
          setQuickTaskFeedback(
            details
              ? t("Failed to add task: {message}", { message: details })
              : t("Failed to add task. Please try again.")
          );
          setQuickTaskFeedbackTone("error");
        },
      }
    );
  };

  const openExternalUrl = (url: string, fallbackMessage: string) => {
    if (!isSafeExternalUrl(url)) {
      notify(fallbackMessage, "error");
      return;
    }
    openUrl(url).catch(() => {
      notify(fallbackMessage, "error");
    });
  };

  const deleteMeetingWithFeedback = (meetingId: number) => {
    deleteMeeting.mutate(meetingId, {
      onSuccess: () => notify(t("Meeting deleted."), "info"),
      onError: () => notify(t("Failed to delete meeting. Please try again."), "error"),
    });
  };

  const setMeetingWorkflowStatus = (meeting: Meeting, status: MeetingStatus) => {
    updateMeeting.mutate(
      {
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
      },
      {
        onSuccess: () => {
          if (status === "cancelled") {
            notify(t("Meeting cancelled."), "info");
          }
        },
        onError: () => notify(t("Failed to update meeting. Please try again."), "error"),
      }
    );
  };

  const handleAddDailyWin = () => {
    const value = dailyWinsInput.trim();
    if (!value) {
      return;
    }
    addDailyWin(value);
    setDailyWinsInput("");
  };

  const handleRemoveDailyWin = (index: number) => {
    removeDailyWin(index);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", mt: { xs: 1, md: 1.25 }, pb: 3 }}>
      <PlannerDashboardSection
        busy={busy}
        focusSessionsToday={focusSessionsToday}
        habitsWithTodayState={habitsWithTodayState}
        isDark={isDark}
        onHabitToggle={(habitId, completed) =>
          toggleHabitCompletion.mutate({ habit_id: habitId, date: today, completed })
        }
        onOpenFocus={onOpenFocus}
        onOpenHabits={onOpenHabits}
        onOpenTasks={onOpenTasks}
        onQuickTaskProjectChange={(value) => setQuickProjectId(value === "" ? "" : Number(value))}
        onQuickTaskTitleChange={setQuickTaskTitle}
        onQuickTaskDueModeChange={setQuickDueMode}
        onSubmitQuickTask={handleQuickAddTask}
        plannerInsetCardSx={plannerInsetCardSx}
        plannerOverviewStats={plannerOverviewStats}
        plannerSurfaceSx={plannerSurfaceSx}
        priorityTasks={priorityTasks}
        projects={projects}
        quickDueMode={quickDueMode}
        quickProjectId={quickProjectId}
        quickTaskFeedback={quickTaskFeedback}
        quickTaskFeedbackTone={quickTaskFeedbackTone}
        quickTaskTitle={quickTaskTitle}
        t={t}
        todayMeetings={todayMeetings}
        updateTaskStatus={(task, checked) =>
          updateTaskStatus.mutate({
            id: task.id,
            status: checked ? "done" : task.status === "done" ? "todo" : task.status,
          })
        }
      />
      <PlannerMeetingsSection
        busy={busy}
        buildGoogleCalendarLink={buildGoogleCalendarLink}
        deleteMeeting={deleteMeetingWithFeedback}
        editingMeetingId={editingMeetingId}
        isSectionCollapsed={(section) => isSectionCollapsed(section)}
        loadMeetingIntoForm={loadMeetingIntoForm}
        materializeMeetingActionItems={(meetingId, dueDate) =>
          materializeMeetingActionItems.mutate({ meeting_id: meetingId, due_date: dueDate })
        }
        meetingActionItems={meetingActionItems}
        meetingAgenda={meetingAgenda}
        meetingCalendarUrl={meetingCalendarUrl}
        meetingDayBuckets={meetingDayBuckets}
        meetingDecisions={meetingDecisions}
        meetingEndAt={meetingEndAt}
        meetingFeedback={meetingFeedback}
        meetingMeetUrl={meetingMeetUrl}
        meetingNotes={meetingNotes}
        meetingParticipants={meetingParticipants}
        meetingProjectId={meetingProjectId}
        meetingRecurrence={meetingRecurrence}
        meetingRecurrenceUntil={meetingRecurrenceUntil}
        meetingReminderMinutes={meetingReminderMinutes}
        meetingStartAt={meetingStartAt}
        meetingStatus={meetingStatus}
        meetingTitle={meetingTitle}
        onOpenExternalUrl={openExternalUrl}
        plannerSurfaceSx={plannerSurfaceSx}
        projects={projects}
        resetMeetingForm={resetMeetingForm}
        setMeetingActionItems={setMeetingActionItems}
        setMeetingAgenda={setMeetingAgenda}
        setMeetingCalendarUrl={setMeetingCalendarUrl}
        setMeetingDecisions={setMeetingDecisions}
        setMeetingEndAt={setMeetingEndAt}
        setMeetingMeetUrl={setMeetingMeetUrl}
        setMeetingNotes={setMeetingNotes}
        setMeetingParticipants={setMeetingParticipants}
        setMeetingProjectId={setMeetingProjectId}
        setMeetingRecurrence={setMeetingRecurrence}
        setMeetingRecurrenceUntil={setMeetingRecurrenceUntil}
        setMeetingReminderMinutes={setMeetingReminderMinutes}
        setMeetingStartAt={setMeetingStartAt}
        setMeetingStatus={setMeetingStatus}
        setMeetingTitle={setMeetingTitle}
        setWorkflowStatus={setMeetingWorkflowStatus}
        submitMeeting={submitMeeting}
        t={t}
        today={today}
        toggleSection={(section) => toggleSection(section)}
        upcomingMeetings={upcomingMeetings}
      />
      <PlannerWeeklyReviewSection
        currentWeekInterval={currentWeekInterval}
        dailyWins={dailyWins}
        dailyWinsInput={dailyWinsInput}
        handleAddDailyWin={handleAddDailyWin}
        handleRemoveDailyWin={handleRemoveDailyWin}
        isSectionCollapsed={(section) => isSectionCollapsed(section)}
        nearGoals={nearGoals}
        onDailyWinsInputChange={setDailyWinsInput}
        onOpenFocus={onOpenFocus}
        onOpenGoals={onOpenGoals}
        onOpenTasks={onOpenTasks}
        plannerInsetCardSx={plannerInsetCardSx}
        plannerSurfaceSx={plannerSurfaceSx}
        t={t}
        weeklyReview={weeklyReview}
      />
    </Box>
  );
};
